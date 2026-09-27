#!/usr/bin/env bash
#
# Despliega el stack DNS completo en Kubernetes.
#
#   ./scripts/deploy-kubernetes.sh              instala o actualiza el stack
#   ./scripts/deploy-kubernetes.sh --uninstall  lo elimina
#
# Requisitos: docker, kubectl y helm instalados, un cluster accesible, y el archivo dns-api/.env
# con las credenciales de Supabase (copiar dns-api/.env.example y completarlo).

set -euo pipefail

RELEASE="dns-stack"
CHART="./helm/dns-stack"
SECRET="dns-stack-supabase"
ENV_FILE="dns-api/.env"

# Cada imagen con la carpeta desde la que se construye.
IMAGENES=(
  "dns-api:./dns-api"
  "dns-interceptor:./dns-interceptor"
  "dns-ui:./dns-ui"
  "health-checker:./health_checker"
)

rojo()  { printf "\033[31m%s\033[0m\n" "$1"; }
verde() { printf "\033[32m%s\033[0m\n" "$1"; }
paso()  { printf "\n\033[1m==> %s\033[0m\n" "$1"; }

# El script se puede ejecutar desde cualquier lado: siempre trabaja sobre la raiz del repositorio.
cd "$(dirname "$0")/.."

# ---------------------------------------------------------------------------
paso "Revisando requisitos"
# ---------------------------------------------------------------------------
for cmd in docker kubectl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    rojo "Falta $cmd. Instalalo antes de continuar."
    exit 1
  fi
done

# helm a veces queda instalado sin agregarse al PATH, sobre todo en Windows. Si no aparece, se
# busca en las rutas donde suelen dejarlo los instaladores.
HELM="$(command -v helm || true)"
if [[ -z "$HELM" ]]; then
  for candidato in \
    "$LOCALAPPDATA/Microsoft/WinGet/Packages"/Helm.Helm*/windows-amd64/helm.exe \
    "/c/Program Files/helm/helm.exe" \
    "/c/ProgramData/chocolatey/bin/helm.exe" \
    "/usr/local/bin/helm"; do
    if [[ -x "$candidato" ]]; then
      HELM="$candidato"
      break
    fi
  done
fi
if [[ -z "$HELM" ]]; then
  rojo "Falta helm. Instalalo con 'winget install Helm.Helm' o desde https://helm.sh/docs/intro/install/"
  exit 1
fi

if [[ "${1:-}" == "--uninstall" ]]; then
  paso "Eliminando el stack"
  "$HELM" uninstall "$RELEASE" || true
  kubectl delete secret "$SECRET" --ignore-not-found

  # Si el balanceador de la interfaz nunca llego a crearse, su servicio queda bloqueado por un
  # finalizer y no se borra solo. Se le quita para que el cluster no quede con basura.
  if kubectl get svc dns-ui >/dev/null 2>&1; then
    echo "  Liberando el servicio dns-ui, que quedo pendiente de borrado"
    kubectl patch svc dns-ui -p '{"metadata":{"finalizers":null}}' >/dev/null 2>&1 || true
  fi
  verde "Listo."
  exit 0
fi

if ! kubectl cluster-info >/dev/null 2>&1; then
  rojo "No hay un cluster de Kubernetes accesible."
  rojo "En Docker Desktop: Settings > Kubernetes > Enable Kubernetes."
  exit 1
fi

# Las dos rutas publican los puertos 80 y 53 de la maquina, asi que solo puede haber una arriba.
# Sin este aviso, el sintoma seria un error confuso al crear el balanceador de la interfaz.
if [[ -n "$(docker compose ps -q 2>/dev/null)" ]]; then
  rojo "El stack de Docker Compose esta corriendo y ocupa los puertos 80 y 53."
  rojo "Bajalo con 'docker compose down' y volve a ejecutar este script."
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  rojo "No existe $ENV_FILE."
  rojo "Copia dns-api/.env.example como dns-api/.env y completa las credenciales de Supabase."
  exit 1
