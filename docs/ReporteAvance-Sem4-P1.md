# Reporte Semanal de Avance – Proyecto 1

**Curso:** IC7602

**Proyecto:** 1

**Semana:** 4

**Fecha del reporte:** 24/09/2026


## 1. Integrantes del grupo

| Carné      | Nombre completo          |
| ---------- | ------------------------ |
| 2022104884 | Isaac Rojas Robles       |
| 2023029575 | Rafael Araya Álvarez     |
| 2020030408 | Luis Diego Delgado Muñoz |
| 2020426226 | Otto Segura Ruiz         |
| 2026801601 | Alexandra De Gracia      |

---

## 2. Estado de las tareas

El avance se verificó levantando el sistema completo con Docker y ejecutando el flujo de punta a
punta: `nslookup` contra el DNS Interceptor, resolución por medio del DNS API y consulta a la base
de datos.

### DNS Interceptor — núcleo (Isaac Rojas)

| ID   | Tarea                             | Estado      | Avance | Problemas |
| ---- | --------------------------------- | ----------- | -----: | --------- |
| T-01 | Servidor UDP/53 concurrente       | Finalizada  |   100% | Ninguno |
| T-02 | Parseo del encabezado DNS         | Finalizada  |   100% | Ninguno |
| T-03 | Clasificación de paquetes         | Finalizada  |   100% | Ninguno |
| T-04 | Extracción del hostname           | Finalizada  |   100% | Ninguno |
| T-05 | Serialización de la respuesta DNS | Finalizada  |   100% | Ninguno |
| T-06 | Delegación al DNS API             | Finalizada  |   100% | P-20 |
| T-07 | Dockerfile del DNS Interceptor    | Finalizada  |   100% | Ninguno |
| T-08 | Pruebas con `nslookup`            | En progreso |    80% | Ninguno |

La delegación quedó verificada: al consultar un dominio que no está en la base de datos, el
Interceptor lo codifica en BASE64, se lo envía al DNS API y devuelve al cliente la respuesta que el
API obtuvo del servidor DNS remoto. El README del componente documenta cómo probarlo con `nslookup`
y con `dig`; falta dejar registrados los casos probados y sus resultados, que es lo que pide T-08.

### DNS Interceptor — resolución (Rafael Araya)

| ID   | Tarea                                  | Estado      | Avance | Problemas |
| ---- | -------------------------------------- | ----------- | -----: | --------- |
| T-09 | Consulta de existencia del registro    | Finalizada  |   100% | Ninguno |
| T-10 | Estrategia `single`                    | Finalizada  |   100% | Ninguno |
| T-11 | Estrategia `multi`                     | Finalizada  |   100% | Ninguno |
| T-12 | Estrategia `weight`                    | Finalizada  |   100% | Ninguno |
| T-13 | Estrategia `geo`                       | Finalizada  |   100% | P-15 |
| T-14 | Estrategia `round-trip`                | En progreso |    70% | P-21 |
| T-15 | Manejo de registro ausente o unhealthy | Finalizada  |   100% | Ninguno |
| T-16 | Simulación para `round-trip`           | Finalizada  |   100% | Ninguno |

Los modelos del Interceptor se ajustaron a los nombres del contrato, con lo que la integración con
el DNS API real quedó funcionando y se cerró el problema P-07 del reporte anterior.

La estrategia `geo` ya resuelve por país: consulta `GET /api/ip-country/lookup` con la IP de origen
del cliente y devuelve la IP asignada a ese país, o una aleatoria si no hay coincidencia. Esa
conexión estaba escrita pero no se estaba usando; se corrigió esta semana (P-15).

`round-trip` selecciona la IP con menor latencia promedio medida, pero todavía no toma en cuenta la
cercanía geográfica entre el cliente y cada Health Checker, que es lo que pide el enunciado (P-21).
La simulación de latencias sí quedó resuelta: cada instancia del Health Checker aplica una
penalización configurable, de modo que la misma IP reporta tiempos distintos según desde dónde se
mida.

### DNS API (Luis Delgado)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-17 | Estructura base de la API REST | Finalizada  |   100% | Ninguno |
| T-18 | Endpoint `/api/exists`         | Finalizada  |   100% | Ninguno |
| T-19 | Cliente UDP/DNS                | Finalizada  |   100% | Ninguno |
| T-20 | Endpoint `/api/dns_resolver`   | Finalizada  |   100% | P-20 |
| T-21 | CRUD de registros DNS          | Finalizada  |   100% | Ninguno |
| T-22 | CRUD de IP-to-Country          | Finalizada  |   100% | Ninguno |
| T-23 | Dockerfile del DNS API         | Finalizada  |   100% | Ninguno |
| T-24 | Colección de Postman           | Pendiente   |     0% | Ninguno |
| T-45 | CRUD de health checks          | Finalizada  |   100% | Ninguno |

