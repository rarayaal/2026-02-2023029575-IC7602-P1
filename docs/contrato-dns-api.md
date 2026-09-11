# Contrato del DNS API

**Proyecto 1 — IC-7602 Redes**
**Responsable del componente:** Luis Diego Delgado Muñoz
**Estado:** propuesta v1 — pendiente de acordar con Alexandra (UI), Rafael (Interceptor) y Otto (esquema de datos)
**Fecha:** 10/09/2026

Este documento define cómo se habla con el DNS API. Existe para que la DNS UI, el DNS Interceptor y
el Health Checker puedan avanzar en paralelo sin esperar a que el API esté implementada.

Si algo aquí no calza con lo que necesita tu componente, hay que discutirlo **antes** de que esté
programado. Cambiar este documento es barato; cambiar tres componentes ya escritos no lo es.

---

## 0. Alcance de este documento

Aquí se especifica **el DNS API**, es decir las tareas **T-17 a T-24**. Todo lo que aparezca
detallado en este documento es lo que el API implementa y sostiene.

Las filas marcadas **por definir** se nombran aquí porque el contrato necesita mencionarlas, pero
las completa la persona responsable de esa tarea.

| Parte | Tarea | Responsable | Estado aquí |
| --- | --- | --- | --- |
| Endpoints y JSON del API | T-17 a T-24 | Luis | especificado |
| CRUD de health checks | tarea nueva, pendiente de numerar | Luis | especificado |
| Esquema de datos detrás del API | T-25 | Otto | **por definir** |
| Certificados HTTPS entre Interceptor y API | T-06 y T-20 | Isaac y Luis | **por definir** |

### Qué se decide desde el API y qué se acuerda en grupo

| Decisión | Quién |
| --- | --- |
| Rutas, verbos HTTP y códigos de estado | el API |
| Formato del error y forma del JSON que el API recibe y devuelve | el API |
| Qué campos tiene un registro DNS y qué significa cada uno | **acuerdo de grupo**: los cinco componentes leen y escriben los mismos datos |
| Cómo se guardan esos datos en la base | **Otto (T-25)** |

Nada de lo que está aquí es definitivo hasta que el equipo lo revise. Si alguna decisión les
complica el trabajo de su componente, se cambia — para eso se escribe antes de programar.

---

## 1. Conexión

| Dato | Valor |
| --- | --- |
| Protocolo | HTTP (HTTPS entre Interceptor y API, ver sección 7) |
| Host y puerto | configurables: `DNS_API_HOST`, `DNS_API_PORT` |
| Puerto por omisión | `8080` |
| Base de todas las rutas | `/api` |

En desarrollo local, la UI apunta a `http://localhost:8080`. Esa dirección **no se quema en el
código de React**: va en una variable de entorno de Vite (`VITE_API_URL`), porque el enunciado
prohíbe valores quemados y en Docker el host va a ser otro (`http://dns-api:8080`).

> **Pendiente:** la UI corre en otro puerto (5173 en Vite), así que el navegador va a bloquear las
> llamadas por CORS. El API tiene que habilitar CORS para el origen de la UI. Queda anotado como
> trabajo del API, no de la UI.

---

## 2. Convenciones generales

- Todo viaja en JSON, con `Content-Type: application/json`.
- Las respuestas de error **también** son JSON, nunca HTML.

| Código | Cuándo |
| --- | --- |
| `200 OK` | consulta o modificación exitosa |
| `201 Created` | recurso creado (incluye el recurso en el cuerpo) |
| `204 No Content` | borrado exitoso, sin cuerpo |
| `400 Bad Request` | el cuerpo o los parámetros son inválidos |
| `404 Not Found` | el recurso no existe |
| `409 Conflict` | ya existe un registro para ese dominio |
| `500 Internal Server Error` | falla del API o de la base de datos |

Formato único de error:

```json
{
  "error": "not_found",
  "message": "No existe el registro con id 42"
}
```

`error` es un código estable pensado para que lo compare un programa. `message` es texto para quien
está depurando; puede cambiar sin aviso.

---

## 3. El registro DNS

Esta es la pieza central y la que hay que acordar con cuidado.

```json
{
  "id": "7",
  "domain": "cdn.company.com",
  "type": "multi",
  "ttl": 300,
  "targets": [
    { "ip": "10.0.0.1", "status": "healthy" },
    { "ip": "10.0.0.2", "status": "unhealthy" },
    { "ip": "10.0.0.3", "status": "healthy" }
  ],
  "healthCheckId": "3"
}
```

| Campo | Tipo | Quién lo escribe |
| --- | --- | --- |
| `id` | string | la base de datos, al crear |
| `domain` | string | la UI |
| `type` | `single`, `multi`, `weight`, `geo` o `round-trip` | la UI |
| `ttl` | entero, segundos | la UI |
| `targets` | arreglo, ver abajo | la UI |
| `healthCheckId` | string o `null` | la UI |
| `targets[].status` | `healthy`, `unhealthy` o `unknown` | **el Health Checker** |

