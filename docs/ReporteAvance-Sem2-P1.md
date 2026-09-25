# Reporte Semanal de Avance – Proyecto 1

**Curso:** IC7602

**Proyecto:** 1

**Semana:** 2

**Fecha del reporte:** 10/09/2026


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

Las descripciones completas de cada tarea están en el reporte de la semana 1.

### DNS Interceptor — núcleo (Isaac Rojas)

| ID   | Tarea                             | Estado      | Avance | Problemas |
| ---- | --------------------------------- | ----------- | -----: | --------- |
| T-01 | Servidor UDP/53 concurrente       | Finalizada  |   100% | Ninguno |
| T-02 | Parseo del encabezado DNS         | Finalizada  |   100% | Ninguno |
| T-03 | Clasificación de paquetes         | Finalizada  |   100% | Ninguno |
| T-04 | Extracción del hostname           | Pendiente   |     0% | Ninguno |
| T-05 | Serialización de la respuesta DNS | En progreso |    20% | P-02 |
| T-06 | Delegación al DNS API             | Pendiente   |     0% | Depende de T-20 |
| T-07 | Dockerfile del DNS Interceptor    | Pendiente   |     0% | P-08 |
| T-08 | Pruebas con `nslookup`            | Pendiente   |     0% | Depende de T-05 |

### DNS Interceptor — resolución (Rafael Araya)

| ID   | Tarea                                  | Estado      | Avance | Problemas |
| ---- | -------------------------------------- | ----------- | -----: | --------- |
| T-09 | Consulta de existencia del registro    | Pendiente   |     0% | Desbloqueada: `/api/exists` ya está disponible |
| T-10 | Estrategia `single`                    | Pendiente   |     0% | Ninguno |
| T-11 | Estrategia `multi`                     | Pendiente   |     0% | Ninguno |
| T-12 | Estrategia `weight`                    | Pendiente   |     0% | Ninguno |
| T-13 | Estrategia `geo`                       | Pendiente   |     0% | Ninguno |
| T-14 | Estrategia `round-trip`                | Pendiente   |     0% | Depende de T-30 |
| T-15 | Manejo de registro ausente o unhealthy | Pendiente   |     0% | Ninguno |
| T-16 | Simulación para `round-trip`           | Pendiente   |     0% | Ninguno |

Durante la semana se trabajó en la construcción de respuestas DNS (`dns_builder.rs`), que
corresponde a T-05. Ver P-01 y P-02.

### DNS API (Luis Delgado)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-17 | Estructura base de la API REST | Finalizada  |   100% | Ninguno |
| T-18 | Endpoint `/api/exists`         | En progreso |    80% | P-03 |
| T-19 | Cliente UDP/DNS                | Pendiente   |     0% | Ninguno |
| T-20 | Endpoint `/api/dns_resolver`   | Pendiente   |     0% | P-06 |
| T-21 | CRUD de registros DNS          | Pendiente   |     0% | Ninguno |
| T-22 | CRUD de IP-to-Country          | Pendiente   |     0% | Ninguno |
| T-23 | Dockerfile del DNS API         | Pendiente   |     0% | P-08 |
| T-24 | Colección de Postman           | Pendiente   |     0% | Ninguno |
| T-45 | CRUD de health checks          | Pendiente   |     0% | P-04 |

El endpoint `/api/exists` está implementado, probado y documentado, pero resuelve contra un
repositorio en memoria y no contra la base de datos.

### Health Checker y modelo de datos (Otto Segura)

| ID   | Tarea                           | Estado      | Avance | Problemas |
| ---- | ------------------------------- | ----------- | -----: | --------- |
| T-25 | Esquema de datos                | Finalizada  |   100% | Ninguno |
| T-26 | Lectura de registros            | Pendiente   |     0% | Ninguno |
| T-27 | Health check TCP                | Pendiente   |     0% | Ninguno |
| T-28 | Health check HTTP               | Pendiente   |     0% | Ninguno |
| T-29 | Marcado healthy / unhealthy     | Pendiente   |     0% | Ninguno |
| T-30 | Ubicación simulada y round-trip | Pendiente   |     0% | Ninguno |
| T-31 | Carga de IP-to-Country          | Pendiente   |     0% | Ninguno |
| T-32 | Dockerfile del Health Checker   | Pendiente   |     0% | Ninguno |