El DNS API quedó completo salvo la colección de Postman. Expone `/api/health`, `/api/exists`,
`/api/records`, `/api/ip-country` con su búsqueda por IP, `/api/health-checks` y
`/api/dns_resolver`, todos contra Supabase por medio de su API REST.

El cliente UDP abre un socket por consulta, de modo que varias resoluciones simultáneas no se
mezclen entre sí, y la dirección del servidor DNS remoto se recibe por variable de entorno. Se probó
resolviendo dominios reales contra 8.8.8.8 desde dentro del contenedor.

Todas las operaciones de escritura se verificaron manualmente contra la base de datos: crear,
consultar, filtrar, modificar y borrar registros, rangos de IP y health checks, junto con sus casos
de error (dominio duplicado, IP inválida, protocolo desconocido, puerto fuera de rango, BASE64
inválido y servidor DNS que no responde).

### Health Checker y modelo de datos (Otto Segura)

| ID   | Tarea                           | Estado      | Avance | Problemas |
| ---- | ------------------------------- | ----------- | -----: | --------- |
| T-25 | Esquema de datos                | Finalizada  |   100% | Ninguno |
| T-26 | Lectura de registros            | Finalizada  |   100% | Ninguno |
| T-27 | Health check TCP                | En progreso |    90% | Ninguno |
| T-28 | Health check HTTP               | En progreso |    90% | Ninguno |
| T-29 | Marcado healthy / unhealthy     | Finalizada  |   100% | P-16, P-17 |
| T-30 | Ubicación simulada y round-trip | Finalizada  |   100% | P-16, P-17 |
| T-31 | Carga de IP-to-Country          | Finalizada  |   100% | P-22 |
| T-32 | Dockerfile del Health Checker   | Finalizada  |   100% | Ninguno |

El Health Checker ya cierra el ciclo completo: registra su instancia con país, ciudad y coordenadas,
ejecuta los chequeos, mide el round-trip time y guarda cada resultado en Supabase, donde la regla de
mayoría simple actualiza el estado de la IP. Con eso se cerró el problema P-08 del reporte anterior.

T-27 y T-28 siguen sin llegar al 100% porque todos los chequeos comparten un intervalo global
tomado de una variable de entorno, en lugar del intervalo configurado para cada health check.

La tabla IP-to-Country se carga con una migración de datos que incluye rangos de varios países con
sus coordenadas.

### DNS UI y orquestación (Alexandra De Gracia)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI       | Finalizada  |   100% | Ninguno |
| T-34 | Gestión de registros DNS       | Finalizada  |   100% | Ninguno |
| T-35 | Configuración de health checks | Finalizada  |   100% | Ninguno |
| T-36 | Gestión de IP-to-Country       | Finalizada  |   100% | Ninguno |
| T-37 | Dockerfile de la UI            | Finalizada  |   100% | Ninguno |
| T-38 | Orquestación del stack         | En progreso |    70% | P-18, P-19 |
| T-39 | Configuración por variables    | En progreso |    80% | Ninguno |
| T-40 | Prueba end-to-end              | En progreso |    60% | Ninguno |

La interfaz dejó de usar datos simulados: los tres servicios consumen el DNS API. Se sirve con Nginx
desde su contenedor y el propio Nginx hace de intermediario entre el navegador y el API, con lo que
se resolvió de raíz el problema de CORS que estaba anotado.

El Docker Compose levanta el sistema completo con un solo comando, después de las correcciones
descritas en P-18. Los Helm Charts quedan a medio camino (P-19).

La prueba end-to-end se ejecutó y quedó verificada esta semana, pero falta documentarla con sus
pasos, que es el entregable de T-40.

### Tareas compartidas

| ID   | Tarea                        | Estado      | Avance | Problemas |
| ---- | ---------------------------- | ----------- | -----: | --------- |
| T-41 | Documentación por componente | En progreso |    40% | Ninguno |
| T-42 | Documento general            | Pendiente   |     0% | Ninguno |
| T-44 | Video de demostración        | Pendiente   |     0% | Ninguno |

El DNS Interceptor tiene su README con instrucciones de ejecución y pruebas. El DNS API cuenta con
el contrato de endpoints pero todavía no con instrucciones de instalación. Faltan las de los demás
componentes y el documento general, que debe incluir los diagramas, la tabla de qué funciona y qué
no, y las diez conclusiones y diez recomendaciones.

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período del 18/09/2026 al 24/09/2026. No se incluyen los commits de merge.

