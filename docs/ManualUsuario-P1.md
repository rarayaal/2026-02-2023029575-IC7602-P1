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
deploy-kubernetes.bat
```

En Linux o macOS:

```bash
./deploy-kubernetes.sh
```

El script revisa los requisitos, construye las cuatro imágenes, **las carga dentro del clúster**,
crea el Secret con las credenciales a partir del `.env`, instala el chart y espera a que todo esté
listo. Al terminar imprime cómo probar cada componente, con los puertos que Kubernetes asignó.

> El paso de cargar las imágenes al clúster es fácil de pasar por alto: Kubernetes tiene su propio
> almacén y no ve las imágenes del Docker local. Si falta, todos los contenedores quedan en el
> estado `ErrImageNeverPull`.

Para eliminarlo todo:

```
deploy-kubernetes.bat uninstall
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

#### 4.1.1. Descripción breve

El DNS Interceptor es un servidor DNS que recibe consultas DNS mediante UDP, analiza los paquetes y decide cómo resolverlos:

* **Consultas estándar:** consulta los registros administrados por la DNS API y construye la respuesta DNS.
* **Consultas no estándar:** envía el paquete completo a la DNS API mediante Base64.
* **Resolución remota:** si un dominio no existe localmente o no tiene un registro saludable, utiliza la resolución remota.

Este interceptor no almacena registros DNS directamente. La información de dominios, IPs, TTL y estrategias proviene de la DNS API.



#### 4.1.2. Inicio del sistema

Desde la raíz del proyecto, ejecutar:

```bash
docker compose up -d --build dns-api dns-interceptor
```

Este comando:
1. Construye la imagen de la DNS API.
2. Construye la imagen del interceptor.
3. Inicia la DNS API.
4. Verifica que la DNS API esté saludable.
5. Inicia el interceptor.
6. Conecta ambos servicios mediante Docker Compose.

Consultar el estado de los contenedores:

```bash
docker compose ps
```

La salida esperada debe indicar:
* `dns-api: Up ... (healthy)`
* `dns-interceptor: Up`

Verificar la salud de la DNS API:

```powershell
Invoke-RestMethod http://localhost:8080/api/health
```

La respuesta esperada es similar a:

```json
{
  "status": "ok",
  "component": "dns-api"
}
```


#### 4.1.3. Uso del interceptor como servidor DNS

El Compose raíz publica el interceptor en los siguientes puertos:
* **UDP 53:** puerto DNS estándar.
* **UDP 5354:** puerto alternativo para desarrollo.

Para realizar una consulta utilizando el puerto DNS estándar:

```bash
nslookup example.com 127.0.0.1
```

La consulta debe ser recibida por el interceptor y procesada mediante la DNS API.


#### 4.1.4. Resolución de consultas estándar

Para una consulta estándar:
1. El interceptor recibe el paquete DNS.
2. Valida que el paquete tenga un encabezado correcto.
3. Verifica que sea una consulta estándar.
4. Extrae el dominio, el tipo y la clase.
5. Consulta:
   `GET /api/exists?hostname=example.com`
6. Si el dominio existe, consulta:
   `GET /api/records?domain=example.com`
7. Selecciona un destino saludable mediante el motor de resolución.
8. Construye la respuesta DNS con la IP seleccionada.
9. Envía la respuesta al cliente.


#### 4.1.5. Resolución de consultas no estándar

Las consultas no estándar se envían a la DNS API mediante:
`POST /api/dns_resolver`

El cuerpo utiliza el siguiente formato:

```json
{
  "data": "<paquete-DNS-en-BASE64>"
}
```

La DNS API:
1. Decodifica el paquete Base64.
2. Lo reenvía mediante UDP al servidor DNS remoto.
3. Recibe la respuesta.
4. La codifica nuevamente en Base64.
5. Devuelve la respuesta al interceptor.

El interceptor decodifica la respuesta y la reenvía al cliente DNS original.


#### 4.1.6. Detener el sistema

Para detener los servicios:

```bash
docker compose down
```

Para detenerlos y eliminar también los volúmenes asociados:

```bash
docker compose down -v
```

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
El Health Checker es el motor de monitoreo en segundo plano encargado de verificar periódicamente si los servidores destino (`targets`) asignados a los dominios DNS se encuentran activos y saludables, midiendo además su latencia (Round-Trip Time / RTT).
A diferencia de los demás componentes, **no escucha en un puerto de red**. Funciona como un servicio autónomo en bucle que sincroniza configuraciones desde Supabase, ejecuta pruebas activas por **TCP** o **HTTP/HTTPS**, emite métricas y participa en un **sistema de consenso distribuido por mayoría simple**.
#### Cómo está construido
| Decisión | Qué se usó | Por qué |
| --- | --- | --- |
| Lenguaje | GNU C (C11) | Requisito del proyecto; alta eficiencia, bajo consumo y control de sockets a bajo nivel |
| Cliente HTTP y REST | `libcurl` | Manejo estándar de peticiones HTTP/HTTPS, códigos de estado, Basic Auth y API REST de Supabase |
| Procesamiento JSON | `cJSON` | Serialización y deserialización ligera de configuraciones y resultados |
| Conexiones TCP | Sockets POSIX nativos | Medición precisa del handshake TCP con `poll()` y control estricto de timeouts |
| Concurrencia / Distribución | Múltiples nodos geolocalizados | Evalúa la salud y latencia desde distintas regiones para el consenso y la estrategia round-trip |
#### Cómo funciona el ciclo de vida
| Etapa | Operación | Qué realiza |
| --- | --- | --- |
| **1. Inicialización** | Lectura de entorno | Carga `SUPABASE_URL`, llaves, coordenadas geográficas e intervalo de sondeo |
| **2. Presencia** | Heartbeat | Registra su estado activo y timestamp en `checker_instances` |
| **3. Descarga** | Sincronización | Obtiene de Supabase los targets activos y sus reglas de monitoreo |
| **4. Evaluación** | Pruebas activas | Ejecuta el handshake TCP o petición HTTP evaluando timeouts y reintentos |
| **5. Reporte** | Emisión de resultados | Envía un `POST` a `health_check_results` con el RTT medido y estado de salud |
| **6. Reposo** | Intervalo de espera | Duerme durante el intervalo configurado (`SYNC_INTERVAL_SECONDS`) |
#### Modos de comprobación
- **TCP:** Abre un socket POSIX en modo no bloqueante hacia `ip:puerto`. Mide el tiempo de conexión con `clock_gettime(CLOCK_MONOTONIC)`. Si falla o supera el timeout, agota los reintentos antes de marcar el target como `unhealthy`.
- **HTTP/HTTPS:** Utiliza `libcurl` para consultar la ruta configurada con soporte para HTTP Basic Auth. Considera el target `healthy` únicamente si el código de respuesta coincide con los esperados (por omisión `[200]`).
#### Despliegue multi-región y simulación de RTT
El sistema levanta tres instancias simulando nodos en distintas partes del mundo para alimentar el algoritmo **Round-Trip** y el consenso:
| Contenedor | Instance ID | País | Ciudad | Coordenadas | Penalización RTT simulada |
| --- | --- | --- | --- | --- | --- |
| `health-checker-cr` | `hc-cr-sjo` | Costa Rica (`CR`) | San José | `9.9281, -84.0907` | `0.0 ms` |
| `health-checker-us` | `hc-us-nyc` | Estados Unidos (`US`) | Nueva York | `40.7128, -74.0060` | `+45.0 ms` |
| `health-checker-eu` | `hc-eu-fra` | Alemania (`DE`) | Fráncfort | `50.1109, 8.6821` | `+120.0 ms` |
#### Configuración
Todo se ajusta con variables de entorno.
| Variable | Obligatoria | Por omisión | Para qué |
| --- | --- | --- | --- |
| `SUPABASE_URL` | **Sí** | — | URL base del proyecto de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | **Sí** | — | Llave de acceso administrativo para lectura y escritura REST |
| `INSTANCE_ID` | No | `hc-node-local` | Identificador único de la instancia del checker |
| `INSTANCE_COUNTRY` | No | `CR` | Código ISO del país donde se ubica el nodo |
| `INSTANCE_CITY` | No | `San Jose` | Nombre de la ciudad de la instancia |
| `INSTANCE_LAT` | No | `9.928100` | Latitud geográfica del nodo |
| `INSTANCE_LON` | No | `-84.090700` | Longitud geográfica del nodo |
| `SIMULATED_RTT_PENALTY_MS` | No | `0.0` | Milisegundos agregados al RTT real para simular lejanía |
| `SYNC_INTERVAL_SECONDS` | No | `30` | Frecuencia en segundos entre ciclos de verificación |
#### Compilación y ejecución manual
```bash
cd health_checker
make
./health_checker_bin
```
---

