-- Habilitar extensión para UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum: Tipos de resolución DNS soportados por el Interceptor (Rust) y DNS API (Java)
DO $$ BEGIN
    CREATE TYPE dns_record_type AS ENUM (
        'single',       -- Retorna una única IP fija
        'multi',        -- Retorna múltiples IPs en Round-Robin
        'weight',       -- Distribución ponderada por peso
        'round-trip',   -- Selección por menor latencia según Health Checkers
        'geo'           -- Selección por país según IP cliente
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum: Protocolos de Health Check
DO $$ BEGIN
    CREATE TYPE health_check_protocol AS ENUM (
        'TCP',          -- Verificación de handshake a nivel de transporte
        'HTTP'          -- Verificación HTTP (GET, status codes, basic auth)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Enum: Estado de salud de un target/IP
DO $$ BEGIN
    CREATE TYPE health_status_enum AS ENUM (
        'healthy',      -- Servicio operativo
        'unhealthy'     -- Servicio caído o con error
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
