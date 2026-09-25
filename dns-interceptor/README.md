# DNS Interceptor — Guía de Deployment

## Descripción Rápida

El **DNS Interceptor** es un servidor DNS que actúa como punto de entrada del sistema. Escucha en UDP/53 (o puerto configurable), recibe queries DNS, y decide si resolverlos localmente o delegarlos al DNS API.

- **Desarrollo aislado:** levanta el Interceptor + mock_dns_api con el Docker Compose de este directorio.
- **Integración real:** usa el Docker Compose de la raíz, que conecta el Interceptor con `dns-api:8080`.

---

## Compilación

### Opción 1: Nativo (con Rust instalado)

```bash
cargo build --release
```

Los binarios compilados estarán en `target/release/{dns-interceptor,mock_dns_api}`.

### Opción 2: Docker (recomendado en Windows)

```bash
docker build -t dns-interceptor:latest .
```

Esto crea una imagen multiestado: compila en `rust:1-slim` y corre el runtime sobre `debian:bookworm-slim` (mucho más pequeña que una imagen Rust completa).

---

## Ejecución

### Opción 1: Docker Compose (desarrollo)

Levanta el Interceptor + mock_dns_api juntos, con networking automático entre contenedores:

```bash
docker-compose up -d
```

Prueba:

```bash
nslookup example.com 127.0.0.1
# O con dig:
dig @127.0.0.1 example.com
```

Ver logs:

```bash
docker-compose logs -f dns-interceptor
docker-compose logs -f mock-dns-api
```

Detener:

```bash
docker-compose down
```

### Opción 2: Docker manual (un solo contenedor)

```bash
docker run --rm -p 53:53/udp \
  -e INTERCEPTOR_BIND_ADDR=0.0.0.0 \
  -e INTERCEPTOR_UDP_PORT=53 \
  -e DNS_API_URL=http://localhost:8080 \
  -e RUST_LOG=info \
  dns-interceptor:latest
```

(Nota: sin el mock_dns_api local, el Interceptor intentará conectar al DNS API en `http://localhost:8081` y fallará si no existe. Para esto es más práctico usar Docker Compose.)

### Opción 3: Nativo

```bash
export RUST_LOG=info
export INTERCEPTOR_BIND_ADDR=0.0.0.0
export INTERCEPTOR_UDP_PORT=53
export DNS_API_URL=http://localhost:8080

./target/release/dns-interceptor
```

---

## Variables de Entorno

| Variable              | Default          | Descripción                                                         |
|----------------------|------------------|---------------------------------------------------------------------|
| `INTERCEPTOR_BIND_ADDR` | `0.0.0.0`        | Dirección donde escucha el socket UDP.                              |
| `INTERCEPTOR_UDP_PORT`  | `53`             | Puerto UDP (estándar: 53, para dev: 5353).            |
| `DNS_API_URL`           | `http://localhost:8080` | URL base del DNS API.                  |
| `DNS_API_TIMEOUT_MS`    | `5000`           | Timeout (ms) de solicitudes HTTP al DNS API.                        |
| `RUST_LOG`              | (ninguno)        | Nivel de logging: `trace`, `debug`, `info`, `warn`, `error`.        |
| `MOCK_API_PORT`         | `8081`           | Puerto donde escucha el mock_dns_api.|

---

## Integración con el DNS API Real

La integración completa se levanta desde la raíz del repositorio:

```bash
docker compose up -d dns-api dns-interceptor
```

El servicio `dns-interceptor` recibe `DNS_API_URL=http://dns-api:8080` por configuración y espera
el healthcheck de `dns-api` antes de arrancar.

---

