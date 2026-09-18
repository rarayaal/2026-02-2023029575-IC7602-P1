# Etapa 1: Builder
FROM rust:1-slim AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY src ./src

# Compilación de release 
RUN cargo build --release --bins

# Etapa 2: Runtime
FROM debian:bookworm-slim

WORKDIR /app

# Instala solo las librerías runtime necesarias 
RUN apt-get update && \
    apt-get install -y --no-install-recommends ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Copia solo los binarios compilados del stage anterior.
COPY --from=builder /app/target/release/dns-interceptor ./
COPY --from=builder /app/target/release/mock_dns_api ./

ENTRYPOINT ["./dns-interceptor"]
