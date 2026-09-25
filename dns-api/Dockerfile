# Imagen del DNS API (T-23).
#
# Se construye en dos etapas. La primera compila el proyecto con Maven; la segunda se queda solo con
# el jar y un JRE. Asi la imagen final no carga Maven, el codigo fuente ni las dependencias de
# compilacion, y pasa de cientos de megas a unas pocas decenas.

# ---------- Etapa 1: compilar ----------
FROM maven:3.9-eclipse-temurin-21 AS build

WORKDIR /build

# Se copia primero solo el pom y se bajan las dependencias. Docker guarda el resultado de cada paso
# en una capa y la reutiliza mientras ese paso no cambie: como el pom cambia poco, las dependencias
# no se vuelven a bajar en cada build.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q clean package

# ---------- Etapa 2: ejecutar ----------
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# El API escucha en el 8080, que no es un puerto privilegiado, asi que no necesita root.
RUN addgroup -S dnsapi && adduser -S dnsapi -G dnsapi

COPY --from=build /build/target/dns-api.jar app.jar

USER dnsapi

# Valores por omision del servidor. SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y DNS_SERVER_IP no se
# declaran aqui a proposito: son obligatorias y se inyectan al levantar el contenedor, para que
# ninguna credencial quede dentro de la imagen.
ENV DNS_API_HOST=0.0.0.0 \
    DNS_API_PORT=8080 \
    DNS_API_MAX_THREADS=100

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