fi

if ! grep -qE '^SUPABASE_URL=.+' "$ENV_FILE"; then
  rojo "$ENV_FILE no tiene un valor para SUPABASE_URL."
  exit 1
fi

echo "Cluster: $(kubectl config current-context)"

# ---------------------------------------------------------------------------
paso "Construyendo las imagenes"
# ---------------------------------------------------------------------------
for entrada in "${IMAGENES[@]}"; do
  nombre="${entrada%%:*}"
  ruta="${entrada#*:}"
  echo "  $nombre ..."
  docker build -q -t "$nombre:latest" "$ruta" >/dev/null
done
verde "Cuatro imagenes construidas."

# ---------------------------------------------------------------------------
paso "Cargando las imagenes al cluster"
# ---------------------------------------------------------------------------
# El cluster tiene su propio almacen de imagenes y no ve las del Docker local. Si su nodo es un
# contenedor accesible, se le importan una por una; si no, se asume que comparte el mismo Docker.
NODO="$(kubectl get nodes -o jsonpath='{.items[0].metadata.name}')"

if docker exec "$NODO" ctr --version >/dev/null 2>&1; then
  for entrada in "${IMAGENES[@]}"; do
    nombre="${entrada%%:*}"
    echo "  $nombre -> $NODO"
    docker save "$nombre:latest" | docker exec -i "$NODO" ctr -n k8s.io images import - >/dev/null
  done
  verde "Imagenes disponibles dentro del cluster."
else
  echo "El nodo '$NODO' no es un contenedor local; se asume que el cluster ya ve las imagenes."
  echo "Si los pods quedan en ErrImageNeverPull, hay que subirlas a un registro."
fi

# ---------------------------------------------------------------------------
paso "Creando el Secret con las credenciales"
# ---------------------------------------------------------------------------
# Se genera a partir del .env local, para que la llave no pase por la linea de comandos ni quede
# escrita en el repositorio. El apply lo deja actualizado si ya existia.
kubectl create secret generic "$SECRET" \
  --from-env-file="$ENV_FILE" \
  --dry-run=client -o yaml | kubectl apply -f -

# ---------------------------------------------------------------------------
paso "Instalando el chart"
# ---------------------------------------------------------------------------
"$HELM" upgrade --install "$RELEASE" "$CHART" \
  --set supabase.create=false \
  --set supabase.existingSecret="$SECRET" \
  --wait --timeout 5m

# ---------------------------------------------------------------------------
paso "Listo"
# ---------------------------------------------------------------------------
kubectl get pods -l app.kubernetes.io/instance="$RELEASE" 2>/dev/null || kubectl get pods

PUERTO_DNS="$(kubectl get svc dns-interceptor -o jsonpath='{.spec.ports[0].nodePort}' 2>/dev/null || echo '')"

echo
verde "El stack esta corriendo."
echo
echo "Probar el DNS Interceptor:"
if [[ -n "$PUERTO_DNS" ]]; then
  echo "  nslookup -port=$PUERTO_DNS midominio.com 127.0.0.1"
else
  echo "  kubectl get svc dns-interceptor   # para ver el puerto asignado"
fi
echo
echo "Abrir el DNS API:"
echo "  kubectl port-forward svc/dns-api 8080:8080"
echo "  curl http://localhost:8080/api/health"
echo
echo "Abrir la interfaz web:"
echo "  kubectl port-forward svc/dns-ui 8081:80"
echo
echo "Ver los logs de un Health Checker:"
echo "  kubectl logs -l instance=cr -f"
echo
echo "Eliminar todo:"
echo "  ./scripts/deploy-kubernetes.sh --uninstall"
echo
echo "El mismo sistema se puede levantar sin Kubernetes, con Docker Compose:"
echo "  docker compose up -d --build"
echo "  Son dos formas de correr lo mismo, asi que se usa una u otra:"
echo "  ambas publican los puertos 80 y 53 de la maquina."
