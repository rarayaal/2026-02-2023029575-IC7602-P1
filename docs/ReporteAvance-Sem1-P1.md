# Reporte Semanal de Avance – Proyecto 1

**Curso:** IC7602

**Proyecto:** 1

**Semana:** 1

**Fecha del reporte:** 03/09/2026


## 1. Integrantes del grupo

| Carné      | Nombre completo          |
| ---------- | ------------------------ |
| 2022104884 | Isaac Rojas Robles       |
| 2023029575 | Rafael Araya             |
| 2020030408 | Luis Diego Delgado Muñoz |
| 2020426226 | Otto Segura              |
| 2026801601 | Alexandra De Gracia      |

---

## 2. Estado de las tareas

Conforme a lo indicado en el enunciado, para el primer reporte se presenta únicamente la lista de
tareas planificadas, su descripción y la persona responsable de cada una.


| ID   | Tarea                              | Descripción                                                                                             | Responsable(s) | Estado    | Avance |
| ---- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------- | --------- | -----: |
| T-01 | Servidor UDP/53 concurrente        | Levantar el servidor en Rust sobre UDP/53 con capacidad de atender múltiples solicitudes simultáneas       | Isaac Rojas    | Pendiente |     0% |
| T-02 | Parseo del encabezado DNS          | Interpretar el header del paquete DNS (QR, OPCODE, secciones) según RFC1035 y RFC2929                     | Isaac Rojas    | Pendiente |     0% |
| T-03 | Clasificación de paquetes          | Distinguir entre query estándar (QR=0, OPCODE=0) y paquete no estándar, y enrutar cada caso               | Isaac Rojas    | Pendiente |     0% |
| T-04 | Extracción del hostname            | Parsear la sección Question para identificar el host que se intenta resolver                              | Isaac Rojas    | Pendiente |     0% |
| T-05 | Serialización de la respuesta DNS  | Construir la respuesta cumpliendo al 100% con RFC1035 y RFC2929, para compatibilidad con `nslookup` y los resolutores de Windows y Linux | Isaac Rojas | Pendiente | 0% |
| T-06 | Delegación al DNS API              | Codificar el paquete en BASE64, enviarlo vía HTTPS a `/api/dns_resolver`, decodificar la respuesta y reenviarla al cliente | Isaac Rojas | Pendiente | 0% |
| T-07 | Dockerfile del DNS Interceptor     | Contenerizar el componente con su configuración inyectada por variables de entorno                        | Isaac Rojas    | Pendiente |     0% |
| T-08 | Pruebas con `nslookup`             | Validar el componente apuntando `nslookup` directamente al contenedor y documentar los casos probados     | Isaac Rojas    | Pendiente |     0% |
| T-09 | Consulta de existencia del registro| Consultar `/api/exists` con el hostname obtenido y determinar el tipo de registro asociado                | Rafael Araya   | Pendiente |     0% |
| T-10 | Estrategia `single`                | Retornar la única IP asociada al registro                                                                | Rafael Araya   | Pendiente |     0% |
| T-11 | Estrategia `multi`                 | Implementar round-robin entre las IPs del registro para que peticiones distintas reciban IPs distintas    | Rafael Araya   | Pendiente |     0% |
| T-12 | Estrategia `weight`                | Distribuir las respuestas de forma proporcional al peso asignado a cada IP                                | Rafael Araya   | Pendiente |     0% |
| T-13 | Estrategia `geo`                   | Determinar el país mediante la source IP y la base IP-to-Country, y retornar la IP correspondiente o una aleatoria si no hay coincidencia | Rafael Araya | Pendiente | 0% |
| T-14 | Estrategia `round-trip`            | Seleccionar la IP con menor latencia según la cercanía geográfica, usando los datos generados por el Health Checker | Rafael Araya | Pendiente | 0% |
| T-15 | Manejo de registro ausente o unhealthy | Tratar como paquete no estándar los casos sin registro o con IP marcada unhealthy, delegando al DNS API | Rafael Araya   | Pendiente |     0% |
| T-16 | Simulación para `round-trip`       | Diseñar y documentar el esquema de simulación o penalización de latencias que permita validar la estrategia | Rafael Araya | Pendiente | 0% |
| T-17 | Estructura base de la API REST     | Definir el framework, la estructura del proyecto Java y el soporte de peticiones concurrentes             | Luis Delgado   | Pendiente |     0% |
| T-18 | Endpoint `/api/exists`             | Verificar la existencia de un dominio en Supabase/Firebase y retornar su tipo de registro                 | Luis Delgado   | Pendiente |     0% |
| T-19 | Cliente UDP/DNS                    | Implementar el cliente que envía consultas a un servidor DNS remoto configurable por variable de entorno  | Luis Delgado   | Pendiente |     0% |
| T-20 | Endpoint `/api/dns_resolver`       | Decodificar el paquete BASE64 recibido, resolverlo mediante el cliente UDP/DNS y retornar la respuesta en BASE64 | Luis Delgado | Pendiente | 0% |
| T-21 | CRUD de registros DNS              | Endpoints para crear, leer, modificar y eliminar registros de los tipos single, multi, weight, geo y round-trip | Luis Delgado | Pendiente | 0% |
| T-22 | CRUD de IP-to-Country              | Endpoints para administrar la tabla IP-to-Country                                                        | Luis Delgado   | Pendiente |     0% |
| T-23 | Dockerfile del DNS API             | Contenerizar el componente con toda su configuración inyectada por variables de entorno                   | Luis Delgado   | Pendiente |     0% |
| T-24 | Colección de Postman               | Documentar y probar todos los endpoints, exportando la colección como evidencia                          | Luis Delgado   | Pendiente |     0% |
| T-25 | Esquema de datos                   | Diseñar las tablas de Supabase/Firebase (registros por tipo, health checks, IP-to-Country) y acordarlo con el resto del equipo | Otto Segura | Pendiente | 0% |
| T-26 | Lectura de registros               | Leer desde GNU C los registros almacenados en Supabase/Firebase                                          | Otto Segura    | Pendiente |     0% |
| T-27 | Health check TCP                   | Verificar el establecimiento de conexión con timeout, retries e intervalo configurables                  | Otto Segura    | Pendiente |     0% |
| T-28 | Health check HTTP                  | Realizar peticiones a un path configurable validando los códigos esperados, con soporte de basic auth     | Otto Segura    | Pendiente |     0% |
| T-29 | Marcado healthy / unhealthy        | Determinar el estado de cada registro por mayoría simple entre los checkers                              | Otto Segura    | Pendiente |     0% |
| T-30 | Ubicación simulada y round-trip    | Asociar latitud, longitud, país y ciudad a cada instancia y registrar el round-trip time de cada prueba   | Otto Segura    | Pendiente |     0% |
| T-31 | Carga de IP-to-Country             | Poblar la base IP-to-Country en Supabase/Firebase                                                        | Otto Segura    | Pendiente |     0% |
| T-32 | Dockerfile del Health Checker      | Contenerizar el componente permitiendo levantar varias instancias con ubicaciones geográficas distintas   | Otto Segura    | Pendiente |     0% |
| T-33 | Estructura base de la UI           | Configurar la aplicación React y su consumo del DNS API                                                  | Alexandra De Gracia | Pendiente | 0% |
| T-34 | Gestión de registros DNS           | Crear, modificar y eliminar registros de tipo single, multi, weight, round-trip y geo                     | Alexandra De Gracia | Pendiente | 0% |
| T-35 | Configuración de health checks     | Definir desde la interfaz los health checks TCP y HTTP con sus parámetros (timeout, retries, intervalo, path, códigos esperados y basic auth) | Alexandra De Gracia | Pendiente | 0% |
| T-36 | Gestión de IP-to-Country           | Crear, modificar y eliminar registros de la base IP-to-Country                                           | Alexandra De Gracia | Pendiente | 0% |
| T-37 | Dockerfile de la UI                | Contenerizar la aplicación React                                                                         | Alexandra De Gracia | Pendiente | 0% |
| T-38 | Orquestación del stack             | Integrar los cinco componentes mediante Docker Compose y Helm Charts / Kubernetes                        | Alexandra De Gracia | Pendiente | 0% |
| T-39 | Configuración por variables        | Verificar que ningún componente tenga valores quemados y que toda la configuración se inyecte por variables de entorno | Alexandra De Gracia | Pendiente | 0% |
| T-40 | Prueba end-to-end                  | Validar el flujo completo del sistema, incluyendo la prueba de apuntar `resolv.conf` al contenedor        | Alexandra De Gracia | Pendiente | 0% |
| T-41 | Documentación por componente       | Cada integrante documenta su componente: instalación, pruebas y pasos para reproducirlas, y qué funciona y qué no | Los 5   | Pendiente |     0% |
| T-42 | Documento general                  | Instrucciones generales de ejecución, diagramas de arquitectura, tabla resumen de funcionalidad y al menos 10 conclusiones y 10 recomendaciones | Los 5 | Pendiente | 0% |
| T-43 | Documentación de prompts de IA     | Cada integrante registra los prompts utilizados y los problemas encontrados, para la DNS UI y la automatización | Los 5 | Pendiente | 0% |
| T-44 | Video de demostración              | Grabar el video de máximo 10 minutos, con una sección por integrante mostrando y explicando su componente | Los 5          | Pendiente |     0% |

