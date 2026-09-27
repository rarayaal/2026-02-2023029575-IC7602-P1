# Manual de usuario — P1

**Curso:** IC-7602 Redes · **Proyecto 1** · S2 2026

**Integrantes:** Isaac Rojas Robles · Rafael Araya Álvarez · Luis Diego Delgado Muñoz ·
Otto Segura Ruiz · Alexandra De Gracia

---

## 1. Qué es este proyecto

Un servidor DNS propio que, además de responder consultas de nombres, **reparte el tráfico entre
varias máquinas** según distintas estrategias: por peso, por país, por cercanía o por turnos.

Cuando un programa quiere abrir `ejemplo.com`, primero pregunta a un servidor DNS a qué dirección IP
corresponde ese nombre. Este proyecto se pone en medio de esa conversación: si el nombre está
registrado en nuestra base de datos, responde con la IP que elija la estrategia configurada; si no
lo conoce, le pregunta a un servidor DNS público y devuelve esa respuesta.

El sistema está formado por cinco piezas que corren en contenedores:

| Componente | Lenguaje | Para qué sirve |
| --- | --- | --- |
| **DNS Interceptor** | Rust | Recibe las consultas DNS y decide qué IP responder |
| **DNS API** | Java | Guarda y consulta los registros, y resuelve contra un DNS externo |
| **Health Checker** | GNU C | Revisa si cada IP está viva y cuánto tarda en responder |
| **DNS UI** | React | Pantallas para administrar todo sin tocar la base de datos |
| **Base de datos** | Supabase | Donde vive la información que comparten los demás |

---

## 2. Requisitos previos

| Programa | Para qué | Cómo verificar |
| --- | --- | --- |
| Docker Desktop | Levantar los contenedores | `docker --version` |
| Kubernetes | Solo si se usa la ruta de Helm | Se activa en Docker Desktop: *Settings → Kubernetes* |
| Helm  | Solo si se usa la ruta de Helm | `helm version` |

Para la ruta de Docker Compose no hace falta instalar nada más: Docker Desktop trae todo.

---

## 3. Instalación y ejecución

### 3.1 Configurar las credenciales

Este es el único paso manual, y es obligatorio para las dos rutas.

El sistema necesita un archivo `dns-api/.env` con las credenciales de la base de datos. Ese
archivo ya viene completo en el paquete de entrega del proyecto: basta con colocarlo en esa ruta.

Si no está, se crea a partir de la plantilla que viene en el repositorio:

```bash
cp dns-api/.env.example dns-api/.env
```

Y se completan las dos credenciales, que tienen esta forma:

```
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=la-llave-del-proyecto
```

