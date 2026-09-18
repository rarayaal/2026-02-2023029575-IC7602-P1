# Reporte Semanal de Avance – Proyecto 1

**Curso:** IC7602

**Proyecto:** 1

**Semana:** 3

**Fecha del reporte:** 17/09/2026


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

El avance de cada tarea se verificó contra el código presente en la rama `main` al 17/09/2026. Las
descripciones completas de cada tarea están en el reporte de la semana 1.

### DNS Interceptor — núcleo (Isaac Rojas)

| ID   | Tarea                             | Estado      | Avance | Problemas |
| ---- | --------------------------------- | ----------- | -----: | --------- |
| T-01 | Servidor UDP/53 concurrente       | Finalizada  |   100% | Ninguno |
| T-02 | Parseo del encabezado DNS         | Finalizada  |   100% | Ninguno |
| T-03 | Clasificación de paquetes         | Finalizada  |   100% | Ninguno |
| T-04 | Extracción del hostname           | Finalizada  |   100% | Ninguno |
| T-05 | Serialización de la respuesta DNS | Finalizada  |   100% | Ninguno |
| T-06 | Delegación al DNS API             | En progreso |    90% | P-05, depende de T-20 |
| T-07 | Dockerfile del DNS Interceptor    | Finalizada  |   100% | Ninguno |
| T-08 | Pruebas con `nslookup`            | En progreso |    50% | Ninguno |

El Interceptor extrae el hostname de la sección Question, construye la respuesta y la envía al
cliente, y delega los paquetes no estándar al DNS API codificados en BASE64. La delegación está
completa del lado del Interceptor y se probó contra un servidor simulado del API; falta probarla
contra el endpoint real `/api/dns_resolver` (T-20).

El componente tiene Dockerfile, un Docker Compose propio y dos scripts de pruebas de integración.
Esos scripts envían paquetes DNS construidos a mano por UDP.

Los defectos de compilación reportados la semana pasada (P-01 y P-02) quedaron corregidos en `main`.

### DNS Interceptor — resolución (Rafael Araya)

| ID   | Tarea                                  | Estado      | Avance | Problemas |
| ---- | -------------------------------------- | ----------- | -----: | --------- |
| T-09 | Consulta de existencia del registro    | En progreso |    80% | P-07 |
| T-10 | Estrategia `single`                    | Finalizada  |   100% | P-07 |
| T-11 | Estrategia `multi`                     | Finalizada  |   100% | P-07 |
| T-12 | Estrategia `weight`                    | Finalizada  |   100% | P-07 |
| T-13 | Estrategia `geo`                       | En progreso |    30% | P-09 |
| T-14 | Estrategia `round-trip`                | En progreso |    60% | P-09 |
| T-15 | Manejo de registro ausente o unhealthy | Finalizada  |   100% | Ninguno |
| T-16 | Simulación para `round-trip`           | Pendiente   |     0% | Ninguno |

El motor de resolución implementa las cinco estrategias y cuenta con cuatro pruebas unitarias.
`single`, `multi` (round-robin) y `weight` (selección aleatoria proporcional al peso) están
completas. Las IPs marcadas como unhealthy se descartan, y si no queda ninguna, o el dominio no
existe, el paquete se delega al DNS API.

Dos estrategias están incompletas: `geo` recibe la IP del cliente pero no la usa, y escoge siempre
una IP al azar; `round-trip` escoge la IP de menor latencia promedio sin tomar en cuenta la
ubicación del cliente. Además, el cliente HTTP espera los campos del JSON en español, por lo que
todavía no puede leer las respuestas del DNS API real (P-07).

### DNS API (Luis Delgado)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-17 | Estructura base de la API REST | Finalizada  |   100% | Ninguno |
| T-18 | Endpoint `/api/exists`         | Finalizada  |   100% | Ninguno |
| T-19 | Cliente UDP/DNS                | Pendiente   |     0% | Ninguno |
| T-20 | Endpoint `/api/dns_resolver`   | Pendiente   |     0% | P-05 |
| T-21 | CRUD de registros DNS          | Finalizada  |    100% | P-11 |
| T-22 | CRUD de IP-to-Country          | Pendiente   |     0% | Ninguno |
| T-23 | Dockerfile del DNS API         | Pendiente   |     0% | P-06 |
| T-24 | Colección de Postman           | Pendiente   |     0% | Ninguno |
| T-45 | CRUD de health checks          | Pendiente   |     0% | P-04 |

