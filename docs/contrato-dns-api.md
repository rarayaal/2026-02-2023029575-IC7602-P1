# Contrato del DNS API

**Proyecto 1 — IC-7602 Redes**
**Responsable del componente:** Luis Diego Delgado Muñoz
**Estado:** v2 — alineado con el esquema de datos (T-25), pendiente de revisión de Alexandra (UI) y Rafael (Interceptor)
**Fecha:** 10/09/2026

Este documento define cómo se habla con el DNS API. Existe para que la DNS UI, el DNS Interceptor y
el Health Checker puedan avanzar en paralelo sin esperar a que el API esté implementada.

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
| Esquema de datos detrás del API | T-25 | Otto | publicado, ver `database/migrations/` |
| Certificados HTTPS entre Interceptor y API | T-06 y T-20 | Isaac y Luis | **por definir** |

### Qué se decide desde el API y qué se acuerda en grupo

| Decisión | Quién |
| --- | --- |
| Rutas, verbos HTTP y códigos de estado | el API |
| Formato del error y forma del JSON que el API recibe y devuelve | el API |
| Qué campos tiene un registro DNS y qué significa cada uno | **acuerdo de grupo**: los cinco componentes leen y escriben los mismos datos |
| Cómo se guardan esos datos en la base | **Otto (T-25)** |


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
  "id": "6f1a2b3c-4d5e-4f60-8a91-0b2c3d4e5f60",
  "domain": "cdn.company.com",
  "type": "multi",
  "ttl": 300,
  "isActive": true,
  "targets": [
    {
      "id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
      "ip": "10.0.0.1",
      "status": "healthy",
      "healthCheckId": "9c8b7a65-4321-4dcb-9876-5f4e3d2c1b0a"
    },
    {
      "id": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
      "ip": "10.0.0.2",
      "status": "unhealthy",
      "healthCheckId": "8b7a6954-3210-4cba-8765-4e3d2c1b0a9f"
    },
    {
      "id": "c3d4e5f6-a7b8-4c9d-8e1f-2a3b4c5d6e7f",
      "ip": "10.0.0.3",
      "status": "unknown",
      "healthCheckId": null
    }
  ]
}
```

| Campo | Tipo | Quién lo escribe |
| --- | --- | --- |
| `id` | UUID | la base de datos, al crear |
| `domain` | string, máximo 253 caracteres | la UI |
| `type` | `single`, `multi`, `weight`, `geo` o `round-trip` | la UI |
| `ttl` | entero de segundos, mayor que cero | la UI |
| `isActive` | booleano | la UI |
| `targets` | arreglo, ver abajo | la UI |
| `targets[].id` | UUID | la base de datos, al crear |
| `targets[].healthCheckId` | UUID o `null` | la UI |
| `targets[].status` | `healthy`, `unhealthy` o `unknown` | **el Health Checker**, ver abajo |

### El health check cuelga de la IP, no del dominio

Cada target tiene **su propio** health check, y a lo sumo uno. No tiene sentido que sea por dominio:
en un registro `multi` con tres IPs, cada una puede apuntar a un servicio distinto, en un puerto
distinto y con un path distinto.

Por eso `healthCheckId` va dentro de cada elemento de `targets` y no al nivel del registro.

### De dónde sale `status`

En la base, la salud de una IP es un booleano más la fecha del último chequeo. El API los combina
en los tres estados que la interfaz necesita mostrar:

| Estado | Cuándo |
| --- | --- |
| `healthy` | el Health Checker la marcó sana |
| `unhealthy` | el Health Checker la marcó caída |
| `unknown` | todavía no se le ha hecho ningún chequeo |

`isActive` es cosa distinta de `status`: `isActive` es la decisión de una persona de habilitar o
deshabilitar el registro, y `status` es lo que midieron los Health Checkers.

### Por qué un solo `targets` para los cinco tipos

Cada tipo necesita datos distintos por IP, pero todos necesitan **una lista de IPs con estado de
salud individual**. El enunciado lo exige: *"en caso de no existir el registro o que la IP asignada
se encuentre unhealthy"*, es la IP la que está sana o caída, no el registro completo.

Con una sola forma, el Health Checker escribe el estado en un solo lugar, el Interceptor lo lee en
un solo lugar, y la UI usa una sola tabla con columnas opcionales según el tipo.

### Campos de `targets` por tipo

| Tipo | Campos de cada elemento | Notas |
| --- | --- | --- |
| `single` | `ip` | exactamente un elemento |
| `multi` | `ip` | dos o más; el Interceptor hace round-robin |
| `weight` | `ip`, `weight` | entero mayor que cero, sin tope superior |
| `geo` | `ip`, `country` | `country` en ISO-3166 alfa-2 (`CR`, `US`) |
| `round-trip` | `ip` | nada extra que configurar, ver abajo |

Además de esos campos, todo elemento lleva `id`, `status` y `healthCheckId`. Los dos primeros son
de solo lectura.

### En `round-trip` la latencia se mide, no se declara

Para este tipo no hay nada adicional que configurar en el target. La latencia la producen los
Health Checkers: cada instancia tiene su propia ubicación geográfica simulada y registra el
round-trip time de cada prueba. El API expone esas mediciones como campos de solo lectura:

```json
{
  "id": "d4e5f6a7-b8c9-4d0e-9f1a-2b3c4d5e6f70",
  "ip": "198.51.100.4",
  "status": "healthy",
  "healthCheckId": "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d",
  "avgRttMs": 12.4,
  "minRttMs": 9.8,
  "lastCheckAt": "2026-09-10T18:03:11Z"
}
```

Esos tres campos aparecen en todos los tipos cuando hay mediciones; en `round-trip` son los que el
Interceptor usa para escoger la IP más cercana.

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
    { "ip": "198.51.100.4" },
    { "ip": "198.51.100.9" }
  ]
}
```