Esa plantilla también sirve para apuntar el sistema a una base de datos propia, por ejemplo para
probarlo desde cero. Solo hay que crear un proyecto gratuito en
[supabase.com](https://supabase.com), ejecutar el archivo `database/supabase_schema.sql` en su
*SQL Editor* —que crea todas las tablas, las vistas, el trigger de salud y los datos iniciales de
IP-to-Country— y copiar la *Project URL* y la llave `service_role` de *Project Settings → API*.

> **Por qué las credenciales no están escritas en este manual:** el manual se versiona en el
> repositorio, y la llave `service_role` da acceso completo a la base de datos. Cualquier credencial
> que se escriba en un archivo versionado queda en el historial de Git de forma permanente, aunque
> después se borre. Por eso el repositorio solo contiene la plantilla `dns-api/.env.example`, con los
> campos vacíos, y el archivo con los valores reales viaja aparte.

### 3.2 Opción A — Script de despliegue *(recomendada)*

Es la forma más directa: se abre el archivo y él hace todo lo demás.

En Windows, doble clic sobre:

```
scripts\deploy-kubernetes.bat
```

En Linux o macOS:

```bash
./scripts/deploy-kubernetes.sh
```

El script revisa los requisitos, construye las cuatro imágenes, **las carga dentro del clúster**,
crea el Secret con las credenciales a partir del `.env`, instala el chart y espera a que todo esté
listo. Al terminar imprime cómo probar cada componente, con los puertos que Kubernetes asignó.

> El paso de cargar las imágenes al clúster es fácil de pasar por alto: Kubernetes tiene su propio
> almacén y no ve las imágenes del Docker local. Si falta, todos los contenedores quedan en el
> estado `ErrImageNeverPull`.

Para eliminarlo todo:

```
scripts\deploy-kubernetes.bat uninstall
```

Esta ruta necesita Kubernetes activado en Docker Desktop y Helm instalado. Si alguno falta, el
script lo dice antes de empezar.

### 3.3 Opción B — Docker Compose

Levanta el mismo sistema sin Kubernetes ni Helm: solo hace falta Docker. Es útil si no se quiere
activar Kubernetes en Docker Desktop.

Desde la raíz del proyecto:

```bash
docker compose up -d --build
```

Ese comando construye las cuatro imágenes y levanta seis contenedores. La primera vez tarda varios
minutos, porque compila Rust, C y Java.

Para verificar que todo quedó arriba:

```bash
docker compose ps
```

| Servicio | Dónde queda |
| --- | --- |
| Interfaz web | `http://localhost` |
| DNS API | `http://localhost:8080` |
| DNS Interceptor | puerto `5354/udp` (y también el `53/udp`) |
| Health Checkers | sin puerto: solo escriben en la base |

Para apagarlo todo:

```bash
docker compose down
```

Docker Compose y Kubernetes son **dos formas de correr lo mismo**, así que se usa una u otra: las
dos publican los puertos 80 y 53 de la máquina. Antes de cambiar de una a la otra hay que apagar la
anterior. El script de Kubernetes lo verifica y avisa.

---

## 4. Los componentes

### 4.1 DNS Interceptor

> _Pendiente: Isaac Rojas y Rafael Araya._

### 4.2 DNS API

El DNS API es el intermediario entre todos los demás y la base de datos. **Nadie más habla
directamente con Supabase para leer o escribir registros**: el Interceptor le pregunta a él, y la
interfaz web administra los datos a través de él.

Hace tres cosas:

1. **Responde qué IPs tiene un dominio**, para que el Interceptor sepa qué contestar.
2. **Administra la información**: registros DNS, rangos de IP por país y configuración de los
   chequeos de salud.
3. **Resuelve consultas que no conoce**, preguntándole a un servidor DNS externo.

#### Cómo está construido

| Decisión | Qué se usó | Por qué |
| --- | --- | --- |
| Lenguaje | Java 21 | Lo exige el enunciado |
| Framework web | Javalin 6 | Liviano y directo; el código se lee sin conocer el framework |
| Servidor | Jetty (incluido en Javalin) | No hay que instalar un servidor aparte |
| Acceso a datos | API REST de Supabase | El API se comporta como cliente HTTP, sin instalar controladores de base de datos |
| Empaquetado | Un solo archivo `.jar` | El contenedor solo necesita Java para ejecutarlo |

#### Cómo se ejecuta

Normalmente se levanta junto con el resto del sistema (sección 3). Para correrlo suelto, por ejemplo
mientras se programa:

```bash
cd dns-api
mvn package
```

Después se cargan las variables de entorno y se ejecuta:

```bash
java -jar target/dns-api.jar
```

En Windows, para cargar el archivo `.env` en la terminal antes de ejecutar:

```powershell
Get-Content .env | ForEach-Object { if ($_ -match '^\s*([A-Za-z_]\w*)=(.*)$') { Set-Item "Env:$($matches[1])" $matches[2].Trim('"') } }
```

Si arranca bien, muestra tres líneas:

```
INFO Main - Conexion con Supabase verificada
INFO Main - Las consultas delegadas se resolveran contra 8.8.8.8:53
INFO ApiServer - DNS API escuchando en http://0.0.0.0:8080 con hasta 100 peticiones concurrentes
```

#### Configuración

Todo se ajusta con variables de entorno; no hay ningún valor fijo en el código.

| Variable | Obligatoria | Por omisión | Para qué |
| --- | --- | --- | --- |
| `SUPABASE_URL` | **Sí** | — | Dirección del proyecto de base de datos |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | — | Llave de acceso a la base |
| `DNS_SERVER_IP` | **Sí** | — | Servidor DNS al que se le delegan las consultas desconocidas |
| `DNS_SERVER_PORT` | No | `53` | Puerto de ese servidor |
| `DNS_TIMEOUT_MS` | No | `3000` | Cuánto esperar su respuesta |
| `DNS_API_HOST` | No | `0.0.0.0` | Interfaz en la que escucha |
| `DNS_API_PORT` | No | `8080` | Puerto en el que escucha |
| `DNS_API_MAX_THREADS` | No | `100` | Cuántas peticiones atiende a la vez |

Las tres obligatorias no tienen valor por omisión **a propósito**: si falta alguna, el API no
arranca y dice cuál. Es preferible a que arranque a medias y falle después con un error confuso.

#### Cómo se usa

La dirección base es `http://localhost:8080`. Todas las respuestas son JSON.

| Qué se quiere hacer | Petición |
| --- | --- |
| Ver si el servicio está vivo | `GET /api/health` |
| Saber si un dominio está registrado | `GET /api/exists?hostname=api.company.com` |
| Listar los registros DNS | `GET /api/records` |
| Buscar los registros de un dominio | `GET /api/records?domain=api.company.com` |
| Crear un registro | `POST /api/records` |
| Modificar un registro | `PUT /api/records/{id}` |
| Eliminar un registro | `DELETE /api/records/{id}` |
| Administrar rangos de IP por país | `GET`, `POST`, `PUT`, `DELETE` en `/api/ip-country` |
| Saber de qué país es una IP | `GET /api/ip-country/lookup?ip=190.113.4.20` |
| Administrar los chequeos de salud | `GET`, `POST`, `PUT`, `DELETE` en `/api/health-checks` |
| Resolver un paquete DNS externo | `POST /api/dns_resolver` |

El detalle completo de cada campo está en [`contrato-dns-api.md`](contrato-dns-api.md).

**Ejemplo 1: crear un dominio con dos IPs repartidas por peso.** La primera atiende el 70 % de las
consultas y la segunda el 30 %.

```bash
curl -X POST http://localhost:8080/api/records -H "Content-Type: application/json" -d "{\"domain\":\"app.company.com\",\"type\":\"weight\",\"ttl\":300,\"targets\":[{\"ip\":\"172.16.0.1\",\"weight\":70},{\"ip\":\"172.16.0.2\",\"weight\":30}]}"
```

Responde `201` con el registro creado, ya con los identificadores que asignó la base de datos.

**Ejemplo 2: consultar si un dominio existe.** Es lo que hace el Interceptor con cada consulta.

```bash
curl "http://localhost:8080/api/exists?hostname=APP.Company.com."
```

```json
{ "exists": true, "hostname": "app.company.com", "type": "weight" }
```

El nombre se puede escribir en mayúsculas o con punto al final: en DNS es el mismo host, y el API lo
normaliza antes de buscarlo.

**Ejemplo 3: saber de qué país es una dirección IP.** Lo usa la estrategia por país.

```bash
curl "http://localhost:8080/api/ip-country/lookup?ip=190.113.4.20"
```

```json
{ "ip": "190.113.4.20", "countryCode": "CR", "countryName": "Costa Rica", "city": "San José" }
```

#### Los cinco tipos de registro

| Tipo | Qué responde | Qué se configura |
| --- | --- | --- |
| `single` | Siempre la misma IP | Una sola IP |
| `multi` | Va rotando entre las IPs, una por consulta | Dos o más IPs |
| `weight` | Reparte según el peso de cada una | Cada IP con su peso |
| `geo` | La IP del país del cliente | Cada IP con su país |
| `round-trip` | La IP que responde más rápido | Solo las IPs; los tiempos los miden los Health Checkers |

#### Si algo sale mal

| Mensaje | Qué pasó | Cómo se arregla |
| --- | --- | --- |
| `La variable SUPABASE_URL es obligatoria` | Falta configurar el `.env` | Ver la sección 3.1 |
| `No hay conexion con Supabase` | El API no alcanza la base de datos | Revisar la conexión a internet y que las credenciales sean correctas |
| `409 duplicate_domain` | Ya existe un registro para ese dominio | Modificar el existente en vez de crear otro |
| `400 invalid_body` | Falta un campo o tiene un valor inválido | El mensaje dice cuál |
| `502 dns_unreachable` | El servidor DNS externo no respondió | Revisar `DNS_SERVER_IP` |

### 4.3 Health Checker

> _Pendiente: Otto Segura._

### 4.4 DNS UI

> _Pendiente: Alexandra De Gracia._

### 4.5 Base de datos

> _Pendiente: Otto Segura._

---

## 5. Pruebas realizadas

### 5.1 DNS API

Todas se hicieron contra la base de datos real, con el sistema levantado según la sección 3.

| # | Qué se probó | Cómo reproducirlo | Resultado |
| --- | --- | --- | --- |
| 1 | El servicio responde | `curl http://localhost:8080/api/health` | `200` con `{"status":"ok"}` |
| 2 | Crear un registro `multi` | Ejemplo 1 de la sección 4.2, cambiando el tipo | `201` con los identificadores asignados |
| 3 | Consultar existencia | `curl "http://localhost:8080/api/exists?hostname=app.company.com"` | `200` con `exists: true` y el tipo |
| 4 | Nombres en mayúsculas y con punto final | Ejemplo 2 de la sección 4.2 | Encuentra el mismo registro |
| 5 | Dominio repetido | Enviar dos veces el mismo `POST /api/records` | El segundo responde `409` |
| 6 | Registro desactivado | Poner `isActive` en `false` y consultar `/api/exists` | Responde `exists: false` |
| 7 | Validación por tipo | Crear un `multi` con una sola IP | `400` explicando que necesita dos o más |
| 8 | IP inválida | Crear un registro con la IP `999.0.0.1` | `400` indicando la IP inválida |
| 9 | Buscar país por IP | Ejemplo 3 de la sección 4.2 | Devuelve el país, la ciudad y las coordenadas |
| 10 | IP fuera de todo rango | `curl "http://localhost:8080/api/ip-country/lookup?ip=8.8.8.8"` | `200` con el país en `null` |
| 11 | Un chequeo de salud por IP | Crear dos chequeos para la misma IP | El segundo responde `409` |
| 12 | La contraseña no se devuelve | Crear un chequeo con `basicAuth` y consultarlo | La contraseña sale en `null` |
| 13 | Resolver un dominio externo | Enviar un paquete DNS en BASE64 a `/api/dns_resolver` | Devuelve la respuesta del servidor externo |
| 14 | Servidor DNS que no responde | Arrancar con `DNS_SERVER_IP` de un equipo inexistente | `502 dns_unreachable` al agotarse el tiempo |
| 15 | Falta una credencial | Arrancar sin `SUPABASE_URL` | No arranca e indica la variable faltante |
| 16 | Peticiones simultáneas | Enviar 50 consultas a la vez a `/api/health` | Las 50 responden `200` |

### 5.2 Prueba del sistema completo

| # | Qué se probó | Cómo reproducirlo | Resultado |
| --- | --- | --- | --- |
| 1 | Resolución de un dominio propio | Crear `demo.company.com` con el API y consultar `nslookup -port=5354 demo.company.com 127.0.0.1` | Devuelve la IP configurada |
| 2 | Delegación de un dominio externo | `nslookup -port=5354 google.com 127.0.0.1` | El Interceptor lo delega al API y responde la IP real |
| 3 | Despliegue en Kubernetes | Ejecutar el script de la sección 3.2 y consultar desde dentro del clúster: `kubectl run prueba --rm -i --restart=Never --image=busybox:1.36 --command -- nslookup demo.company.com dns-interceptor` | Devuelve la IP configurada |

> En Kubernetes, la consulta DNS se hace desde dentro del clúster. El puerto UDP que Kubernetes
> publica hacia afuera no siempre es alcanzable desde Windows, porque el clúster corre dentro de una
> máquina virtual. Con Docker Compose sí se puede consultar directamente desde la máquina.

### 5.3 Otros componentes

> _Pendiente: cada responsable agrega sus pruebas._

---

## 6. Qué funciona y qué no

| Componente | Estado | Observaciones |
| --- | --- | --- |
| DNS Interceptor | _Pendiente_ | |
| Tipo `single` | _Pendiente_ | |
| Tipo `multi` | _Pendiente_ | |
| Tipo `weight` | _Pendiente_ | |
| Tipo `geo` | _Pendiente_ | |
| Tipo `round-trip` | _Pendiente_ | |
| **DNS API** | **Funciona** | Los cuatro grupos de endpoints operan contra la base de datos real: registros, rangos de IP por país, chequeos de salud y resolución externa. Se comunica por HTTP. El enunciado pide HTTPS entre el Interceptor y el API, que queda como trabajo pendiente |
| Health Checker | _Pendiente_ | |
| DNS UI | _Pendiente_ | |

---

## 7. Conclusiones

> _Pendiente: el enunciado pide al menos diez, escritas entre todos._

---

## 8. Recomendaciones

> _Pendiente: el enunciado pide al menos diez, escritas entre todos._