El DNS API se conecta ahora a Supabase mediante su API REST y verifica la conexión al arrancar.
`/api/exists` consulta la base real y solo toma en cuenta los registros activos, con lo que T-18
queda finalizada.

`/api/records` implementa listar con filtros por dominio y tipo, consultar, crear, reemplazar y
borrar, con las validaciones de cada tipo de registro definidas en el contrato.

### Health Checker y modelo de datos (Otto Segura)

| ID   | Tarea                           | Estado      | Avance | Problemas |
| ---- | ------------------------------- | ----------- | -----: | --------- |
| T-25 | Esquema de datos                | Finalizada  |   100% | Ninguno |
| T-26 | Lectura de registros            | Finalizada  |   100% | Ninguno |
| T-27 | Health check TCP                | En progreso |    90% | Ninguno |
| T-28 | Health check HTTP               | En progreso |    90% | Ninguno |
| T-29 | Marcado healthy / unhealthy     | En progreso |    40% | P-08 |
| T-30 | Ubicación simulada y round-trip | En progreso |    20% | P-08 |
| T-31 | Carga de IP-to-Country          | Pendiente   |     0% | Ninguno |
| T-32 | Dockerfile del Health Checker   | Pendiente   |     0% | P-06 |

El Health Checker en GNU C lee de Supabase los targets activos con su configuración y ejecuta los
chequeos TCP y HTTP. El chequeo HTTP valida el path, los códigos esperados y el basic auth, y ambos
respetan el timeout y los reintentos configurados y miden el round-trip time.

T-27 y T-28 no llegan al 100% porque todos los chequeos usan un único intervalo global, tomado de
una variable de entorno, en lugar del intervalo configurado para cada health check.

La regla de mayoría simple ya existe en la base de datos desde T-25, pero los resultados de los
chequeos todavía no se guardan en Supabase, de modo que el estado de las IPs nunca cambia y no se
registran latencias (P-08). Tampoco se registra la ubicación simulada de cada instancia aún.

### DNS UI y orquestación (Alexandra De Gracia)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI       | En progreso |    60% | P-10 |
| T-34 | Gestión de registros DNS       | En progreso |    80% | P-10 |
| T-35 | Configuración de health checks | En progreso |    80% | P-10 |
| T-36 | Gestión de IP-to-Country       | En progreso |    80% | P-10 |
| T-37 | Dockerfile de la UI            | Finalizada  |   100% | Ninguno |
| T-38 | Orquestación del stack         | En progreso |    10% | P-06 |
| T-39 | Configuración por variables    | Pendiente   |     0% | Ninguno |
| T-40 | Prueba end-to-end              | Pendiente   |     0% | Ninguno |

La interfaz se adaptó al contrato del DNS API en registros y health checks, y el formulario de
health checks ya incluye todos los parámetros que exige el enunciado: timeout, reintentos,
intervalo, path, códigos esperados y basic auth. La aplicación se construye y se sirve con Nginx
desde su propio contenedor.

### Tareas compartidas

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-41 | Documentación por componente   | En progreso |    20% | Ninguno |
| T-42 | Documento general              | Pendiente   |     0% | Ninguno |
| T-44 | Video de demostración          | Pendiente   |     0% | Ninguno |

El DNS Interceptor ya tiene un README con instrucciones de ejecución.

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período del 11/09/2026 al 17/09/2026. No se incluyen los commits de merge.