**Estados permitidos:** Pendiente / En progreso / Bloqueada / Finalizada.

---

## 3. Commits realizados

Al tratarse del primer reporte de avance, no se registran commits durante este período.

---

## 4. Pull Requests (PRs)

Ningún integrante del grupo creó Pull Requests durante este período.

---

## 5. Problemas

No se presentaron problemas o bloqueos durante esta semana.

---

## 6. Resumen de participación individual

| Integrante               | Tareas asignadas | Commits | PRs | Resumen del trabajo realizado                                                   |
| ------------------------ | ---------------: | ------: | --: | ------------------------------------------------------------------------------  |
| Isaac Rojas Robles       |                8 |       0 |   0 | Participó en la planificación y asumió el núcleo del DNS Interceptor            |
| Rafael Araya             |                8 |       0 |   0 | Participó en la planificación y asumió la lógica de resolución del Interceptor  |
| Luis Diego Delgado Muñoz |                8 |       0 |   0 | Participó en la planificación y asumió el DNS API                               |
| Otto Segura              |                8 |       0 |   0 | Participó en la planificación y asumió el Health Checker y el modelo de datos   |
| Alexandra De Gracia      |                8 |       0 |   0 | Participó en la planificación y asumió la DNS UI y la orquestación general      |

Las tareas de T-41 a T-44 son responsabilidad compartida de los cinco integrantes y no se
contabilizan en la columna anterior.

---

## 7. Plan para la siguiente semana

| ID           | Tarea / Actividad                                  | Responsable(s)      | Resultado esperado                                                            |
| ------------ | -------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| T-25         | Definir el esquema de datos                        | Otto Segura         | Modelo acordado y publicado en el repositorio, disponible para todo el equipo |
| T-26, T-27   | Iniciar el Health Checker                          | Otto Segura         | Lectura de registros y health check TCP operativo                             |
| T-01, T-02   | Iniciar el núcleo del DNS Interceptor              | Isaac Rojas         | Servidor UDP/53 recibiendo paquetes y parseando el encabezado                 |
| T-17, T-18   | Iniciar el DNS API                                 | Luis Delgado        | API levantada con `/api/exists` funcionando contra la base de datos           |
| T-33, T-34   | Iniciar la DNS UI                                  | Alexandra De Gracia | Aplicación React consumiendo el DNS API y gestionando registros               |
| T-09, T-10   | Preparar la lógica de resolución                   | Rafael Araya        | Consulta de existencia integrada y estrategia `single` funcionando            |

---

## 8. Observaciones

 No hay observaciones.