| Integrante | Fecha | Commit | Descripción | Archivos principales modificados |
| ---------- | ---------- | --------- | ----------- | -------------------------------- |
| Isaac Rojas | 24/09/2026 | `226dc96` | Integración del DNS Interceptor con el API | `dns-interceptor/src/resolver.rs`, `dns-interceptor/src/config.rs`, `dns-interceptor/README.md` |
| Rafael Araya | 24/09/2026 | `e7b4cf8` | Corrección de errores en el motor de resolución | `dns-interceptor/src/models.rs`, `dns-interceptor/src/resolver.rs`, `dns-interceptor/src/server.rs` |
| Luis Delgado | 22/09/2026 | `5a945ba` | Cliente UDP hacia el servidor DNS remoto | `dns-api/src/main/java/dnsapi/dns/UdpDnsClient.java`, `dns-api/src/main/java/dnsapi/config/ApiConfig.java`, `dns-api/.env.example` |
| Luis Delgado | 22/09/2026 | `da95c31` | Endpoint `/api/dns_resolver` | `dns-api/src/main/java/dnsapi/http/DnsResolverController.java`, `dns-api/src/main/java/dnsapi/http/ApiServer.java`, `dns-api/src/main/java/dnsapi/Main.java` |
| Luis Delgado | 22/09/2026 | `d54a76f` | Dockerfile del DNS API | `dns-api/Dockerfile`, `dns-api/.dockerignore` |
| Luis Delgado | 22/09/2026 | `b624388` | Integración del DNS API al Docker Compose | `docker-compose.yml` |
| Luis Delgado | 22/09/2026 | `98c7fed` | Repositorio de IP-to-Country sobre Supabase | `dns-api/src/main/java/dnsapi/ipcountry/SupabaseIpCountryRepository.java`, `dns-api/src/main/java/dnsapi/ipcountry/Ipv4.java`, `dns-api/src/main/java/dnsapi/ipcountry/IpRange.java` |
| Luis Delgado | 22/09/2026 | `6672718` | Endpoints de IP-to-Country y búsqueda por IP | `dns-api/src/main/java/dnsapi/http/IpCountryController.java`, `dns-api/src/main/java/dnsapi/http/InvalidRequestException.java`, `dns-api/src/main/java/dnsapi/http/RecordsController.java` |
| Luis Delgado | 22/09/2026 | `8375591` | Ciudad y coordenadas en la búsqueda por IP | `docs/contrato-dns-api.md` |
| Luis Delgado | 22/09/2026 | `4f4d5b9` | Repositorio de health checks sobre Supabase | `dns-api/src/main/java/dnsapi/healthchecks/SupabaseHealthCheckRepository.java`, `dns-api/src/main/java/dnsapi/healthchecks/HealthCheck.java`, `dns-api/src/main/java/dnsapi/healthchecks/BasicAuth.java` |
| Luis Delgado | 22/09/2026 | `8d98252` | Endpoints de health checks | `dns-api/src/main/java/dnsapi/http/HealthChecksController.java`, `dns-api/src/main/java/dnsapi/http/ApiServer.java`, `dns-api/src/main/java/dnsapi/Main.java` |
| Luis Delgado | 22/09/2026 | `ae39f3c` | Empaquetado del reporte de la semana 3 | `docs/ReporteAvance-Sem3-P1.zip` |
| Luis Delgado | 24/09/2026 | `3535ae4` | Corrección del servicio dns-api en el Docker Compose | `docker-compose.yml` |
| Otto Segura | 19/09/2026 | `2ca4bf6` | Latido de la instancia y consenso en Supabase | `health_checker/src/supabase_client.c`, `health_checker/include/supabase_client.h`, `database/migrations/09_consensus_refinement.sql` |
| Otto Segura | 24/09/2026 | `2fb0949` | Round-trip de alta resolución y penalización simulada | `health_checker/src/main.c`, `health_checker/src/http_checker.c`, `health_checker/include/supabase_client.h` |
| Otto Segura | 24/09/2026 | `fb20111` | Carga inicial de IP-to-Country y contenedor del Health Checker | `database/migrations/10_seed_ip_to_country.sql`, `health_checker/Dockerfile`, `health_checker/docker-compose.checkers.yml` |
| Alexandra De Gracia | 20/09/2026 | `8bd873b` | Integración del Interceptor y la base en Docker Compose | `docker-compose.yml`, `database/migrations/*.sql` |
| Alexandra De Gracia | 20/09/2026 | `f52f76b` | Orquestación con Docker Compose y Helm Charts | `docker-compose.yml`, `helm/dns-stack/Chart.yaml`, `helm/dns-stack/values.yaml` |
| Alexandra De Gracia | 24/09/2026 | `54a628e` | Consumo del DNS API desde la interfaz y contenedores | `dns-ui/src/services/*.js`, `dns-ui/nginx.conf`, `dns-ui/.env.example` |

