# ==============================================================================
# Etapa 1: Compilación - Builder
# ==============================================================================
FROM debian:bookworm-slim AS builder

WORKDIR /build

# Instalación de compilador GCC, utilidades Make y cabeceras de libcurl
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia de archivos fuente del Health Checker
COPY Makefile ./
COPY include/ ./include/
COPY lib/ ./lib/
COPY src/ ./src/

# Compilación estricta del binario
RUN make clean && make

# ==============================================================================
# Etapa 2: Imagen Final de Producción - Runner
# ==============================================================================
FROM debian:bookworm-slim

WORKDIR /app

# Instalación de dependencias mínimas de ejecución y certificados SSL para HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copia exclusiva del ejecutable compilado desde la etapa anterior
COPY --from=builder /build/health_checker_bin /app/health_checker_bin

# Definición del punto de entrada ejecutable
ENTRYPOINT ["/app/health_checker_bin"]
