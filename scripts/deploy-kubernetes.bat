@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

REM ===========================================================================
REM  Despliega el stack DNS completo en Kubernetes (Windows).
REM
REM    deploy-kubernetes.bat              instala o actualiza el stack
REM    deploy-kubernetes.bat uninstall    lo elimina
REM
REM  Requisitos: Docker Desktop con Kubernetes activado, kubectl, helm, y el archivo
REM  dns-api\.env con las credenciales de Supabase.
REM
REM  Se ejecuta con cmd y no con PowerShell a proposito: al cargar las imagenes al cluster
REM  hay que canalizar datos binarios, y PowerShell los altera y corrompe la imagen.
REM ===========================================================================

set "RELEASE=dns-stack"
set "CHART=.\helm\dns-stack"
set "SECRET=dns-stack-supabase"
set "ENV_FILE=dns-api\.env"

REM El script se puede ejecutar desde cualquier lado: siempre trabaja sobre la raiz del repositorio.
cd /d "%~dp0.."

REM ---------------------------------------------------------------------------
echo.
echo ==^> Revisando requisitos
REM ---------------------------------------------------------------------------
where docker >nul 2>&1 || (echo [ERROR] Falta docker. Instala Docker Desktop. & goto :error)
where kubectl >nul 2>&1 || (echo [ERROR] Falta kubectl. Viene con Docker Desktop. & goto :error)

REM helm suele quedar instalado sin agregarse al PATH. Si no aparece, se busca donde lo dejan
REM los instaladores mas comunes.
set "HELM="
for /f "delims=" %%H in ('where helm 2^>nul') do set "HELM=%%H"
if not defined HELM (
  for /d %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Packages\Helm.Helm*") do (
    if exist "%%D\windows-amd64\helm.exe" set "HELM=%%D\windows-amd64\helm.exe"
  )
)
if not defined HELM if exist "%ProgramData%\chocolatey\bin\helm.exe" set "HELM=%ProgramData%\chocolatey\bin\helm.exe"
if not defined HELM (
  echo [ERROR] Falta helm. Instalalo con: winget install Helm.Helm
  goto :error
)

if /i "%~1"=="uninstall" goto :uninstall

kubectl cluster-info >nul 2>&1 || (
  echo [ERROR] No hay un cluster de Kubernetes accesible.
  echo         En Docker Desktop: Settings ^> Kubernetes ^> Enable Kubernetes.
  goto :error
)

REM Las dos rutas publican los puertos 80 y 53 de la maquina, asi que solo puede haber una arriba.
REM Sin este aviso, el sintoma seria un error confuso al crear el balanceador de la interfaz.
set "COMPOSE_UP="
for /f "delims=" %%I in ('docker compose ps -q 2^>nul') do set "COMPOSE_UP=1"
if defined COMPOSE_UP (
  echo [ERROR] El stack de Docker Compose esta corriendo y ocupa los puertos 80 y 53.
  echo         Bajalo con "docker compose down" y volve a ejecutar este script.
  goto :error
)

if not exist "%ENV_FILE%" (
  echo [ERROR] No existe %ENV_FILE%.
  echo         Copia dns-api\.env.example como dns-api\.env y completa las credenciales.
  goto :error
)

REM findstr no entiende "+" como repeticion: "..*" significa un caracter y luego cualquier cosa,
REM o sea que la variable tiene al menos un valor.
findstr /r /c:"^SUPABASE_URL=..*" "%ENV_FILE%" >nul || (
  echo [ERROR] %ENV_FILE% no tiene un valor para SUPABASE_URL.
  goto :error
)

for /f "delims=" %%C in ('kubectl config current-context') do echo Cluster: %%C

REM ---------------------------------------------------------------------------
echo.
echo ==^> Construyendo las imagenes
REM ---------------------------------------------------------------------------
call :build dns-api .\dns-api || goto :error
call :build dns-interceptor .\dns-interceptor || goto :error
call :build dns-ui .\dns-ui || goto :error
call :build health-checker .\health_checker || goto :error