---

## 4. Pull Requests (PRs)

| Integrante | PR | Descripción | Estado | Tareas relacionadas |
| ---------- | ----- | ----------- | ------ | ------------------- |
| Alexandra De Gracia | PR #11 | Orquestación con Docker Compose y Helm Charts | Mergeado | T-38 |
| Luis Delgado | PR #12 | Cliente UDP, `/api/dns_resolver`, IP-to-Country, health checks y Dockerfile del API | Mergeado | T-19 a T-23, T-45 |
| Isaac Rojas | PR #13 | Integración del DNS Interceptor con el DNS API | Mergeado | T-06 |
| Alexandra De Gracia | PR #14 | Consumo del DNS API desde la interfaz y contenedor de la UI | Mergeado | T-33 a T-37, T-39 |
| Otto Segura | PR #15 | Consenso, round-trip de alta resolución, carga de IP-to-Country y contenedor | Mergeado | T-29 a T-32 |
| Rafael Araya | PR #16 | Ajuste de los modelos al contrato y correcciones del motor de resolución | Mergeado | T-09 a T-14 |

---

## 5. Problemas

### Problemas de la semana anterior

| ID   | Problema | Estado |
| ---- | -------- | ------ |
| P-04 | El CRUD de health checks no estaba asignado | **Resuelto.** Implementado en el DNS API como T-45 |
| P-05 | Falta acordar HTTPS entre el Interceptor y el API | Abierto, ver P-20 |
| P-06 | No había automatización de instalación | **Resuelto.** El stack completo se levanta con `docker compose up -d --build` |
| P-07 | El Interceptor esperaba los campos del JSON en español | **Resuelto.** Los modelos se ajustaron a los nombres del contrato |
| P-08 | El Health Checker no guardaba los resultados | **Resuelto.** Registra la instancia y escribe cada resultado en Supabase |
| P-09 | Las estrategias `geo` y `round-trip` estaban incompletas | Parcial. `geo` quedó resuelta; `round-trip` sigue pendiente, ver P-21 |
| P-10 | La interfaz operaba sobre datos simulados | **Resuelto.** Consume el DNS API y Nginx hace de intermediario, con lo que tampoco hace falta CORS |
| P-11 | El CRUD de registros no estaba probado de punta a punta | **Resuelto.** Verificado contra la base de datos, incluidos los casos de error |

### Problemas nuevos

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-15 | El DNS Interceptor no compilaba: `server.rs` llamaba al motor de resolución con dos argumentos después de que se le agregara el país del cliente. Además, la consulta de país al DNS API estaba implementada pero marcada como código muerto, por lo que `geo` escogía siempre al azar | T-13, T-06 | Isaac Rojas, Rafael Araya | **Resuelto.** Se corrigió la llamada y se conectó la consulta de país, con lo que `geo` pasó a resolver correctamente |
| P-16 | El Health Checker no compilaba dentro de su contenedor: el Makefile usa `-std=c11 -pedantic`, que esconde `CLOCK_MONOTONIC` por ser una función de POSIX y no del C estándar | T-27 a T-30 | Otto Segura | **Resuelto.** Se agregó `-D_POSIX_C_SOURCE=200809L` a las banderas de compilación |
| P-17 | El contenedor del Health Checker se ejecutaba sin mostrar ningún log: en C la salida hacia una tubería se almacena en un buffer, de modo que los mensajes no llegaban a `docker logs` | T-29, T-44 | Otto Segura | **Resuelto.** Se configuró la salida línea por línea. Era necesario para poder demostrar el componente en el video |
| P-18 | El Docker Compose no levantaba: el servicio del DNS API dependía de un servicio inexistente y sus credenciales se interpolaban desde el entorno del shell, no desde el archivo donde están | T-38 | Alexandra De Gracia | **Resuelto.** Se corrigió la definición, se integraron las tres instancias del Health Checker y se quitó el PostgreSQL local, al que ningún componente se conecta |
| P-19 | Los Helm Charts están incompletos: el despliegue del DNS API no define las credenciales de Supabase, y quedaron plantillas de PostgreSQL y PostgREST a medio camino | T-38 | Alexandra De Gracia | Completar las plantillas o recortarlas a los componentes que sí se despliegan |
| P-20 | El enunciado pide que la comunicación entre el Interceptor y el API sea por HTTPS; hoy es HTTP. El Interceptor ya soporta HTTPS, pero el API no sirve TLS | T-06, T-20 | Isaac Rojas, Luis Delgado | Definir si se generan certificados propios o se documenta la limitación |
| P-21 | La estrategia `round-trip` escoge la IP con menor latencia promedio sin considerar la cercanía geográfica entre el cliente y cada Health Checker | T-14 | Rafael Araya | Combinar la ubicación del cliente, que ya devuelve `/api/ip-country/lookup`, con las coordenadas de cada instancia |
| P-22 | El repositorio contiene un script en Python (`database/verify_ip_country.py`), y el enunciado prohíbe explícitamente el uso de ese lenguaje. Ningún componente lo utiliza | T-31 | Otto Segura | Eliminarlo del repositorio antes de la entrega |