### DNS UI y orquestación (Alexandra De Gracia)

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-33 | Estructura base de la UI       | En progreso |    60% | P-05 |
| T-34 | Gestión de registros DNS       | En progreso |    80% | P-05 |
| T-35 | Configuración de health checks | En progreso |    60% | P-05 |
| T-36 | Gestión de IP-to-Country       | En progreso |    80% | P-05 |
| T-37 | Dockerfile de la UI            | Pendiente   |     0% | P-08 |
| T-38 | Orquestación del stack         | Pendiente   |     0% | P-08 |
| T-39 | Configuración por variables    | Pendiente   |     0% | P-08 |
| T-40 | Prueba end-to-end              | Pendiente   |     0% | Ninguno |

### Tareas compartidas

| ID   | Tarea                          | Estado      | Avance | Problemas |
| ---- | ------------------------------ | ----------- | -----: | --------- |
| T-41 | Documentación por componente   | En progreso |    10% | Ninguno |
| T-42 | Documento general              | Pendiente   |     0% | Ninguno |
| T-43 | Documentación de prompts de IA | Pendiente   |     0% | Ninguno |
| T-44 | Video de demostración          | Pendiente   |     0% | Ninguno |

Los únicos documentos en el repositorio son el contrato del DNS API y una nota de validación de la
interfaz.

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Período del 04/09/2026 al 10/09/2026. No se incluyen los commits de merge.

| Integrante | Fecha | Commit | Descripción | Archivos principales modificados |
| ---------- | ---------- | --------- | ----------- | -------------------------------- |
| Isaac Rojas | 08/09/2026 | `238d21e` | Servidor UDP asíncrono del DNS Interceptor | `dns-interceptor/Cargo.toml`, `dns-interceptor/.env.example`, `dns-interceptor/.gitignore` |
| Isaac Rojas | 10/09/2026 | `6b85635` | Parseo del header DNS y clasificación de paquetes | `dns-interceptor/src/dns/header.rs`, `dns-interceptor/src/dns/message.rs`, `dns-interceptor/src/dns/mod.rs` |
| Rafael Araya | 07/09/2026 | `ecb04a4` | README y .gitignore iniciales | `README.md`, `.gitignore` |
| Rafael Araya | 10/09/2026 | `10c9dd7` | Archivo .env.example del repositorio | `.env.example`, `.gitignore` |
| Rafael Araya | 10/09/2026 | `8672308` | Actualización del .gitignore | `.gitignore` |
| Rafael Araya | 10/09/2026 | `a616f53` | Construcción de respuestas DNS en `dns_builder.rs` | `dns-interceptor/dns_builder.rs`, `dns-interceptor/Cargo.toml`, `dns-interceptor/src/main.rs` |
| Luis Delgado | 09/09/2026 | `1912247` | Reporte de avance de la semana 1 | `docs/ReporteAvance-Sem1-P1.md`, `docs/ReporteAvance-Sem1-P1.pdf` |
| Luis Delgado | 09/09/2026 | `aa7b898` | Inicialización del proyecto Maven del DNS API | `dns-api/pom.xml`, `dns-api/.gitignore`, `dns-api/src/main/resources/simplelogger.properties` |
| Luis Delgado | 09/09/2026 | `422ba04` | Configuración del DNS API por variables de entorno | `dns-api/src/main/java/dnsapi/config/ApiConfig.java`, `dns-api/src/main/java/dnsapi/config/ConfigurationException.java`, `dns-api/.env.example` |
| Luis Delgado | 09/09/2026 | `f0cbb5f` | Servidor HTTP del DNS API con `/api/health` | `dns-api/src/main/java/dnsapi/http/ApiServer.java`, `dns-api/src/main/java/dnsapi/Main.java`, `dns-api/src/main/java/dnsapi/http/ErrorResponse.java` |
| Luis Delgado | 10/09/2026 | `5eabc57` | Contrato de endpoints del DNS API | `docs/contrato-dns-api.md` |
| Luis Delgado | 10/09/2026 | `a387605` | Modelo de tipos de registro y repositorio DNS | `dns-api/src/main/java/dnsapi/records/RecordType.java`, `dns-api/src/main/java/dnsapi/records/DnsRecordRepository.java`, `dns-api/src/main/java/dnsapi/records/InMemoryDnsRecordRepository.java` |
| Luis Delgado | 10/09/2026 | `3697e90` | Endpoint `/api/exists` del DNS API | `dns-api/src/main/java/dnsapi/http/ExistsController.java`, `dns-api/src/main/java/dnsapi/http/ApiServer.java`, `dns-api/src/main/java/dnsapi/Main.java` |
| Luis Delgado | 10/09/2026 | `73c98c4` | Documentación de la normalización de hostname | `docs/contrato-dns-api.md` |
| Luis Delgado | 10/09/2026 | `8b8957c` | Documentación de la normalización de hostname (duplicado, ver P-07) | `docs/contrato-dns-api.md` |
| Luis Delgado | 10/09/2026 | `b1fa64b` | Alineación del contrato con el esquema de datos | `docs/contrato-dns-api.md` |
| Otto Segura | 10/09/2026 | `484840b` | Esquema de base de datos: registros, health checks y telemetría | `database/migrations/01_extensions_and_enums.sql` a `08_ip_to_country.sql`, `database/supabase_schema.sql` |
| Alexandra De Gracia | 10/09/2026 | `bc4d350` | Inicialización de la aplicación React | `dns-ui/package.json`, `dns-ui/index.html`, `dns-ui/public/favicon.svg` |
| Alexandra De Gracia | 10/09/2026 | `bcc832b` | Layout y enrutamiento de la aplicación | `dns-ui/src/App.jsx`, `dns-ui/src/components/Navbar.jsx`, `dns-ui/src/index.css` |
| Alexandra De Gracia | 10/09/2026 | `b342988` | Servicio DNS simulado | `dns-ui/src/mocks/dnsRecords.js`, `dns-ui/src/services/dnsService.js` |
| Alexandra De Gracia | 10/09/2026 | `862f7a4` | Listado de registros DNS | `dns-ui/src/pages/DnsRecordsPage.jsx`, `dns-ui/src/index.css` |
| Alexandra De Gracia | 10/09/2026 | `e98a44e` | Dashboard de la aplicación | `dns-ui/src/pages/DashboardPage.jsx`, `dns-ui/src/index.css` |
| Alexandra De Gracia | 10/09/2026 | `41b274b` | Actualización del dashboard | `dns-ui/src/pages/DashboardPage.jsx` |
| Alexandra De Gracia | 10/09/2026 | `a27bbbe` | Gestión de registros DNS | `dns-ui/src/components/CreateRecordModal.jsx`, `dns-ui/src/pages/DnsRecordsPage.jsx` |
| Alexandra De Gracia | 10/09/2026 | `e143f03` | Formulario de creación de registros DNS | `dns-ui/src/components/CreateRecordModal.jsx`, `dns-ui/src/pages/DnsRecordsPage.jsx` |
| Alexandra De Gracia | 10/09/2026 | `6df43bb` | Eliminación de registros DNS | `dns-ui/src/pages/DnsRecordsPage.jsx` |
| Alexandra De Gracia | 10/09/2026 | `2d6ca55` | Validación del CRUD completo de registros DNS | `dns-ui/T34_VALIDACION.md` |
| Alexandra De Gracia | 10/09/2026 | `32b578d` | Actualización de interfaz y servicio DNS | `dns-ui/src/services/dnsService.js`, `dns-ui/src/index.css` |
| Alexandra De Gracia | 10/09/2026 | `2655027` | Corrección de ejecución del proyecto e interfaz | `dns-ui/src/components/HealthCheckModal.jsx`, `dns-ui/src/components/IpCountryModal.jsx`, `dns-ui/src/mocks/healthChecks.js` |