### 4.4 DNS UI
#### 4.4.1. Descripción

El objetivo presentar de forma ordenada la interfaz de usuario del sistema DNS, explicando qué puede observar y realizar el usuario en cada sección de la aplicación.

Además de describir las funcionalidades, el manual explica los principales elementos visuales de la interfaz, como los **colores, botones, menús, tablas, formularios, indicadores de estado e iconos**, para facilitar la comprensión y el uso del sistema.

La interfaz utiliza diferentes elementos visuales para orientar al usuario durante la navegación. Por ejemplo, los **colores permiten diferenciar estados o acciones**, mientras que los **botones e iconos indican las operaciones que pueden realizarse sobre la información**, como crear, editar, consultar o eliminar registros.

Los elementos principales que el usuario encontrará son:

- **Menú de navegación:** permite desplazarse entre los diferentes módulos de la aplicación.
- **Sección activa:** se identifica visualmente para indicar al usuario en qué módulo se encuentra.
- **Botones de acción:** permiten realizar operaciones como crear, guardar, editar o eliminar información.
- **Tablas:** presentan los registros existentes de manera organizada para facilitar su consulta.
- **Formularios:** permiten introducir o modificar la información de los registros.
- **Indicadores de estado:** ayudan a identificar visualmente el estado de determinados elementos o procesos.
- **Iconos:** complementan los botones y facilitan la identificación de determinadas acciones.
- **Colores de la interfaz:** proporcionan una diferenciación visual entre acciones, estados y elementos de navegación.

---

#### 4.4.2. Acceso a la aplicación

La aplicación web se encuentra disponible en:

```text
http://localhost
```

Al ingresar a esta dirección, el usuario verá la interfaz principal del sistema DNS.

### ¿Qué encontrará el usuario?

La aplicación permite acceder desde el menú a las principales funciones de administración:

- **Registros DNS**
- **Health Checks**
- **GeoIP / IP-to-Country**

Desde estas secciones el usuario puede consultar información y, según la funcionalidad disponible, crear, modificar o eliminar configuraciones.

### Vista inicial

| Elemento visible | Descripción para el usuario |
|---|---|
| **Menú de navegación** | Permite desplazarse entre las diferentes funcionalidades de la aplicación. |
| **Sección principal** | Muestra el contenido correspondiente a la opción seleccionada. |
| **Tabla de información** | Presenta los registros disponibles de forma organizada. |
| **Botones de acción** | Permiten realizar operaciones como crear, editar o eliminar registros cuando están disponibles. |
| **Formularios / ventanas** | Se utilizan para introducir o modificar información. |

### Evidencia — Pantalla principal

| Evidencia | Qué verá el usuario | Qué debe observar |
|---|---|---|
| **T33-01 — Pantalla principal** | La interfaz principal de la aplicación y el listado de registros DNS. | Que la aplicación cargó correctamente y que el contenido principal está disponible. |

---

#### 4.4.3. Navegación de la interfaz

La navegación permite cambiar entre las diferentes áreas del sistema sin necesidad de salir de la aplicación.

##### Menú principal

El usuario puede seleccionar las diferentes secciones desde el menú de navegación.

Las secciones documentadas son:

1. **Registros**
2. **Health Checks**
3. **GeoIP / IP-to-Country**

Cuando una sección está seleccionada, esta debe quedar visualmente diferenciada de las demás.

##### ¿Qué verá el usuario?

Por ejemplo, al seleccionar **Registros**, el usuario verá que esa opción queda marcada como activa y el contenido de la página cambia para mostrar la administración de registros DNS.

### Evidencia — Navegación

| Evidencia | Qué verá el usuario | Qué demuestra |
|---|---|---|
| **T33-02 — Navegación** | El menú con las diferentes secciones y una sección resaltada como activa. | Que el usuario puede desplazarse entre los módulos principales de la aplicación. |

---

#### 4.4.4. Registros DNS

##### ¿Qué puede hacer el usuario?

Desde la sección **Registros**, el usuario puede administrar las configuraciones DNS disponibles en la aplicación.


La interfaz contempla los siguientes tipos:

- **Single**
- **Multi**
- **Weight**
- **Round-Trip**
- **Geo**

---

#### 4.4.5. Crear un registro DNS

Para crear un registro, el usuario debe ingresar a **Registros** y utilizar la opción correspondiente para crear un nuevo registro.

##### Pasos para el usuario

1. Seleccionar **Registros** en el menú.
2. Seleccionar la opción para crear un registro.
3. Elegir el tipo de registro.
4. Completar los campos que aparecen en el formulario.
5. Revisar la información introducida.
6. Guardar el registro.
7. Comprobar que el registro aparece en el listado.

---

#### 4.4.6. Registro Single

El tipo **Single** corresponde a un registro con un destino (`target`).

##### ¿Qué verá el usuario?

Al seleccionar Single, el formulario mostrará la configuración correspondiente al registro y su destino.


##### Cuadro de interfaz

| Elemento | Qué debe ver el usuario |
|---|---|
| **Tipo** | Single |
| **Dominio / registro** | Información del registro que se está configurando |
| **Target** | Destino asociado al registro |
| **Acción** | Opción para guardar la configuración |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T34-01 — Registro Single** | El formulario o detalle de un registro de tipo Single con su `target`. | Permite visualizar cómo el usuario configura un registro DNS básico. |

---

#### 4.4.7. Registro Multi

El tipo **Multi** permite trabajar con múltiples destinos asociados al registro.

##### ¿Qué verá el usuario?

El usuario podrá visualizar varios `targets` dentro de la configuración del registro.

##### Flujo paso a paso

1. Seleccionar el tipo de registro: **Multi**.
2. Configurar el **dominio**.
3. Agregar el **Target 1**.
4. Agregar el **Target 2**.
5. Agregar el **Target 3**, si es necesario.
6. Presionar **Guardar**.
7. Verificar que el registro aparezca correctamente en el listado.