### Por qué un solo `targets` para los cinco tipos

Cada tipo necesita datos distintos por IP, pero todos necesitan **una lista de IPs con estado de
salud individual**. El enunciado lo exige: *"en caso de no existir el registro o que la IP asignada
se encuentre unhealthy"* — es la IP la que está sana o caída, no el registro completo.

Con una sola forma, el Health Checker escribe el estado en un solo lugar, el Interceptor lo lee en
un solo lugar, y la UI usa una sola tabla con columnas opcionales según el tipo.

### Campos de `targets` por tipo

| Tipo | Campos de cada elemento | Notas |
| --- | --- | --- |
| `single` | `ip` | exactamente un elemento |
| `multi` | `ip` | dos o más; el Interceptor hace round-robin |
| `weight` | `ip`, `weight` | `weight` entero de 1 a 100 |
| `geo` | `ip`, `country` | `country` en ISO-3166 alfa-2 (`CR`, `US`) |
| `round-trip` | `ip`, `location` | `latencyMs` lo llena el Health Checker |

En todos los tipos, cada elemento lleva además `status` de solo lectura.

### Ejemplos completos por tipo

**single**

```json
{
  "domain": "api.company.com",
  "type": "single",
  "ttl": 300,
  "targets": [{ "ip": "192.168.1.50" }]
}
```

**multi**

```json
{
  "domain": "cdn.company.com",
  "type": "multi",
  "ttl": 300,
  "targets": [
    { "ip": "10.0.0.1" },
    { "ip": "10.0.0.2" },
    { "ip": "10.0.0.3" }
  ]
}
```

**weight**

```json
{
  "domain": "app.company.com",
  "type": "weight",
  "ttl": 300,
  "targets": [
    { "ip": "172.16.0.1", "weight": 70 },
    { "ip": "172.16.0.2", "weight": 30 }
  ]
}
```

**geo**

```json
{
  "domain": "portal.company.com",
  "type": "geo",
  "ttl": 300,
  "targets": [
    { "ip": "203.0.113.10", "country": "US" },
    { "ip": "203.0.113.20", "country": "CR" }
  ]
}
```

**round-trip**

```json
{
  "domain": "edge.company.com",
  "type": "round-trip",
  "ttl": 300,
  "targets": [
    { "ip": "198.51.100.4", "location": "us-east" },
    { "ip": "198.51.100.9", "location": "sa-east" }
  ]
}
```

La respuesta de un `round-trip` incluye además lo que midió el Health Checker:

```json
{ "ip": "198.51.100.4", "location": "us-east", "status": "healthy", "latencyMs": 12 }
```

### Qué NO manda el API

Dos campos que aparecen en los mocks de la UI **no** vienen del API:

- `mainInfo`, por ejemplo `"172.16.0.1 (70%) | 172.16.0.2 (30%)"`
- `healthCheck` como texto, por ejemplo `"HTTP GET /health:8080"`

Son cadenas de presentación. Si el API las generara, quedaría sabiendo cómo se ve la interfaz, y
cualquier cambio visual obligaría a tocar el API.

El API manda los datos estructurados. Cómo se presenten es decisión de quien los muestre.

---

## 4. CRUD de registros DNS (T-21)

| Método | Ruta | Qué hace |
| --- | --- | --- |
| `GET` | `/api/records` | lista todos los registros |
| `GET` | `/api/records/{id}` | trae un registro |
| `POST` | `/api/records` | crea uno; responde `201` con el recurso creado |
| `PUT` | `/api/records/{id}` | reemplaza uno; responde `200` con el recurso |
| `DELETE` | `/api/records/{id}` | borra uno; responde `204` |

`GET /api/records` admite filtros opcionales: `?type=multi`, `?domain=api.company.com`.

En `POST` y `PUT` **no se envían** `id` ni ningún `status`: el primero lo asigna la base de datos y
el segundo lo escribe el Health Checker. Si vienen en el cuerpo, se ignoran.

---

## 5. CRUD de IP-to-Country (T-22)

| Método | Ruta |
| --- | --- |
| `GET` | `/api/ip-country` |
| `GET` | `/api/ip-country/{id}` |
| `POST` | `/api/ip-country` |
| `PUT` | `/api/ip-country/{id}` |
| `DELETE` | `/api/ip-country/{id}` |

```json
{
  "id": "1",
  "ipRange": "190.113.0.0/16",
  "countryCode": "CR",
  "countryName": "Costa Rica",
  "description": "Rango de proveedores de Centroamérica"
}
```

`ipRange` va en notación CIDR. El Interceptor lo usa para resolver los registros `geo`: toma la IP
de origen del cliente y busca en qué rango cae.