---

## 4. Pull Requests (PRs)

Los cinco integrantes crearon Pull Request durante este período y los cinco fueron aprobados y
mergeados a `main`.

| Integrante | PR | Descripción | Estado | Tareas relacionadas |
| ---------- | ----- | ----------- | ------ | ------------------- |
| Isaac Rojas | PR #1 | Servidor UDP/53 y parseo del encabezado DNS del Interceptor | Mergeado | T-01, T-02 |
| Alexandra De Gracia | PR #2 | Aplicación React con dashboard y gestión de registros DNS sobre datos simulados | Mergeado | T-33, T-34 |
| Otto Segura | PR #3 | Esquema completo de base de datos en Supabase, con migraciones y vistas de consenso | Mergeado | T-25 |
| Luis Delgado | PR #4 | Estructura base del DNS API, endpoint `/api/exists` y contrato de endpoints | Mergeado | T-17, T-18 |
| Rafael Araya | PR #5 | Construcción de respuestas DNS en `dns_builder.rs` | Mergeado | T-05 |

---

## 5. Problemas

| ID   | Problema / Bloqueo | Tarea afectada | Responsable | Acción tomada / Próximo paso |
| ---- | ------------------ | -------------- | ----------- | ---------------------------- |
| P-01 | El DNS Interceptor no compila desde `main`. `src/main.rs` quedó con dos funciones `main` y una llave sin cerrar, y `Cargo.toml` quedó con la sección `[dependencies]` duplicada y una clave `edition` dentro de ella | T-01 a T-05 | Rafael Araya, Isaac Rojas | Detectado al revisar `main` después del merge del PR #5. |
| P-02 | `dns_builder.rs` quedó en `dns-interceptor/` en lugar de `dns-interceptor/src/`, y el archivo dentro de `src/` está vacío, de modo que Cargo no compila ese código | T-05 | Rafael Araya | Mover el archivo a `src/` y declarar el módulo en `main.rs` |
| P-03 | Al inicio de la semana no existía el esquema de datos, lo que impedía implementar `/api/exists` contra la base | T-18 | Otto Segura, Luis Delgado | Resuelto. Se definió una interfaz de repositorio con una implementación en memoria para no bloquear el desarrollo, y Otto publicó el esquema el 10/09. Falta la implementación contra Supabase |
| P-04 | El CRUD de health checks que necesita la interfaz no estaba asignado a ninguna tarea | T-35 | Grupo | Se incorporó al alcance del DNS API como T-45 |
| P-05 | Falta acordar el manejo de HTTPS y certificados entre el DNS Interceptor y el DNS API, que el enunciado exige | T-06, T-20 | Isaac Rojas, Luis Delgado | Pendiente de definir la próxima semana |
| P-06 | No existe ningún Dockerfile, archivo de Docker Compose ni Helm Chart en el repositorio, y ningún componente se puede levantar de forma automatizada | T-07, T-23, T-32, T-37, T-38, T-39 | Grupo | El enunciado califica con nota 0 si la instalación no está automatizada, incluso si el proyecto se entrega completo. |