| Integrante | Fecha | Commit | Descripción | Archivos principales modificados |
| ---------- | ---------- | --------- | ----------- | -------------------------------- |
| Isaac Rojas | 13/09/2026 | `fae0367` | Extracción del hostname desde la sección Question | `dns-interceptor/src/dns/question.rs`, `dns-interceptor/src/dns/message.rs`, `dns-interceptor/src/dns/header.rs` |
| Isaac Rojas | 16/09/2026 | `abff044` | Serializador de respuestas DNS y envío al cliente | `dns-interceptor/src/dns/response.rs`, `dns-interceptor/src/server.rs`, `dns-interceptor/src/dns/mod.rs` |
| Isaac Rojas | 17/09/2026 | `3a24ddd` | Delegación al DNS API vía BASE64 y servidor simulado del API | `dns-interceptor/src/api_client.rs`, `dns-interceptor/Cargo.toml`, `dns-interceptor/.env.example` |
| Isaac Rojas | 17/09/2026 | `849fd43` | Dockerfile, Docker Compose y pruebas de integración | `dns-interceptor/Dockerfile`, `dns-interceptor/docker-compose.yml`, `dns-interceptor/README.md`, `dns-interceptor/test-integration.ps1` |
| Isaac Rojas | 17/09/2026 | `8830ae2` | Integración de las dos partes del DNS Interceptor | `dns-interceptor/Cargo.toml`, `dns-interceptor/src/api_client.rs`, `dns-interceptor/src/config.rs` |
| Rafael Araya | 16/09/2026 | `2f7a773` | Cliente del DNS API, modelos y motor de resolución con las cinco estrategias | `dns-interceptor/src/api_client.rs`, `dns-interceptor/src/models.rs`, `dns-interceptor/src/resolver.rs`, `dns-interceptor/src/server.rs` |
| Luis Delgado | 17/09/2026 | `3b55f32` | Endpoint de búsqueda de país por IP en el contrato y eliminación de las pruebas automatizadas | `docs/contrato-dns-api.md`, `dns-api/pom.xml`, `dns-api/src/test/` |
| Luis Delgado | 17/09/2026 | `a9f6d8a` | Cliente REST de Supabase en el DNS API | `dns-api/src/main/java/dnsapi/supabase/SupabaseClient.java`, `dns-api/src/main/java/dnsapi/config/ApiConfig.java`, `dns-api/src/main/java/dnsapi/Main.java` |
| Luis Delgado | 17/09/2026 | `1f7dca5` | Repositorio de registros DNS sobre Supabase | `dns-api/src/main/java/dnsapi/records/SupabaseDnsRecordRepository.java`, `dns-api/src/main/java/dnsapi/records/DnsRecord.java`, `dns-api/src/main/java/dnsapi/records/DnsTarget.java` |
| Luis Delgado | 17/09/2026 | `26918ad` | Creación, edición y borrado de registros DNS en Supabase | `dns-api/src/main/java/dnsapi/records/SupabaseDnsRecordRepository.java`, `dns-api/src/main/java/dnsapi/records/DuplicateDomainException.java` |
| Luis Delgado | 17/09/2026 | `6cb6085` | CRUD de registros DNS en `/api/records` | `dns-api/src/main/java/dnsapi/http/RecordsController.java`, `dns-api/src/main/java/dnsapi/http/ApiServer.java` |
| Otto Segura | 17/09/2026 | `462785b` | Estructura del Health Checker, cliente de Supabase y cJSON | `health_checker/src/main.c`, `health_checker/src/supabase_client.c`, `health_checker/include/models.h`, `health_checker/Makefile` |
| Otto Segura | 17/09/2026 | `f66a7c3` | Health check TCP | `health_checker/src/tcp_checker.c`, `health_checker/include/tcp_checker.h`, `health_checker/Makefile` |
| Otto Segura | 17/09/2026 | `3c17655` | Health check HTTP con libcurl y basic auth | `health_checker/src/http_checker.c`, `health_checker/include/http_checker.h`, `health_checker/src/main.c` |
| Alexandra De Gracia | 14/09/2026 | `7bddbf0` | Adaptación de la DNS UI al contrato del DNS API | `dns-ui/src/pages/DnsRecordsPage.jsx`, `dns-ui/src/components/CreateRecordModal.jsx`, `dns-ui/src/services/dnsService.js` |
| Alexandra De Gracia | 15/09/2026 | `a23e4b9` | Pantalla de configuración de health checks | `dns-ui/src/components/HealthCheckModal.jsx`, `dns-ui/src/pages/HealthChecksPage.jsx`, `dns-ui/src/mocks/healthChecks.js` |
| Alexandra De Gracia | 15/09/2026 | `e6c39db` | Dockerfile y configuración de Nginx de la UI | `dns-ui/Dockerfile`, `dns-ui/nginx.conf`, `dns-ui/.dockerignore` |

---

## 4. Pull Requests (PRs)