---

## 6. CRUD de health checks

La UI configura los health checks (T-35) y esa configuración se guarda a través del API. Esta parte
no aparecía en T-17 a T-24; se suma al alcance del DNS API y queda pendiente de numerar como tarea
nueva en el próximo reporte de avance.

| Método | Ruta |
| --- | --- |
| `GET` | `/api/health-checks` |
| `GET` | `/api/health-checks/{id}` |
| `POST` | `/api/health-checks` |
| `PUT` | `/api/health-checks/{id}` |
| `DELETE` | `/api/health-checks/{id}` |

**Tipo TCP**

```json
{
  "id": "2",
  "name": "Check CDN Gateway",
  "type": "tcp",
  "port": 443,
  "intervalSec": 15,
  "timeoutSec": 3,
  "retries": 3
}
```

**Tipo HTTP**

```json
{
  "id": "1",
  "name": "Check API Endpoint",
  "type": "http",
  "port": 8080,
  "path": "/health",
  "method": "GET",
  "intervalSec": 30,
  "timeoutSec": 5,
  "retries": 3,
  "expectedCodes": [200, 204],
  "basicAuth": { "username": "admin", "password": "secreto" }
}
```

`retries`, `expectedCodes` y `basicAuth` los exige el enunciado y faltan en los mocks actuales de la
UI. `basicAuth` es `null` cuando el servicio monitoreado no lo requiere.

### La contraseña de basic auth

`basicAuth.password` se acepta al crear y al modificar, pero **el API nunca lo devuelve**: en los
`GET` sale siempre como `null`. Es un campo de solo escritura.

```json
"basicAuth": { "username": "admin", "password": null }
```

Consecuencia práctica: la UI no puede mostrar la contraseña guardada, solo reemplazarla. Y el Health
Checker no la obtiene del API — la lee directamente de la base de datos, que es donde corre. Eso
depende del esquema de T-25 y hay que confirmarlo con Otto.

---

## 7. Endpoints para el DNS Interceptor

Estos no los consume la UI. Se documentan aquí para que el contrato quede en un solo lugar.

### `GET /api/exists` (T-18, lo consume Rafael en T-09)

```
GET /api/exists?hostname=api.company.com
```

```json
{
  "exists": true,
  "hostname": "api.company.com",
  "type": "single"
}
```

Cuando no existe, responde `200` con `"exists": false` y `"type": null`. Se usa `200` y no `404`
porque "no existe" es una respuesta válida a la pregunta, no un error.

Si falta el parámetro `hostname`, o viene vacío, responde `400` con el código `missing_hostname`.

**El `hostname` de la respuesta viene normalizado**: en minúsculas y sin el punto final. En DNS los
nombres no distinguen mayúsculas y un nombre absoluto puede terminar en punto, así que
`EDGE.Company.com.` y `edge.company.com` son el mismo host. El API acepta cualquiera de las dos
formas y devuelve siempre la canónica, para que quede claro qué fue lo que buscó.

### `POST /api/dns_resolver` (T-20, lo consume Isaac en T-06)

Recibe un paquete DNS crudo codificado en BASE64, lo resuelve contra un servidor DNS remoto
(configurable por variable de entorno, nunca quemado) y devuelve la respuesta también en BASE64.

Petición:

```json
{ "data": "AAABAAABAAAAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQAB" }
```

Respuesta:

```json
{ "data": "AAAAgAABAAEAAAAAA3d3dwdleGFtcGxlA2NvbQAAAQABwAwAAQ..." }
```

El enunciado pide que esta llamada sea por HTTPS. Falta acordar con Isaac cómo se manejan los
certificados entre contenedores.

---

## 8. Endpoint de vida

`GET /api/health` responde `200` con `{"status":"ok","component":"dns-api"}`. Lo usan Docker
Compose y Kubernetes; no tiene nada que ver con los health checks de la sección 6.

> **Pendiente:** los nombres `/api/health` y `/api/health-checks` se parecen demasiado. Propongo
> renombrar el de vida a `/api/healthz`, que es la convención de Kubernetes.

---

## 9. Pendientes del equipo

| # | Tema | Con quién |
| --- | --- | --- |
| 1 | Confirmar Supabase o Firebase | todos |
| 2 | El esquema de datos (T-25) tiene que calzar con este contrato | Otto |
| 3 | Formato de `id`: lo genera la base de datos, la UI no debe asumir `DNS-001` | Alexandra, Otto |
| 4 | Cómo lee el Health Checker las credenciales de `basicAuth` | Otto |
| 5 | HTTPS y certificados entre Interceptor y API | Isaac |
| 6 | CORS para el origen de la UI | Luis |
| 7 | Renombrar `/api/health` a `/api/healthz` | todos |
| 8 | Numerar como tarea nueva el CRUD de health checks de la sección 6 | Luis |