##### Cuadro de interfaz

| Elemento | Qué debe ver el usuario |
|---|---|
| **Tipo** | Multi |
| **Dominio / registro** | Registro que se está configurando |
| **Targets** | Múltiples destinos asociados |
| **Acción** | Guardar la configuración |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T34-02 — Registro Multi** | Varios `targets` configurados dentro del registro. | Permite visualizar la configuración de múltiples destinos desde la interfaz. |

---

#### 4.4.8. Registro Weight

El tipo **Weight** permite configurar destinos junto con sus respectivos pesos.

##### ¿Qué verá el usuario?

La interfaz mostrará los destinos y el valor de peso asignado a cada uno.


Los valores anteriores son solamente un ejemplo de visualización y deben sustituirse por los datos utilizados en la prueba.

##### Cuadro de interfaz

| Elemento | Qué debe ver el usuario |
|---|---|
| **Tipo** | Weight |
| **Target** | Destino configurado |
| **Peso** | Valor asignado al destino |
| **Otros targets** | Destinos adicionales y sus pesos |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T34-03 — Registro Weight** | Los destinos configurados y sus respectivos pesos. | Permite comprobar visualmente la configuración de distribución mediante pesos. |

---

#### 4.4.9. Registro Round-Trip

El tipo **Round-Trip** utiliza información relacionada con la latencia o RTT para la configuración del registro.

##### ¿Qué verá el usuario?

El formulario mostrará los datos asociados con la configuración Round-Trip.

La pantalla debe permitir distinguir que el registro utiliza esta estrategia y mostrar los valores correspondientes que hayan sido configurados.

##### Cuadro de interfaz

| Elemento | Qué debe ver el usuario |
|---|---|
| **Tipo** | Round-Trip |
| **Configuración** | Datos relacionados con la estrategia de resolución |
| **Latencia / RTT** | Información correspondiente cuando esté disponible |
| **Acción** | Guardar o actualizar |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T34-04 — Registro Round-Trip** | La configuración asociada al enrutamiento por latencia. | Permite identificar visualmente que se está utilizando la estrategia Round-Trip. |

---

##### 4.4.10. Registro Geo

El tipo **Geo** permite asociar destinos con códigos ISO de países.

##### ¿Qué verá el usuario?

El usuario podrá observar los destinos configurados y su asociación con información geográfica.


##### Cuadro de interfaz

| Elemento | Qué debe ver el usuario |
|---|---|
| **Tipo** | Geo |
| **Código de país** | Código ISO correspondiente |
| **Target** | Destino asociado al país |
| **Acción** | Guardar o actualizar |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T34-05 — Registro Geo** | Targets asociados con códigos ISO de país. | Permite visualizar la configuración geográfica de los registros DNS. |

---

#### 4.4.11. Consultar y editar registros

Una vez creado un registro, el usuario puede volver al listado para consultar su información.

##### ¿Qué debe comprobar el usuario?

Después de guardar una modificación, el usuario debe volver a revisar el registro y confirmar que la información actualizada aparece correctamente.

##### Eliminación

Cuando se utilicen registros de prueba, estos pueden eliminarse al finalizar la validación para mantener limpio el listado.

---

#### 4.4.12. Health Checks

##### ¿Qué es esta sección para el usuario?

La sección **Health Checks** permite configurar comprobaciones sobre servicios mediante los protocolos disponibles.

El documento contempla:

- **TCP**
- **HTTP**

El usuario puede configurar los parámetros correspondientes al tipo de comprobación seleccionado.

---

#### 4.4.13. Health Check TCP

Al seleccionar una comprobación **TCP**, el usuario verá los campos disponibles para configurar la conexión.

##### Parámetros documentados

- Host o IP
- Puerto
- Timeout
- Reintentos (`retries`)
- Intervalo

##### Cuadro de interfaz

| Campo | Qué representa para el usuario |
|---|---|
| **Host / IP** | Equipo o dirección que será comprobada. |
| **Puerto** | Puerto utilizado para la comprobación TCP. |
| **Timeout** | Tiempo configurado para esperar la respuesta. |
| **Retries** | Cantidad de reintentos configurados. |
| **Intervalo** | Frecuencia con la que se realiza la comprobación. |

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T35-01 — Health Check TCP** | El formulario TCP con sus campos configurados. | Permite observar cómo el usuario configura una comprobación TCP. |

---

#### 4.4.14. Health Check HTTP

La configuración **HTTP** utiliza los parámetros básicos de la comprobación y agrega información propia del protocolo HTTP cuando está disponible.

##### Parámetros documentados

- Host o IP
- Puerto
- Timeout
- Reintentos
- Intervalo
- Path
- Códigos esperados
- Basic Auth, cuando esté disponible

##### ¿Qué verá el usuario?

Al seleccionar **HTTP**, el formulario mostrará los campos correspondientes al protocolo.

##### Pasos

1. Seleccione **HTTP** como protocolo.
2. Ingrese el **Host / IP** del destino.
3. Indique el **Puerto**.
4. Configure el **Timeout**.
5. Configure la cantidad de **Retries**.
6. Indique el **Intervalo** de verificación.
7. Ingrese el **Path** que se utilizará para la solicitud.
8. Indique los **Códigos esperados**.
9. Configure **Basic Auth**, si está disponible.
10. Revise la información ingresada.
11. Presione **Guardar**.


##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T35-02 — Health Check HTTP** | El formulario HTTP con los parámetros configurados. | Permite observar la configuración de una comprobación HTTP desde la interfaz. |

> **Seguridad:** Si se utiliza Basic Auth, nunca deben mostrarse contraseñas o credenciales reales en una captura de evidencia.

---

#### 4.4.15. GeoIP / IP-to-Country

##### ¿Qué verá el usuario?

La sección relacionada con **GeoIP / IP-to-Country** permite trabajar con información que relaciona rangos IP con códigos de país.

El usuario puede realizar las operaciones documentadas:

- Consultar registros.
- Buscar registros.
- Agregar registros.
- Editar registros.
- Eliminar registros.

---

#### 4.4.16. Listado IP-to-Country

Al entrar a esta sección, el usuario encontrará un listado o tabla con la información disponible.

##### ¿Qué debe poder identificar?

El usuario debe poder distinguir:

- Rango IP.
- País o código asociado.
- Acciones disponibles sobre el registro.

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T36-01 — Lista IP-to-Country** | Tabla de rangos IP y sus países asociados. | Permite visualizar el catálogo disponible y sus datos principales. |

---

#### 4.4.17. Agregar o editar IP-to-Country

Al seleccionar la opción para agregar o modificar un registro, el usuario verá un formulario o ventana de edición.

##### Información documentada

- Rango IP.
- Código de país.

##### Flujo visual
##### Pasos

1. Ingrese al módulo **IP-to-Country**.
2. Seleccione **Agregar** para crear un nuevo registro o **Editar** para modificar uno existente.
3. Ingrese o modifique el **Rango IP**.
4. Seleccione o ingrese el **Código de país** correspondiente.
5. Presione **Guardar**.
6. Verifique que el registro aparezca correctamente en el listado.

##### Evidencia