| Integrante | PR | Descripción | Estado | Tareas relacionadas |
| ---------- | ----- | ----------- | ------ | ------------------- |
| Alexandra De Gracia | PR #6 | Adaptación de la UI al contrato, pantalla de health checks y Dockerfile | Mergeado | T-34, T-35, T-37 |
| Rafael Araya | PR #7 | Cliente del DNS API y motor de resolución con las cinco estrategias | Mergeado | T-09 a T-15 |
| Isaac Rojas | PR #8 | Hostname, serialización de respuestas, delegación al API, Dockerfile y Docker Compose; integra el trabajo del PR #7 | Mergeado | T-04 a T-08 |
| Otto Segura | PR #9 | Health Checker en GNU C con lectura de Supabase y chequeos TCP y HTTP | Mergeado | T-26 a T-28 |
| Luis Delgado | PR #10 | Conexión del DNS API a Supabase y CRUD de registros DNS | Mergeado | T-18, T-21 |

---

## 5. Problemas

### Problemas de la semana anterior

| ID   | Problema | Estado |
| ---- | -------- | ------ |
| P-01 | El DNS Interceptor no compilaba desde `main` | **Resuelto.** `main.rs` y `Cargo.toml` se corrigieron al integrar las dos partes del Interceptor (PR #8) |
| P-02 | `dns_builder.rs` estaba fuera de `src/` | **Resuelto.** El código quedó en `dns-interceptor/src/dns/builder.rs` |
| P-03 | No existía el esquema de datos | **Resuelto.** El DNS API ya lee y escribe en Supabase |
| P-04 | El CRUD de health checks no estaba asignado | Abierto. Asignado al DNS API como T-45, pendiente de implementar |
| P-05 | Falta acordar HTTPS y certificados entre el Interceptor y el API | Abierto. El Interceptor ya soporta HTTPS, pero el DNS API solo sirve HTTP |
| P-06 | No había automatización de instalación | Parcial. El Interceptor y la UI tienen Dockerfile; faltan los del DNS API y el Health Checker, y un Docker Compose o Helm Chart que levante el stack completo |

### Problemas nuevos

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-07 | El cliente HTTP del Interceptor espera los campos del JSON en español (`existe`, `tipo`, `dominio`, `destinos`, entre otros), mientras que el contrato y el DNS API los definen en inglés (`exists`, `type`, `domain`, `targets`). Contra el API real, la lectura de las respuestas falla | T-09 a T-14 | Rafael Araya | Ajustar los modelos del Interceptor a los nombres del contrato mediante atributos de `serde` |
| P-08 | El Health Checker ejecuta los chequeos pero no guarda los resultados en Supabase ni registra la ubicación de su instancia. Sin resultados, la mayoría simple nunca se calcula y no hay latencias para `round-trip` | T-29, T-30, T-14 | Otto Segura | Insertar cada resultado en `health_check_results` y registrar la instancia en `checker_instances` |
| P-09 | La estrategia `geo` no usa la IP del cliente y escoge siempre al azar; `round-trip` no considera la ubicación del cliente | T-13, T-14 | Rafael Araya | Consultar el país del cliente con `GET /api/ip-country/lookup` (T-22) y usar la ubicación de los Health Checkers |
| P-10 | La interfaz sigue operando sobre datos simulados. Además, el formulario de IP-to-Country usa la forma anterior al contrato (`ipRange`, `description`) | T-33 a T-36 | Alexandra De Gracia, Luis Delgado | El CRUD de registros ya está disponible en `/api/records` para empezar la integración; IP-to-Country queda sujeto a T-22 |
| P-11 | La creación, edición y borrado de registros en `/api/records` no se han probado de punta a punta contra la base | T-21 | Luis Delgado | Ejecutar y documentar las pruebas manuales antes de integrar con la UI y el Interceptor |
| P-12 | En macOS el puerto UDP 5353 lo ocupa el servicio del sistema mDNSResponder, lo que provocaba conflictos al levantar el Interceptor localmente o dejaba las peticiones congeladas | T-06, T-09 | Rafael Araya | **Resuelto.** El puerto se configura con la variable `INTERCEPTOR_UDP_PORT`, lo que permite usar uno libre. El valor por omisión sigue siendo 5353, así que en macOS hay que definir la variable |
| P-13 | `reqwest` usa por defecto `native-tls`, que depende de OpenSSL, y la imagen de Docker no incluye `pkg-config` ni `libssl-dev`, por lo que el Interceptor no se construía | T-06 | Isaac Rojas | **Resuelto.** Se cambió `reqwest` a la variante `rustls-tls`, que implementa TLS en Rust sin depender de librerías del sistema |
| P-14 | El healthcheck del Docker Compose usaba `nslookup`, que no viene instalado en la imagen `debian:bookworm-slim`, por lo que el chequeo fallaba | T-07 | Isaac Rojas | **Resuelto.** Se eliminó ese healthcheck |

---

## 6. Resumen de participación individual

| Integrante | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ---------- | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles | 8 | 5 | 1 | Extracción del hostname, serialización y envío de respuestas, delegación al DNS API, Dockerfile, Docker Compose y pruebas de integración. Integró el trabajo de Rafael y corrigió los defectos de compilación |
| Rafael Araya Álvarez | 8 | 1 | 1 | Cliente del DNS API, modelos de datos y motor de resolución con las cinco estrategias y pruebas unitarias |
| Luis Diego Delgado Muñoz | 9 | 5 | 1 | Conexión del DNS API a Supabase, `/api/exists` contra la base real y CRUD de registros DNS con validación por tipo |
| Otto Segura Ruiz | 8 | 3 | 1 | Health Checker en GNU C: lectura de targets desde Supabase y chequeos TCP y HTTP con timeout, reintentos, códigos esperados y basic auth |
| Alexandra De Gracia | 8 | 3 | 1 | Adaptación de la interfaz al contrato, formulario completo de health checks y contenedor de la UI con Nginx |

Las tareas T-41, T-42 y T-44 son responsabilidad compartida y no se contabilizan en la columna de tareas
asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad | Responsable(s) | Resultado esperado |
| ------------ | ----------------- | -------------- | ------------------ |
| P-06         | Dockerfile del DNS API y del Health Checker, y un Docker Compose que levante el stack completo | Luis, Otto, Alexandra | Todo el sistema se levanta con un solo comando |
| P-07         | Ajustar los nombres de campo del Interceptor al contrato | Rafael Araya | El Interceptor lee las respuestas del DNS API real |
| T-19, T-20   | Cliente UDP/DNS y endpoint `/api/dns_resolver` | Luis Delgado | Los paquetes no estándar se resuelven contra un servidor DNS remoto |
| T-21, P-11   | Pruebas de punta a punta del CRUD de registros | Luis Delgado | CRUD verificado contra Supabase |
| T-22, T-45   | CRUD de IP-to-Country, búsqueda por IP y CRUD de health checks | Luis Delgado | Endpoints disponibles para la UI y el Interceptor |
| T-29, T-30   | Guardar resultados y ubicación de las instancias | Otto Segura | Las IPs cambian de estado y hay latencias para `round-trip` |
| T-13, T-14   | Completar `geo` y `round-trip` | Rafael Araya | Ambas estrategias usan la ubicación del cliente |
| T-33 a T-36  | Conectar la interfaz al DNS API | Alexandra De Gracia | La UI deja de usar datos simulados |
| T-08, T-40   | Pruebas con `nslookup` y prueba end-to-end | Isaac Rojas, Alexandra De Gracia | Flujo completo verificado y documentado |
| T-41, T-42, T-44 | Documentación, incluidos los prompts de IA que pide el enunciado, y video | Todos | Entregables completos |

---

## 8. Observaciones

Faltan cinco días para la entrega. Las piezas principales de cada componente ya existen, y el
riesgo mayor está ahora en la integración: el Interceptor todavía no puede leer las respuestas del
DNS API (P-07), el Health Checker no escribe resultados (P-08) y la interfaz no consume el API
(P-10). Los tres dependen de ajustes pequeños frente al contrato de endpoints, que es la referencia
común del grupo.

Lecciones que el grupo recoge de los problemas de la semana:

- **Parametrizar siempre los puertos** con variables de entorno y un valor por omisión razonable,
  en lugar de dejarlos fijos en el código (Rafael Araya).
- **No usar el puerto 5353 para pruebas locales en macOS**, porque el sistema operativo lo reserva
  de forma permanente (Rafael Araya).
- **Usar la imagen `rust:1-slim`** en lugar de una versión fija, para evitar problemas de
  dependencias al construir (Isaac Rojas).
- **No depender de herramientas externas en los healthchecks de Docker**: si no vienen en la imagen,
  el chequeo falla aunque el servicio funcione (Isaac Rojas).
- La adaptación de la interfaz al contrato del DNS API dejó más claro cómo interactúan los
  componentes, lo que facilita la integración y las pruebas de las siguientes etapas (Alexandra De
  Gracia).