REM ---------------------------------------------------------------------------
echo.
echo ==^> Cargando las imagenes al cluster
REM ---------------------------------------------------------------------------
REM El cluster tiene su propio almacen de imagenes y no ve las del Docker local. Si su nodo es un
REM contenedor accesible, se le importan una por una.
set "NODO="
for /f "delims=" %%N in ('kubectl get nodes -o jsonpath^="{.items[0].metadata.name}"') do set "NODO=%%N"

docker exec %NODO% ctr --version >nul 2>&1
if errorlevel 1 (
  echo   El nodo "%NODO%" no es un contenedor local; se asume que el cluster ya ve las imagenes.
  echo   Si los pods quedan en ErrImageNeverPull, hay que subirlas a un registro.
) else (
  call :load dns-api || goto :error
  call :load dns-interceptor || goto :error
  call :load dns-ui || goto :error
  call :load health-checker || goto :error
)

REM ---------------------------------------------------------------------------
echo.
echo ==^> Creando el Secret con las credenciales
REM ---------------------------------------------------------------------------
REM Se genera a partir del .env local, para que la llave no pase por la linea de comandos ni quede
REM escrita en el repositorio. El apply lo deja actualizado si ya existia.
kubectl create secret generic %SECRET% --from-env-file="%ENV_FILE%" --dry-run=client -o yaml | kubectl apply -f -
if errorlevel 1 goto :error

REM ---------------------------------------------------------------------------
echo.
echo ==^> Instalando el chart
REM ---------------------------------------------------------------------------
"%HELM%" upgrade --install %RELEASE% "%CHART%" --set supabase.create=false --set supabase.existingSecret=%SECRET% --wait --timeout 5m
if errorlevel 1 goto :error

REM ---------------------------------------------------------------------------
echo.
echo ==^> Listo
REM ---------------------------------------------------------------------------
kubectl get pods

set "PUERTO_DNS="
for /f "delims=" %%P in ('kubectl get svc dns-interceptor -o jsonpath^="{.spec.ports[0].nodePort}" 2^>nul') do set "PUERTO_DNS=%%P"

echo.
echo El stack esta corriendo.
echo.
echo Probar el DNS Interceptor:
if defined PUERTO_DNS (
  echo    nslookup -port=%PUERTO_DNS% midominio.com 127.0.0.1
) else (
  echo    kubectl get svc dns-interceptor
)
echo.
echo Abrir el DNS API:
echo    kubectl port-forward svc/dns-api 8080:8080
echo    curl http://localhost:8080/api/health
echo.
echo Abrir la interfaz web:
echo    kubectl port-forward svc/dns-ui 8081:80
echo.
echo Ver los logs de un Health Checker:
echo    kubectl logs -l instance=cr -f
echo.
echo Eliminar todo:
echo    scripts\deploy-kubernetes.bat uninstall
echo.
echo El mismo sistema se puede levantar sin Kubernetes, con Docker Compose:
echo    docker compose up -d --build
echo    Son dos formas de correr lo mismo, asi que se usa una u otra:
echo    ambas publican los puertos 80 y 53 de la maquina.
echo.
pause
exit /b 0

REM ===========================================================================
:build
echo    %~1 ...
docker build -q -t "%~1:latest" "%~2" >nul
exit /b %errorlevel%

:load
echo    %~1 -^> %NODO%
docker save %~1:latest | docker exec -i %NODO% ctr -n k8s.io images import - >nul
exit /b %errorlevel%

:uninstall
echo.
echo ==^> Eliminando el stack
"%HELM%" uninstall %RELEASE%
kubectl delete secret %SECRET% --ignore-not-found

REM Si el balanceador de la interfaz nunca llego a crearse, su servicio queda bloqueado por un
REM finalizer y no se borra solo. Se le quita para que el cluster no quede con basura.
kubectl get svc dns-ui >nul 2>&1 && (
  echo    Liberando el servicio dns-ui, que quedo pendiente de borrado
  kubectl patch svc dns-ui -p "{\"metadata\":{\"finalizers\":null}}" >nul 2>&1
)
echo Listo.
pause
exit /b 0

:error
echo.
echo El despliegue se detuvo por el error de arriba.
pause
exit /b 1