| Evidencia | Qué debe mostrar la pantalla | Explicación |
|---|---|---|
| **T36-02 — Modal IP-to-Country** | El formulario para agregar o editar un rango IP y su código de país. | Permite visualizar la operación de creación o modificación desde la interfaz. |

---

#### 4.4.18. Acciones generales de la interfaz

Aunque cada módulo tiene campos y opciones diferentes, las acciones principales siguen un proceso sencillo y similar.

##### Crear un registro

Para crear un nuevo registro:

1. Ingrese al módulo correspondiente desde la barra de navegación.
2. Seleccione la opción **Crear**.
3. Se abrirá un formulario.
4. Complete los campos solicitados con la información correspondiente.
5. Revise que los datos ingresados sean correctos.
6. Presione **Guardar**.
7. Verifique que el nuevo registro aparezca en el listado.

**Flujo:**  
`Módulo → Crear → Completar formulario → Guardar → Verificar registro`

---

##### Editar un registro

Para modificar un registro existente:

1. Ingrese al módulo correspondiente.
2. Localice el registro que desea modificar.
3. Seleccione la opción **Editar**.
4. Se abrirá el formulario con la información actual del registro.
5. Modifique los campos que necesite cambiar.
6. Revise la información modificada.
7. Presione **Guardar**.
8. Verifique en el listado que los cambios se hayan aplicado correctamente.

**Flujo:**  
`Módulo → Seleccionar registro → Editar → Modificar información → Guardar → Verificar cambios`

---

##### Eliminar un registro

Para eliminar un registro:

1. Ingrese al módulo correspondiente.
2. Localice el registro que desea eliminar.
3. Seleccione la opción **Eliminar**.
4. El sistema mostrará un mensaje de confirmación.
5. Verifique que el registro seleccionado sea el correcto.
6. Confirme la eliminación.
7. Verifique en el listado que el registro ya no aparezca.

**Flujo:**  
`Módulo → Seleccionar registro → Eliminar → Confirmar → Verificar eliminación`

> **Nota:** La eliminación es una acción permanente, por lo que se recomienda verificar el registro antes de confirmar.
---

#### 4.4.19. Qué verá el usuario en cada sección

| Sección | Función principal | Información visible |
|---|---|---|
| **Registros** | Administración de registros DNS | Tipo de registro, dominio, targets y configuración asociada |
| **Health Checks** | Configuración de comprobaciones | Protocolo, host/IP, puerto y parámetros de comprobación |
| **GeoIP / IP-to-Country** | Gestión de información geográfica | Rangos IP y códigos de país |

---

#### 1. Funcionamiento Integrado del Sistema (T-38)

El sistema funciona de manera integrada mediante contenedores Docker o Kubernetes. Esto permite que todos sus componentes, como la interfaz web, el servidor de aplicaciones, el interceptor DNS, la base de datos y los monitores de salud, se ejecuten de forma coordinada.

Al iniciar el sistema, los diferentes servicios se levantan y establecen la comunicación necesaria entre ellos, evitando que el usuario tenga que iniciar o configurar cada componente de manera independiente.

#### 2. Configuración Segura y Protección de Datos (T-39)

La configuración del sistema se realiza mediante variables de entorno, donde se definen las direcciones de los servicios, las rutas de conexión y las credenciales necesarias.

Este mecanismo evita almacenar contraseñas y otros datos sensibles directamente en el código fuente. Además, permite modificar la configuración del entorno de ejecución sin necesidad de realizar cambios en la aplicación.

#### 3. Aplicación Real de las Respuestas DNS (T-40)

Los registros DNS configurados desde la interfaz web son utilizados por el sistema para procesar las consultas DNS.

Cuando un usuario crea o modifica un registro, la configuración queda disponible para el proceso de resolución. Posteriormente, cuando un equipo cliente realiza una consulta DNS, por ejemplo mediante `nslookup`, la solicitud es recibida por el interceptor DNS, que consulta la configuración correspondiente y genera la respuesta según la estrategia de balanceo configurada.

De esta manera, la configuración realizada desde la interfaz se refleja en el proceso de resolución DNS del sistema.

#### 4.4.20. Recorrido recomendado para el usuario

Un recorrido completo por la interfaz puede realizarse de la siguiente manera:

##### Paso 1 — Ingresar

Abrir:

```text
http://localhost
```

##### Paso 2 — Revisar la pantalla principal

Comprobar que la interfaz carga y que se muestra el contenido principal.

##### Paso 3 — Revisar Registros

Entrar a **Registros** y observar el listado.

##### Paso 4 — Probar un registro

Crear un registro de prueba, seleccionar su tipo y completar la información.

##### Paso 5 — Revisar el registro

Abrir el registro creado y comprobar sus datos.

##### Paso 6 — Modificarlo

Editar algún dato y guardar el cambio.

##### Paso 7 — Eliminar el registro de prueba

Eliminarlo cuando ya no sea necesario.

##### Paso 8 — Revisar Health Checks

Entrar a **Health Checks** y observar las opciones TCP y HTTP.

##### Paso 9 — Revisar GeoIP / IP-to-Country

Consultar el listado y abrir el formulario de creación o edición.

##### Paso 10 — Finalizar

Comprobar que las modificaciones realizadas durante la prueba se reflejaron correctamente.


### 4.5 Base de datos
La base de datos está implementada sobre **PostgreSQL en Supabase**. Actúa como el núcleo central de sincronización y estado del sistema: almacena los dominios, targets, configuraciones de monitoreo, catálogo geográfico IP y la telemetría en tiempo real.
#### Tablas principales
| Tabla | Propósito |
| --- | --- |
| `dns_records` | Almacena los dominios administrados, el tipo de balanceo (`single`, `multi`, `weight`, `round-trip`, `geo`), TTL y estado activo |
| `dns_record_targets` | Direcciones IP destino de cada dominio, peso, país, latencia promedio y su estado consolidado (`is_healthy`) |
| `health_check_configs` | Parámetros de monitoreo vinculados a cada target (TCP/HTTP, puerto, ruta, códigos esperados, timeout, reintentos) |
| `checker_instances` | Catálogo de nodos Health Checker en ejecución, coordenadas geográficas y timestamp de último latido (`last_heartbeat`) |
| `health_check_results` | Historial de telemetría y votos emitidos por cada nodo (estado, RTT, código HTTP devuelto y error) |
| `ip_to_country` | Rangos IP mapeados a códigos ISO de país, ciudad y coordenadas geográficas para resolución `geo` |
#### Vistas y lógica de consenso automático
La base de datos procesa y agrega la salud del clúster automáticamente mediante SQL nativo y triggers:
| Elemento en Base de Datos | Tipo | Rol dentro del consenso |
| --- | --- | --- |
| **`view_latest_instance_health`** | Vista SQL | Filtra y conserva únicamente el reporte de salud más reciente de cada instancia activa (`is_active = TRUE`) |
| **`view_target_consensus`** | Vista SQL | Aplica la regla de mayoría simple ($healthy\_votes > total / 2$) y calcula el RTT promedio |
| **`trg_health_check_results_consensus`** | Trigger PostgreSQL | Se dispara automáticamente con cada nuevo resultado insertado en `health_check_results` |
| **`dns_record_targets`** | Tabla | Almacena los campos `is_healthy` y `avg_rtt_ms` actualizados en tiempo real por el trigger para el DNS Interceptor |

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