### Qué NO manda el API

Dos campos que aparecen en los mocks de la UI **no** vienen del API:

- `mainInfo`, por ejemplo `"172.16.0.1 (70%) | 172.16.0.2 (30%)"`
- `healthCheck` como texto, por ejemplo `"HTTP GET /health:8080"`

Son cadenas de presentación. Si el API las generara, quedaría sabiendo cómo se ve la interfaz, y
cualquier cambio visual obligaría a tocar el API.

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
  "ipStart": "190.113.0.0",
  "ipEnd": "190.113.255.255",
  "countryCode": "CR",
  "countryName": "Costa Rica",
  "city": "San José",
  "latitude": 9.9281,
  "longitude": -84.0907
}
```

El rango se expresa con su IP inicial y final, no en notación CIDR. `city`, `latitude` y `longitude`
son opcionales: los usa la estrategia `round-trip` para estimar dónde está el cliente y compararlo
con la ubicación de cada Health Checker.

Al crear un rango también se acepta notación CIDR, por comodidad de la interfaz. El API la expande
y guarda igual el par inicio/fin:

```json
{
  "cidr": "190.113.0.0/16",
  "countryCode": "CR",
  "countryName": "Costa Rica"
}
```

Solo IPv4. En la base los extremos se guardan como enteros para que la búsqueda por rango sea
inmediata, pero **el API siempre habla en notación de puntos**: quien consume no tiene que convertir
nada.

El Interceptor usa esta tabla para resolver los registros `geo`: toma la IP de origen del cliente y
busca en qué rango cae.

### `GET /api/ip-country/lookup` — país de una IP

Para que el Interceptor no tenga que traerse la tabla completa, el API resuelve la búsqueda:

```
GET /api/ip-country/lookup?ip=190.113.4.20
```

```json
{
  "ip": "190.113.4.20",
  "countryCode": "CR",
  "countryName": "Costa Rica"
}
```

Si la IP no cae en ningún rango, responde `200` con `countryCode` y `countryName` en `null`, por la
misma razón que `/api/exists`: no encontrarla es una respuesta válida. Si falta el parámetro `ip` o
no es una IPv4 válida, responde `400`.

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

Cada health check pertenece a **una IP concreta**, no a un dominio, y una IP tiene a lo sumo uno.
Por eso `targetId` es obligatorio al crear, y si esa IP ya tiene un check configurado el API
responde `409`.

**Tipo TCP**

```json
{
  "id": "9c8b7a65-4321-4dcb-9876-5f4e3d2c1b0a",
  "targetId": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
  "protocol": "TCP",
  "port": 443,
  "timeoutMs": 3000,
  "retries": 3,
  "intervalSeconds": 15,
  "isEnabled": true
}
```

**Tipo HTTP**

```json
{
  "id": "8b7a6954-3210-4cba-8765-4e3d2c1b0a9f",
  "targetId": "b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e",
  "protocol": "HTTP",
  "port": 8080,
  "path": "/health",
  "expectedStatuses": [200, 204],
  "basicAuth": { "username": "admin", "password": "secreto" },
  "timeoutMs": 5000,
  "retries": 3,
  "intervalSeconds": 30,
  "isEnabled": true
}
```

| Campo | Regla |
| --- | --- |
| `protocol` | `TCP` o `HTTP` |
| `port` | entre 1 y 65535 |
| `path` | solo HTTP; por omisión `/` |
| `expectedStatuses` | solo HTTP; por omisión `[200]` |
| `basicAuth` | solo HTTP; `null` si el servicio no lo requiere |
| `timeoutMs` | **milisegundos**, mayor que cero; por omisión 5000 |
| `retries` | cero o más; por omisión 3 |
| `intervalSeconds` | **segundos**, mayor que cero; por omisión 30 |
| `isEnabled` | si está en `false`, los Health Checkers lo ignoran |

Cuidado con las unidades: el timeout va en milisegundos y el intervalo en segundos. No es capricho
del API, así están las columnas en la base.

Los checks HTTP siempre usan `GET`; no hay forma de configurar otro verbo.

### La contraseña de basic auth

`basicAuth.password` se acepta al crear y al modificar, pero **el API nunca lo devuelve**: en los
`GET` sale siempre como `null`. Es un campo de solo escritura.

```json
"basicAuth": { "username": "admin", "password": null }
```

Consecuencia práctica: la interfaz no puede mostrar la contraseña guardada, solo reemplazarla. El
Health Checker sí la necesita completa, pero no la pide al API: la lee directamente de la base de
datos, que es donde corre.

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

Solo se consideran los registros con `isActive` en `true`. Un dominio deshabilitado desde la
interfaz responde `exists: false`, igual que si no existiera: la idea es poder apagar un registro
sin borrarlo.

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