---

## 6. Resumen de participación individual

| Integrante | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ---------- | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles | 8 | 1 | 1 | Integración del Interceptor con el DNS API y documentación del componente |
| Rafael Araya Álvarez | 8 | 1 | 1 | Ajuste de los modelos al contrato del API y correcciones del motor de resolución |
| Luis Diego Delgado Muñoz | 9 | 11 | 1 | Cliente UDP/DNS, `/api/dns_resolver`, CRUD de IP-to-Country con búsqueda por IP, CRUD de health checks, Dockerfile del API e integración al Docker Compose |
| Otto Segura Ruiz | 8 | 3 | 1 | Registro de instancias y consenso en Supabase, round-trip de alta resolución con penalización simulada, carga de IP-to-Country y contenedor del Health Checker |
| Alexandra De Gracia | 8 | 3 | 2 | Consumo del DNS API desde la interfaz, contenedor con Nginx y orquestación del stack con Docker Compose y Helm |

Las tareas T-41, T-42 y T-44 son responsabilidad compartida y no se contabilizan en la columna de
tareas asignadas.

---

## 7. Plan para los días restantes

La entrega es el 28/09/2026.

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| T-41, T-42   | Documentación de cada componente y documento general, con diagramas, tabla de funcionalidad y las diez conclusiones y diez recomendaciones | Todos | Documentación completa, que el enunciado exige para no calificar con cero |
| T-24         | Colección de Postman del DNS API | Luis Delgado | Colección exportada como evidencia de las pruebas |
| T-40, T-08   | Documentar la prueba end-to-end y los casos probados con `nslookup` | Alexandra De Gracia, Isaac Rojas | Pruebas reproducibles paso a paso |
| T-14, P-21   | Completar `round-trip` con la ubicación del cliente | Rafael Araya | La IP escogida depende de la cercanía al cliente |
| P-19         | Completar o recortar los Helm Charts | Alexandra De Gracia | El despliegue en Kubernetes funciona o se documenta su alcance |
| P-20         | Resolver el HTTPS entre el Interceptor y el API | Isaac Rojas, Luis Delgado | Comunicación cifrada o limitación documentada |
| P-22         | Eliminar el script en Python | Otto Segura | El repositorio no contiene código en un lenguaje prohibido |
| T-44         | Grabar el video de demostración | Todos | Video de máximo diez minutos con una sección por integrante |

---

## 8. Observaciones

El sistema completo quedó funcionando de punta a punta. Con `docker compose up -d --build` se
levantan seis contenedores —el DNS API, el DNS Interceptor, las tres instancias del Health Checker y
la interfaz web— y el flujo se verificó así: se creó un registro por medio del API, se consultó con
`nslookup` contra el Interceptor y este devolvió la IP almacenada, aplicando la estrategia
configurada. También se comprobó el otro camino: un dominio que no está en la base se delega al API,
que lo resuelve contra un servidor DNS remoto y devuelve la respuesta al cliente.

Esa verificación destapó tres defectos que impedían construir el proyecto (P-15, P-16 y P-18) y uno
que impedía demostrarlo (P-17). Los cuatro se corrigieron durante la semana. Vale la pena notar que
los tres primeros no se detectaban trabajando en cada componente por separado: aparecieron solo al
integrar y levantar todo junto, que es la razón por la que conviene hacerlo antes del último día.

Lo que queda es principalmente documentación: el enunciado califica con cero si no se entrega, y hoy
es lo más atrasado del proyecto frente al código.