### 5.3 Health Checker

Las pruebas se ejecutaron levantando los tres contenedores de Health Checker (`checker-cr`, `checker-us`, `checker-eu`) contra endpoints reales y servicios mock:
| # | Qué se probó | Cómo reproducirlo | Resultado |
| --- | --- | --- | --- |
| 1 | Sincronización y Heartbeat | Iniciar un checker y consultar la tabla `checker_instances` | Se crea/actualiza la instancia con sus coordenadas y timestamp reciente |
| 2 | Verificación TCP exitosa | Configurar un check TCP al puerto `80` de un host activo (ej. `1.1.1.1:80`) | Registra estado `healthy`, intentos: 1 y mide el RTT en milisegundos |
| 3 | Verificación TCP con fallo | Configurar un check TCP a un puerto cerrado o IP inalcanzable | Agota los reintentos (`retries`) y reporta `unhealthy` con el motivo de error |
| 4 | Verificación HTTP con Basic Auth | Configurar HTTP con credenciales y ruta protegida | Envía cabecera `Authorization: Basic`, valida código `200` y reporta `healthy` |
| 5 | Consenso por mayoría (Target caído) | Apagar un servicio web monitoreado por las 3 instancias | Las 3 instancias votan `unhealthy`. El trigger cambia `dns_record_targets.is_healthy` a `false` |
| 6 | Tolerancia a fallos de red local de un nodo | Desconectar el contenedor `checker-eu` de la red externa | Nodos `checker-cr` y `checker-us` votan `healthy` (2 de 3). La mayoría simple mantiene el target como `healthy` |
| 7 | Actualización de latencia Round-Trip | Monitorear un target con las penalizaciones simuladas de RTT | La base de datos actualiza `avg_rtt_ms` reflejando el promedio de los tres nodos |

### 5.4 DNS UI


| # | Qué se probó | Cómo reproducirlo | Resultado |
| :--- | :--- | :--- | :--- |
| **1** | **Renderizado y navegación SPA (T-33)** | Abrir `http://localhost/` en el navegador y hacer clic en las pestañas del menú lateral (*Panel Principal*, *Registros DNS*, *Monitoreo de Salud*, *Ubicación por IP*). |Las vistas cargan inmediatamente sin recargar la página ni generar errores 404 en Nginx gracias al enrutamiento `try_files`. |
| **2** | **Gestión CRUD de Registros DNS (T-34)** | Ingresar a `http://localhost/records`, abrir el modal y crear/editar registros para los 5 tipos de balanceo (`single`, `multi`, `weight`, `round-trip`, `geo`). |El formulario formatea dinámicamente el arreglo de `targets` según el contrato del DNS API Java y actualiza la tabla en tiempo real. |
| **3** | **Configuración de Monitoreos TCP/HTTP (T-35)** | Ir a `http://localhost/health-checks`, agregar un check HTTP especificando puerto, timeout, reintentos, intervalo, códigos `200, 204` y credenciales Basic Auth. | Valida entradas numéricas, convierte la lista de códigos HTTP a arreglos de enteros y guarda la regla conectada a la base de datos. |
| **4** | **Mapeo de Ubicación IP-to-Country (T-36)** | En `http://localhost/ip-country`, registrar una subred en notación CIDR (ej. `203.0.113.0/24`) asignada al país `CR`. |La interfaz parsea correctamente los rangos IP, fuerza el código ISO en mayúsculas y muestra la descripción geográfica. |

---

### 5.5 Despliegue y orquestación

Las pruebas del sistema completado para verificar la integración entre los cinco componentes del proyecto, la inyección de configuración y el flujo de resolución DNS.

| # | Qué se probó | Cómo reproducirlo | Resultado |
| :--- | :--- | :--- | :--- |
| **1** | **Orquestación multi-contenedor en Docker Compose (T-38)** | Ejecutar `docker compose up -d` en la raíz del proyecto y verificar el estado con `docker compose ps`. | Los contenedores (`dns-ui`, `dns-api`, `dns-interceptor`, `checker-cr`, `checker-us`, `checker-eu`) inician en orden secuencial y permanecen en estado *healthy*. |
| **2** | **Inyección dinámica de variables de entorno y Secrets (T-39)** | Ejecutar `helm lint helm/dns-stack` y verificar el renderizado con `helm template helm/dns-stack`. | Las credenciales de Supabase y las variables de conexión se inyectan mediante `_supabase-env.tpl` y `supabase-secret.yaml` sin credenciales quemadas. |
| **3** | **Prueba End-to-End (E2E) con `resolv.conf` (T-40)** | Apuntar `/etc/resolv.conf` en un contenedor cliente a la IP del `dns-interceptor` (puerto 53 UDP) y ejecutar `nslookup ejemplo.com`. | El Interceptor en Rust recibe el paquete DNS, delega en BASE64 hacia el `dns-api` Java y responde con la IP correspondiente a la estrategia configurada desde la UI. |

---

### 5.6 Integración de la UI con la infraestructura

Pruebas específicas de integración entre el frontend `dns-ui` y la infraestructura del clúster:

| # | Qué se probó | Cómo reproducirlo | Resultado |
| :--- | :--- | :--- | :--- |
| **1** | **Comunicación HTTP / CORS entre UI y Backend Java** | Realizar peticiones `GET`, `POST`, `PUT` y `DELETE` desde la UI (puerto 80) hacia el DNS API Java (puerto 8080). |Las solicitudes resuelven correctamente sin bloqueos de origen cruzado (CORS) utilizando la variable `VITE_API_URL`. |
| **2** | **Despliegue del Helm Chart en Kubernetes** | Ejecutar los scripts de despliegue `/deploy-kubernetes.sh` o `/deploy-kubernetes.bat`. |  El Pod de `dns-ui` se levanta en Kubernetes montando el ConfigMap y sirviendo el sitio de administración en la red interna del clúster. |

---

## 6. Qué funciona y qué no

| Componente | Estado | Observaciones |
| --- | --- | --- |
| **DNS Interceptor** | **Funciona** | Recibe consultas por UDP, distingue las estándar de las no estándar y decide entre resolverlas con los datos del DNS API o delegar el paquete completo en BASE64. Verificado en la sección 5.2: un dominio propio resuelve con la IP registrada y un dominio externo se delega correctamente |
| Tipo `single` | _Pendiente_ | |
| Tipo `multi` | _Pendiente_ | |
| Tipo `weight` | _Pendiente_ | |
| Tipo `geo` | _Pendiente_ | |
| Tipo `round-trip` | _Pendiente_ | |
| **DNS API** | **Funciona** | Los cuatro grupos de endpoints operan contra la base de datos real: registros, rangos de IP por país, chequeos de salud y resolución externa. Se comunica por HTTP. El enunciado pide HTTPS entre el Interceptor y el API, que queda como trabajo pendiente |
| **Health Checker** | **Funciona** | Monitoreo continuo mediante TCP y HTTP/HTTPS con validación de códigos de estado, Basic Auth, reintentos y timeouts. Emite telemetría y latencias desde múltiples regiones geográficas.|
| **DNS UI** | **Funciona** | La interfaz de usuario permite visualizar, consultar y gestionar los registros DNS desde una aplicación web. El usuario puede navegar entre el Dashboard, Registros DNS, Health Checks e IP-to-Country, además de crear, consultar, editar y eliminar configuraciones. También permite consultar el estado de salud de los destinos y visualizar información relacionada con las métricas de latencia RTT. Aplicación web SPA desarrollada con React 18 y Vite, servida mediante Nginx en el puerto 80. Permite administrar los cinco tipos de registros DNS: `single`, `multi`, `weight`, `round-trip` y `geo`. Incluye un Dashboard con estadísticas generales y estados de salud (`Saludable`, `Degradado`, `Fallo`), además de formularios para configurar Health Checks TCP y HTTP con autenticación Basic Auth. El módulo IP-to-Country permite gestionar rangos de direcciones IP mediante notación CIDR y asociarlos con códigos de país. La interfaz también permite consultar el detalle de los registros y las métricas RTT. La comunicación con el DNS API Java se realiza dinámicamente mediante variables de entorno, evitando almacenar credenciales directamente en el código fuente. |
| **Base de datos** | **Funciona** | Esquema relacional completo en Supabase/PostgreSQL. Las vistas de consenso y triggers calculan la mayoría simple de votos y el RTT promedio automáticamente en tiempo real. |