---

## 6. Resumen de participación individual

| Integrante | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado |
| ---------- | ---------------: | ------: | --: | ----------------------------- |
| Isaac Rojas Robles | 8 | 2 | 1 | Servidor UDP/53 asíncrono operativo, parseo del encabezado DNS conforme al RFC1035 y clasificación de paquetes estándar y no estándar |
| Rafael Araya Álvarez | 8 | 4 | 1 | Configuración inicial del repositorio y un módulo de construcción de respuestas DNS. Ese módulo corresponde a T-05. |
| Luis Diego Delgado Muñoz | 9 | 9 | 1 | DNS API en Javalin con `/api/health` y `/api/exists` resolviendo contra un repositorio en memoria y el contrato de endpoints. |
| Otto Segura Ruiz | 8 | 1 | 1 | Esquema completo de base de datos, con migraciones, restricciones y vistas de consenso por mayoría simple. |
| Alexandra De Gracia | 8 | 12 | 1 | Aplicación React con dashboard, navegación y pantallas de registros DNS, health checks e IP-to-Country, las tres con crear, editar y eliminar sobre datos simulados |

Las tareas T-41 a T-44 son responsabilidad compartida y no se contabilizan en la columna de tareas
asignadas.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad                                      | Responsable(s)      | Resultado esperado |
| ------------ | ------------------------------------------------------ | ------------------- | ------------------ |
| P-01, P-02   | Restaurar `main.rs` y reubicar `dns_builder.rs`         | Rafael Araya        | El DNS Interceptor vuelve a compilar desde `main` |
| T-03 a T-05  | Extracción del hostname y serialización de la respuesta | Isaac Rojas         | `nslookup` recibe una respuesta válida del Interceptor |
| T-09, T-10   | Consulta de existencia y estrategia `single`           | Rafael Araya        | El Interceptor resuelve un dominio consultando `/api/exists` |
| T-19, T-20   | Cliente UDP/DNS y endpoint `/api/dns_resolver`          | Luis Delgado        | El API resuelve paquetes DNS en BASE64 contra un servidor remoto |
| T-21         | CRUD de registros DNS contra Supabase                   | Luis Delgado        | El API deja de usar el repositorio en memoria |
| T-26, T-27   | Lectura de registros y health check TCP                 | Otto Segura         | El Health Checker marca IPs como healthy o unhealthy |
| T-35, T-36   | Health checks e IP-to-Country en la interfaz            | Alexandra De Gracia | Formularios alineados con el contrato del API |
| P-08         | Dockerfile de cada componente implementado              | Cada responsable    | Cada componente se levanta con Docker, sin pasos manuales |
| P-06         | Definir HTTPS y certificados entre contenedores         | Isaac, Luis         | Decisión documentada en el contrato |

---

## 8. Observaciones

Durante la semana se incorporó al repositorio el documento `docs/contrato-dns-api.md`, que
especifica los endpoints del DNS API, el formato JSON de cada tipo de registro y el formato de
error. Se escribió antes de implementar los endpoints, con el fin de que la DNS UI y el DNS
Interceptor pudieran avanzar en paralelo sin esperar a la implementación. El documento ya se alineó
con el esquema de datos publicado y queda pendiente de revisión por parte de los compañeros.