---
# Uso de IA Generativa y Prompts

> Las tareas T-17 a T-23 y T-45 corresponden al DNS API. El trabajo se hizo en sesiones de
> conversación, revisando cada pieza antes de continuar, así que los prompts que siguen son la
> versión consolidada de lo que se pidió en cada tarea y no una transcripción literal. La tarea
> T-24 no aparece porque los endpoints se probaron con Postman durante el desarrollo, pero la
> colección no se exportó como entregable: las pruebas del DNS API están documentadas en la
> sección 5.1 con el comando equivalente para reproducir cada una.

# T-17 — Estructura base de la API REST

## Descripción

Levantar el proyecto Java del DNS API con su servidor HTTP, la configuración por variables de
entorno y el cliente de la base de datos.

## Prompt de creación

Crear un proyecto Maven con Java 21 y Javalin 6 que exponga un servidor HTTP configurable por
variables de entorno (host, puerto y cantidad de hilos). Incluir un cliente para la API REST de
Supabase construido sobre el cliente HTTP del JDK, un formato único de error en JSON para todas las
respuestas fallidas y un endpoint de salud. La aplicación debe validar la configuración y verificar
la conexión con la base de datos antes de abrir el puerto.

## Prompt de corrección / ajuste

Reducir la anidación de paquetes y eliminar las capas intermedias que solo reenviaban llamadas.
Reemplazar el manejador genérico de estado 404 por uno que atienda la excepción de ruta no
encontrada, porque el manejador genérico sobrescribía las respuestas 404 que ya armaban los
controladores. Capturar la excepción base en lugar de la de tiempo de ejecución, para que un cuerpo
JSON malformado devuelva 400 y no 500.

## Resultado esperado

- Proyecto Maven empaquetado en un único archivo `.jar`.
- Configuración completa por variables de entorno, sin valores quemados.
- Arranque que falla de inmediato e indica cuál credencial falta.
- Manejadores de error por tipo de excepción con respuestas JSON uniformes.
- Endpoint `/api/health` operativo.

---

# T-18 — Endpoint `/api/exists`

## Descripción

Responder al DNS Interceptor si un dominio está registrado en el sistema y de qué tipo es.

## Prompt de creación

Implementar `GET /api/exists` recibiendo el parámetro `hostname` y devolviendo si el dominio existe
y su tipo de balanceo. Debe responder con estado 200 aunque el dominio no exista, usando el campo
`exists` en `false`, y considerar únicamente los registros activos.

## Prompt de corrección / ajuste

Normalizar el nombre consultado antes de buscarlo: pasarlo a minúsculas y quitarle el punto final,
porque el protocolo DNS no distingue mayúsculas y las herramientas del sistema envían el nombre
absoluto terminado en punto. Devolver también el nombre ya normalizado en la respuesta y compartir
esa misma regla con el resto de los endpoints.

## Resultado esperado

- Consulta de existencia por nombre de dominio.
- Respuesta 200 tanto si existe como si no.
- Búsqueda insensible a mayúsculas y al punto final.
- Los registros desactivados responden como inexistentes.

---

# T-19 — Cliente UDP/DNS

## Descripción

Enviar un paquete DNS a un servidor externo por UDP y devolver su respuesta.

## Prompt de creación

Implementar un cliente UDP que reciba un paquete DNS ya armado, lo envíe a la dirección y el puerto
configurados, espere la respuesta y la devuelva. La dirección del servidor y el tiempo de espera
deben venir de variables de entorno.

## Prompt de corrección / ajuste

Abramos un socket nuevo por cada consulta en lugar de reutilizar uno compartido, porque UDP no tiene
conexiones y dos resoluciones simultáneas podrían leer la respuesta de la otra. Ampliemos el buffer de
recepción para admitir respuestas con la extensión EDNS0, y recortar el arreglo devuelto al tamaño real recibido.

## Resultado esperado

- Envío y recepción de paquetes DNS por UDP.
- Un socket por consulta, cerrado siempre al terminar.
- Tiempo de espera configurable que evita hilos bloqueados de forma indefinida.
- Respuestas de hasta 4096 bytes, recortadas a su tamaño real.

---

# T-20 — Endpoint `/api/dns_resolver`

## Descripción

Recibir del Interceptor un paquete DNS codificado en BASE64, resolverlo contra un servidor externo y
devolver la respuesta en el mismo formato.

## Prompt de creación

Implementar `POST /api/dns_resolver` que reciba un cuerpo JSON con el paquete DNS en BASE64, lo
decodifique, lo envíe por UDP mediante el cliente de la tarea anterior y devuelva la respuesta
codificada también en BASE64. El API no debe interpretar el contenido del paquete.

## Prompt de corrección / ajuste

Agregar validaciones antes de tocar la red: que venga el campo con los datos, que su contenido sea
BASE64 válido y que el paquete tenga al menos los 12 bytes del encabezado DNS. Diferenciar el fallo
del servidor externo del fallo propio, devolviendo 502 con el código `dns_unreachable` cuando se
agota el tiempo de espera, en lugar de un 500 genérico.

## Resultado esperado

- Transporte de un protocolo no orientado a conexión sobre uno que sí lo está.
- Validación del cuerpo recibido antes de enviar nada por la red.
- Respuesta 400 ante un paquete inválido y 502 ante un servidor externo que no contesta.
- El paquete viaja intacto: el identificador original llega de vuelta al cliente.

---

# T-21 — CRUD de registros DNS

## Descripción

Administrar los registros DNS y sus direcciones IP de destino para los cinco tipos de balanceo.

## Prompt de creación

Implementar el CRUD completo de `/api/records` soportando los tipos `single`, `multi`, `weight`,
`round-trip` y `geo`. Cada registro incluye su TTL, si está activo y la lista de destinos con su IP,
peso, país, estado de salud y latencia promedio. La consulta debe traer el registro y sus destinos
en una sola petición a la base de datos, aprovechando el anidamiento de recursos de la API REST.

## Prompt de corrección / ajuste

Validar según el tipo: una sola IP para `single`, dos o más para `multi`, peso mayor que cero para
`weight` y código de país para `geo`, además de comprobar el formato de toda dirección IPv4.
Al actualizar, comparar los destinos por identificador en vez de borrarlos y volver a insertarlos,
para no perder en cascada la configuración de los chequeos de salud asociados. Recibir el campo de
activación como un tipo que admita nulo, porque con el tipo primitivo un registro creado sin ese
campo nacía desactivado. Reportar la latencia solo cuando alguna instancia la haya medido, y
distinguir el estado desconocido del estado caído cuando la IP nunca ha sido chequeada.

## Resultado esperado

- Alta, consulta, modificación y eliminación de registros DNS.
- Validaciones propias de cada tipo de balanceo.
- Registro y destinos obtenidos en una sola consulta.
- Actualización que conserva los chequeos de salud existentes.
- Dominio duplicado rechazado con estado 409.

---

# T-22 — CRUD de IP-to-Country

## Descripción

Administrar los rangos de direcciones IP asociados a un país y resolver a qué país pertenece una IP.

## Prompt de creación

Implementar el CRUD de `/api/ip-country` y un endpoint de búsqueda que reciba una dirección IPv4 y
devuelva el país, la ciudad y las coordenadas del rango que la contiene. Los rangos se guardan como
números enteros en la base de datos, así que el API debe convertir entre la notación de puntos y su
valor numérico.

## Prompt de corrección / ajuste

Aceptar también la notación CIDR al registrar un rango, calculando la primera y la última dirección
a partir del prefijo. Delegar la búsqueda a la función almacenada en la base de datos en lugar de
traer los rangos al API, y registrar la ruta de búsqueda antes de la ruta con parámetro, porque de
lo contrario la palabra reservada se interpretaba como el identificador de un rango.

## Resultado esperado

- Administración de rangos de IP por país.
- Conversión entre notación de puntos, CIDR y valor numérico.
- Búsqueda resuelta en la base de datos, con índice.
- Respuesta 200 con el país en nulo cuando la IP no cae en ningún rango.

---

# T-23 — Dockerfile del DNS API

## Descripción

Empaquetar el DNS API en una imagen de contenedor lista para el despliegue.

## Prompt de creación

Escribir un Dockerfile de dos etapas: una que compile el proyecto con Maven y el JDK, y otra que
parta de una imagen con solo el entorno de ejecución de Java y copie únicamente el archivo `.jar`
resultante. El contenedor debe exponer el puerto 8080 y recibir toda su configuración por variables
de entorno.

## Prompt de corrección / ajuste

Copiar el archivo de dependencias antes que el código fuente, para que la caché de construcción no
vuelva a descargarlas con cada cambio. Ejecutar el proceso con un usuario sin privilegios, ya que el
puerto 8080 no los requiere, y excluir el archivo de credenciales en el `.dockerignore` para que no
quede incluido en la imagen.

## Resultado esperado

- Imagen final reducida, sin herramientas de compilación.
- Construcción con caché de dependencias.
- Proceso ejecutado con un usuario sin privilegios.
- Credenciales fuera de la imagen, inyectadas al ejecutar.

---

# T-45 — CRUD de health checks

## Descripción

Administrar la configuración de los chequeos de salud que ejecutan los Health Checkers sobre cada IP.

## Prompt de creación

Implementar el CRUD de `/api/health-checks`, donde cada chequeo pertenece a una IP de destino
concreta y define el protocolo (TCP o HTTP), el puerto, el intervalo, el tiempo de espera, los
reintentos y, para HTTP, la ruta, los códigos de estado esperados y la autenticación básica.

## Prompt de corrección / ajuste

Tratar la contraseña de la autenticación básica como un campo de solo escritura: aceptarla al crear,
devolverla siempre en nulo al consultar y, si no viene en una modificación, omitir esa columna en la
actualización para conservar la guardada. Descartar los campos propios de HTTP cuando el chequeo es
TCP, y traducir a un estado 409 la violación de la restricción que permite un solo chequeo por IP.

## Resultado esperado

- Configuración de chequeos TCP y HTTP por dirección IP.
- Un único chequeo por IP, con rechazo 409 del segundo.
- Contraseña nunca expuesta en las respuestas y conservada al editar.
- Campos irrelevantes descartados según el protocolo.

---

# T-33 — Estructura base de la UI

## Descripción

Configurar la aplicación React y su consumo del DNS API.

## Prompt de creación

Inicializar la estructura base de la aplicación React con Vite y React Router. Crear el layout principal, el Navbar responsive, los estilos globales en CSS, el Dashboard inicial y la capa de servicios para consumir los endpoints del DNS API Java.


## Resultado esperado

- Aplicación React estructurada con Vite.
- Navegación mediante React Router.
- Layout principal y Navbar responsive.
- Dashboard inicial y estilos globales.
- Servicios para consumir el DNS API.
- Uso de VITE_API_URL.
- Interfaz visual en español.

---

# T-34 — Gestión de registros DNS

## Descripción

Crear, modificar y eliminar registros DNS de los tipos single, multi, weight, round-trip y geo.

## Prompt de creación

Implementar la pantalla y el modal para crear, listar, editar y eliminar registros DNS soportando los 5 tipos de balanceo: single, multi, weight, round-trip y geo.

## Prompt de corrección / ajuste

Corregir el mapeo de targets en CreateRecordModal.jsx y dnsService.js para asegurar que al enviar registros de tipo single, multi, weight, round-trip y geo el payload cumpla exactamente con el contrato esperado por la API Java, sanitizando campos nulos y formateando latencias (avgRttMs) y pesos.

## Resultado esperado

- Pantalla para administrar registros DNS.
- Creación, listado, edición y eliminación de registros.
- Soporte para los cinco tipos de balanceo.
- Payload compatible con el contrato de la API Java.
- Correcto tratamiento de pesos y latencias.

---

# T-35 — Configuración de Health Checks

## Descripción

Definir desde la interfaz los Health Checks TCP y HTTP/HTTPS con sus parámetros de configuración.

## Prompt de creación

Crear la interfaz gráfica y los servicios para la gestión de monitoreos de salud (Health Checks) en protocolos TCP y HTTP/HTTPS con timeout, reintentos, intervalo, path y basic auth.

## Prompt de corrección / ajuste

Ajustar HealthCheckModal.jsx y healthCheckService.js para parsear correctamente los códigos de estado HTTP esperados (convertir string separado por comas a array de enteros), formatear la estructura de basicAuth ({ username, password }) y validar los rangos numéricos de puerto (1-65535) e intervalo.

## Resultado esperado

- Gestión de Health Checks desde la interfaz.
- Soporte para TCP y HTTP/HTTPS.
- Configuración de timeout, reintentos, intervalo y path.
- Configuración de autenticación básica.
- Conversión correcta de códigos HTTP.
- Validación de puertos entre 1 y 65535.

---

# T-36 — Gestión de IP-to-Country

## Descripción

Crear, modificar y eliminar registros de la base de datos IP-to-Country.

## Prompt de creación

Desarrollar la pantalla y el modal para administrar la tabla de mapeos IP-to-Country permitiendo notación CIDR, código ISO de país y descripción.

## Prompt de corrección / ajuste

Corregir ipCountryService.js para formatear adecuadamente el campo ipRange o notación CIDR desde ipStart e ipEnd, forzar el código ISO de país en mayúsculas (ej. CR, US), y eliminar definitivamente las referencias a 'servicio mock' en los mensajes de carga de la interfaz.

## Resultado esperado

- Pantalla para administrar IP-to-Country.
- Creación, edición y eliminación de registros.
- Soporte para rangos IP mediante CIDR.
- Códigos ISO en mayúsculas.
- Eliminación de referencias a servicios simulados.

---

# T-37 — Dockerfile de la UI

## Descripción

Contenerizar la aplicación React para permitir su ejecución mediante Docker.

## Prompt de creación

Crear el Dockerfile de compilación multi-etapa con Node 18 Alpine en el build y Nginx Alpine en el servidor estático.

## Prompt de corrección / ajuste

Configurar nginx.conf con la directiva 'try_files $uri $uri/ /index.html;' para resolver el enrutamiento de React Router, evitando errores 404 al recargar rutas como /records o /health-checks dentro del contenedor Docker.

## Resultado esperado

- Dockerfile multi-etapa.
- Etapa de compilación con Node.js.
- Servidor estático mediante Nginx.
- Aplicación React ejecutándose dentro de un contenedor.
- Prevención de errores 404 en rutas internas.

---

# T-38 — Orquestación del Stack

## Descripción

Integrar los cinco componentes del proyecto mediante Docker Compose y Helm Charts/Kubernetes.

## Prompt de creación

Orquestar los cinco componentes del proyecto mediante Docker Compose y Helm Charts en Kubernetes.

## Prompt de corrección / ajuste

Corregir en helm/dns-stack/templates/dns-api-deployment.yaml la referencia redundante a ...-secret reemplazándola por el Secret correcto ...-supabase y el helper dns-stack.supabaseEnv, e integrar los 3 checkers GNU C (checker-cr, checker-us, checker-eu) compartiendo las variables de base de datos.

## Resultado esperado

- Orquestación mediante Docker Compose.
- Configuración mediante Helm Charts.
- Despliegue preparado para Kubernetes.
- Corrección de referencias a Secrets.
- Uso del helper dns-stack.supabaseEnv.
- Integración de checker-cr, checker-us y checker-eu.

---

# T-39 — Configuración mediante variables de entorno

## Descripción

Verificar que los componentes del sistema no utilicen valores sensibles o configuraciones quemadas directamente en el código.

## Prompt de creación

Verificar que toda la configuración del sistema se inyecte dinámicamente por variables de entorno.

## Prompt de corrección / ajuste

Auditar el código para eliminar credenciales o URLs hardcodeadas. Configurar _supabase-env.tpl, supabase-secret.yaml y values.yaml en Helm para que SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y VITE_API_URL se inyecten de forma segura mediante secretos.

## Resultado esperado

- Eliminación de credenciales hardcodeadas.
- Eliminación de URLs configuradas directamente.
- Configuración mediante variables de entorno.
- Uso de Secrets en Kubernetes.
- Configuración de SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y VITE_API_URL.

---

# T-40 — Prueba End-to-End

## Descripción

Validar el funcionamiento completo del sistema, incluyendo la resolución DNS mediante el contenedor dns-interceptor.

## Prompt de creación

Validar el flujo end-to-end completo del sistema incluyendo la resolución DNS y la prueba con resolv.conf.

## Prompt de corrección / ajuste

Validar la resolución DNS UDP en el puerto 53 realizando una prueba en un contenedor aislado con /etc/resolv.conf apuntando a la IP del dns-interceptor, comprobando la decodificación BASE64 hacia dns-api, la respuesta dinámica y la visualización de métricas de salud en dns-ui.

## Resultado esperado

- Prueba completa del flujo end-to-end.
- Resolución DNS mediante UDP en el puerto 53.
- Prueba en un contenedor aislado.
- Configuración de /etc/resolv.conf.
- Verificación de la comunicación con dns-interceptor y dns-api.

## 7. Conclusiones

El DNS Interceptor cumple su función principal como punto de entrada del sistema DNS. Está diseñado para recibir consultas UDP, interpretar los elementos esenciales del protocolo DNS y decidir si una consulta puede resolverse localmente o debe delegarse.

El interceptor utiliza tareas asíncronas para procesar múltiples consultas sin bloquear el ciclo principal de recepción UDP. Esto permite atender varias solicitudes de manera concurrente.

La DNS UI permitió centralizar la administración de los registros DNS, el monitoreo de los servidores y la gestión de ubicaciones por IP en una interfaz sencilla. Esto facilita el trabajo del usuario, ya que puede realizar estas tareas desde la aplicación sin depender de comandos o configuraciones manuales.

El uso de Docker facilitó el despliegue de la aplicación y permitió mantener la configuración separada del código. Esto hace que el sistema sea más organizado y sencillo de ejecutar en diferentes entornos.

El DNS API es el punto donde el proyecto demuestra el transporte de un protocolo no orientado a conexión sobre uno que sí lo está. En el endpoint de resolución externa, el paquete DNS viaja codificado en BASE64 dentro de una petición HTTP sobre TCP y vuelve a salir por UDP del otro lado, sin que el API interprete su contenido. Que actúe como túnel y no como intérprete es lo que permite que el identificador original de la consulta regrese intacto y que el cliente acepte la respuesta como si viniera directamente del servidor externo.

Concentrar el acceso a los datos en el DNS API fue determinante para el trabajo en equipo. Como ningún otro componente, salvo los Health Checkers, consulta la base directamente, el Interceptor y la interfaz web dependieron de un contrato HTTP estable y no del esquema de la base de datos. Los cambios de nombres y de columnas se absorbieron dentro del API sin obligar a modificar los demás componentes, lo que permitió que cada persona avanzara en su parte sin bloquear a las otras.

---

## 8. Recomendaciones

Actualmente el interceptor depende del estado de la DNS API por lo que es recomendable agregar un mecanismo de healthcheck para comprobar periódicamente que puede comunicarse con la API.

El interceptor utiliza un buffer de 512 bytes, adecuado para DNS clásico sobre UDP. Para soportar respuestas modernas y registros adicionales, debería evaluarse el uso de paquetes mayores.

Para una implementación en producción, se recomienda configurar HTTPS mediante certificados SSL/TLS. De esta forma, la comunicación entre el navegador y el servidor estará protegida y se reducirá el riesgo de que la información transmitida sea interceptada.

Implementar un sistema de caché en el navegador,  por ejemplo mediante React Query, para evitar consultas repetidas al backend cuando la información no haya cambiado. Esto podría mejorar el tiempo de respuesta y el rendimiento general de la aplicación.

Implementar HTTPS entre el DNS Interceptor y el DNS API, que es la parte del enunciado que quedó pendiente. Lo recomendable es que el API sirva TLS con un certificado propio y que el Interceptor confíe en él, manteniendo el puerto HTTP en paralelo durante la transición para no interrumpir a la interfaz web mientras se migra.

Agregar una caché de respuestas que respete el TTL de cada registro. Hoy cada consulta que el Interceptor resuelve genera dos llamadas al API y, por lo tanto, dos consultas a la base de datos. Guardar el resultado durante el tiempo de vida del registro reduciría la carga sobre la base y el tiempo de respuesta, que es justamente para lo que existe el TTL dentro del protocolo DNS.
