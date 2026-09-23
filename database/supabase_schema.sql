-- >>> INICIO MIGRACIÓN: 01_extensions_and_enums.sql >>>
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
-- <<< FIN MIGRACIÓN: 01_extensions_and_enums.sql <<<

-- >>> INICIO MIGRACIÓN: 02_dns_records.sql >>>
CREATE TABLE IF NOT EXISTS dns_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_name VARCHAR(253) NOT NULL,
    record_type dns_record_type NOT NULL,
    ttl INTEGER NOT NULL DEFAULT 300,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT chk_domain_name_length CHECK (char_length(domain_name) >= 1 AND char_length(domain_name) <= 253),
    CONSTRAINT chk_ttl_positive CHECK (ttl > 0)
);

-- Índice único insensible a mayúsculas/minúsculas
CREATE UNIQUE INDEX IF NOT EXISTS idx_dns_records_domain_lower 
ON dns_records (LOWER(domain_name));

-- Para filtrar registros activos por tipo
CREATE INDEX IF NOT EXISTS idx_dns_records_type_active 
ON dns_records (record_type, is_active);

COMMENT ON TABLE dns_records IS 'Dominios interceptados y estrategia de resolución';
COMMENT ON COLUMN dns_records.domain_name IS 'Nombre de dominio sin trailing dot o normalizado en minúsculas';
COMMENT ON COLUMN dns_records.record_type IS 'Estrategia de resolución DNS: single, multi, weight, round-trip, geo';
COMMENT ON COLUMN dns_records.ttl IS 'Time to Live en segundos retornado en el paquete DNS';
-- <<< FIN MIGRACIÓN: 02_dns_records.sql <<<

-- >>> INICIO MIGRACIÓN: 03_dns_record_targets.sql >>>
CREATE TABLE IF NOT EXISTS dns_record_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id UUID NOT NULL REFERENCES dns_records(id) ON DELETE CASCADE,
    ip_address VARCHAR(45) NOT NULL,
    weight INTEGER DEFAULT 1,
    country_code VARCHAR(2),
    is_healthy BOOLEAN NOT NULL DEFAULT TRUE,
    last_check_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restricciones de validación
    CONSTRAINT chk_target_weight_positive CHECK (weight > 0),
    CONSTRAINT chk_target_country_code_format CHECK (country_code IS NULL OR char_length(country_code) = 2)
);

-- Índice por record_id para obtener rápidamente las IPs asociadas a un dominio
CREATE INDEX IF NOT EXISTS idx_dns_record_targets_record_id 
ON dns_record_targets (record_id);

-- Índice para consultar rápidamente targets sanos y activos de un dominio
CREATE INDEX IF NOT EXISTS idx_dns_record_targets_lookup 
ON dns_record_targets (record_id, is_healthy, is_active);

COMMENT ON TABLE dns_record_targets IS 'IPs destino asociadas a cada dominio con parámetros de balanceo y estado de salud';
COMMENT ON COLUMN dns_record_targets.ip_address IS 'Dirección IP v4 o v6 destino a retornar en el query DNS';
COMMENT ON COLUMN dns_record_targets.weight IS 'Peso relativo para balanceo probabilístico (estrategia weight)';
COMMENT ON COLUMN dns_record_targets.country_code IS 'Código ISO de país (2 letras) para resolución geográfica (estrategia geo)';
COMMENT ON COLUMN dns_record_targets.is_healthy IS 'Estado consolidado por mayoría simple entre Health Checkers';
COMMENT ON COLUMN dns_record_targets.last_check_at IS 'Fecha y hora de la última evaluación de salud';
-- <<< FIN MIGRACIÓN: 03_dns_record_targets.sql <<<

-- >>> INICIO MIGRACIÓN: 04_health_check_configs.sql >>>
CREATE TABLE IF NOT EXISTS health_check_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_id UUID NOT NULL UNIQUE REFERENCES dns_record_targets(id) ON DELETE CASCADE,
    protocol health_check_protocol NOT NULL,
    port INTEGER NOT NULL,
    path VARCHAR(500) DEFAULT '/',
    expected_statuses INTEGER[] DEFAULT ARRAY[200],
    basic_auth_user VARCHAR(255),
    basic_auth_pass VARCHAR(255),
    timeout_ms INTEGER NOT NULL DEFAULT 5000,
    retries INTEGER NOT NULL DEFAULT 3,
    interval_seconds INTEGER NOT NULL DEFAULT 30,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Restricciones de validación
    CONSTRAINT chk_hc_port_range CHECK (port > 0 AND port <= 65535),
    CONSTRAINT chk_hc_timeout_positive CHECK (timeout_ms > 0),
    CONSTRAINT chk_hc_retries_non_negative CHECK (retries >= 0),
    CONSTRAINT chk_hc_interval_positive CHECK (interval_seconds > 0)
);

-- Para que el Health Checker lea los checks habilitados
CREATE INDEX IF NOT EXISTS idx_health_check_configs_enabled 
ON health_check_configs (is_enabled, protocol);

COMMENT ON TABLE health_check_configs IS 'Parámetros de monitoreo TCP/HTTP para cada target monitoreado por el Health Checker';
COMMENT ON COLUMN health_check_configs.protocol IS 'Protocolo de prueba: TCP o HTTP';
COMMENT ON COLUMN health_check_configs.port IS 'Puerto destino (1-65535)';
COMMENT ON COLUMN health_check_configs.path IS 'Ruta de la petición HTTP (solo para protocolo HTTP)';
COMMENT ON COLUMN health_check_configs.expected_statuses IS 'Arreglo de códigos HTTP esperados considerados saludables (ej. [200, 204])';
COMMENT ON COLUMN health_check_configs.basic_auth_user IS 'Usuario para autenticación HTTP Basic (opcional)';
COMMENT ON COLUMN health_check_configs.basic_auth_pass IS 'Contraseña para autenticación HTTP Basic (opcional)';
COMMENT ON COLUMN health_check_configs.timeout_ms IS 'Tiempo de espera máximo en milisegundos por intento';
COMMENT ON COLUMN health_check_configs.retries IS 'Número de reintentos antes de marcar el intento como fallido';
COMMENT ON COLUMN health_check_configs.interval_seconds IS 'Frecuencia en segundos con la que el Health Checker ejecuta la prueba';
-- <<< FIN MIGRACIÓN: 04_health_check_configs.sql <<<

-- >>> INICIO MIGRACIÓN: 05_checker_instances.sql >>>
CREATE TABLE IF NOT EXISTS checker_instances (
    instance_id VARCHAR(100) PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validación de coordenadas geográficas
    CONSTRAINT chk_latitude_range CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_longitude_range CHECK (longitude >= -180.0 AND longitude <= 180.0),
    CONSTRAINT chk_instance_country_format CHECK (char_length(country_code) = 2)
);

COMMENT ON TABLE checker_instances IS 'Instancias activas del Health Checker con su geolocalización simulada';
COMMENT ON COLUMN checker_instances.instance_id IS 'Identificador único de la instancia del contenedor Health Checker';
COMMENT ON COLUMN checker_instances.country_code IS 'Código ISO de país donde simula estar el checker';
COMMENT ON COLUMN checker_instances.city IS 'Ciudad donde simula estar el checker';
COMMENT ON COLUMN checker_instances.latitude IS 'Latitud (-90 a 90) para cálculo de distancias esféricas';
COMMENT ON COLUMN checker_instances.longitude IS 'Longitud (-180 a 180) para cálculo de distancias esféricas';
COMMENT ON COLUMN checker_instances.last_heartbeat IS 'Último latido enviado por el contenedor para verificar que sigue vivo';
-- <<< FIN MIGRACIÓN: 05_checker_instances.sql <<<

-- >>> INICIO MIGRACIÓN: 06_health_check_results.sql >>>
CREATE TABLE IF NOT EXISTS health_check_results (
    id BIGSERIAL PRIMARY KEY,
    instance_id VARCHAR(100) NOT NULL REFERENCES checker_instances(instance_id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES dns_record_targets(id) ON DELETE CASCADE,
    status health_status_enum NOT NULL,
    rtt_ms NUMERIC(10, 3) NOT NULL,
    http_code INTEGER,
    error_message TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validación de valores métricos
    CONSTRAINT chk_rtt_non_negative CHECK (rtt_ms >= 0.0)
);

-- Para consultar el historial reciente de una IP por instancia
CREATE INDEX IF NOT EXISTS idx_health_results_target_instance_time 
ON health_check_results (target_id, instance_id, checked_at DESC);

-- Para limpiezas periódicas o análisis cronológico
CREATE INDEX IF NOT EXISTS idx_health_results_checked_at 
ON health_check_results (checked_at DESC);

COMMENT ON TABLE health_check_results IS 'Telemetría de mediciones de RTT y veredicto de salud reportado por cada Health Checker';
COMMENT ON COLUMN health_check_results.instance_id IS 'Instancia del Health Checker que realizó la prueba';
COMMENT ON COLUMN health_check_results.target_id IS 'IP evaluada - referencia a dns_record_targets';
COMMENT ON COLUMN health_check_results.status IS 'Resultado de la prueba: healthy o unhealthy';
COMMENT ON COLUMN health_check_results.rtt_ms IS 'Round-Trip Time medido en milisegundos';
COMMENT ON COLUMN health_check_results.http_code IS 'Código HTTP devuelto por el servidor si el protocolo fue HTTP';
COMMENT ON COLUMN health_check_results.error_message IS 'Descripción del fallo en caso de error o timeout';
COMMENT ON COLUMN health_check_results.checked_at IS 'Marca de tiempo en que finalizó la prueba';
-- <<< FIN MIGRACIÓN: 06_health_check_results.sql <<<

-- >>> INICIO MIGRACIÓN: 07_consensus_majority.sql (Refinada en 09_consensus_refinement.sql) >>>
-- View: Último reporte de salud de cada target por cada instancia activa y no obsoleta
CREATE OR REPLACE VIEW view_latest_instance_health AS
SELECT DISTINCT ON (hcr.target_id, hcr.instance_id)
    hcr.target_id,
    hcr.instance_id,
    hcr.status,
    hcr.rtt_ms,
    hcr.http_code,
    hcr.checked_at
FROM health_check_results hcr
JOIN checker_instances ci ON ci.instance_id = hcr.instance_id
WHERE ci.is_active = TRUE
  AND ci.last_heartbeat >= (NOW() - INTERVAL '2 minutes')
  AND hcr.checked_at >= (NOW() - INTERVAL '5 minutes')
ORDER BY hcr.target_id, hcr.instance_id, hcr.checked_at DESC;

-- View: Consenso de Mayoría Simple por cada target
CREATE OR REPLACE VIEW view_target_consensus AS
WITH latest_checks AS (
    SELECT 
        target_id,
        instance_id,
        status,
        rtt_ms,
        checked_at
    FROM view_latest_instance_health
),
aggregated AS (
    SELECT
        target_id,
        COUNT(*) AS total_reporting_instances,
        COUNT(*) FILTER (WHERE status = 'healthy') AS healthy_votes,
        COUNT(*) FILTER (WHERE status = 'unhealthy') AS unhealthy_votes,
        AVG(rtt_ms) AS avg_rtt_ms,
        MIN(rtt_ms) AS min_rtt_ms,
        MAX(checked_at) AS last_check_at
    FROM latest_checks
    GROUP BY target_id
)
SELECT
    t.id AS target_id,
    t.record_id,
    t.ip_address,
    COALESCE(a.total_reporting_instances, 0) AS total_reporting_instances,
    COALESCE(a.healthy_votes, 0) AS healthy_votes,
    COALESCE(a.unhealthy_votes, 0) AS unhealthy_votes,
    COALESCE(a.avg_rtt_ms, 0.0) AS avg_rtt_ms,
    COALESCE(a.min_rtt_ms, 0.0) AS min_rtt_ms,
    a.last_check_at,
    CASE 
        -- Mayoría Simple: healthy_votes > (total / 2)
        WHEN a.total_reporting_instances IS NULL OR a.total_reporting_instances = 0 THEN TRUE
        WHEN a.healthy_votes > (a.total_reporting_instances / 2.0) THEN TRUE
        ELSE FALSE
    END AS consensus_is_healthy
FROM dns_record_targets t
LEFT JOIN aggregated a ON a.target_id = t.id;

-- Función PostgreSQL + Trigger para actualizar automáticamente dns_record_targets.is_healthy
CREATE OR REPLACE FUNCTION trg_fn_update_target_consensus()
RETURNS TRIGGER AS $$
DECLARE
    v_total_instances INTEGER;
    v_healthy_votes INTEGER;
    v_new_status BOOLEAN;
BEGIN
    -- Contar votos de la última evaluación de cada instancia activa y reciente
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status = 'healthy')
    INTO 
        v_total_instances,
        v_healthy_votes
    FROM view_latest_instance_health
    WHERE target_id = NEW.target_id;

    -- Calcular mayoría simple
    IF v_total_instances > 0 THEN
        v_new_status := (v_healthy_votes > (v_total_instances / 2.0));
        
        -- Actualizar el estado consolidado directamente en el target
        UPDATE dns_record_targets
        SET 
            is_healthy = v_new_status,
            last_check_at = NEW.checked_at,
            updated_at = NOW()
        WHERE id = NEW.target_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: se dispara después de insertar una medición en health_check_results
DROP TRIGGER IF EXISTS trg_after_health_check_insert ON health_check_results;
CREATE TRIGGER trg_after_health_check_insert
AFTER INSERT ON health_check_results
FOR EACH ROW
EXECUTE FUNCTION trg_fn_update_target_consensus();
-- <<< FIN MIGRACIÓN: 07_consensus_majority.sql <<<

-- >>> INICIO MIGRACIÓN: 08_ip_to_country.sql >>>
CREATE TABLE IF NOT EXISTS ip_to_country (
    id BIGSERIAL PRIMARY KEY,
    ip_start BIGINT NOT NULL,
    ip_end BIGINT NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),

    -- Validaciones de rango IP y coordenadas
    CONSTRAINT chk_ip_range_valid CHECK (ip_start >= 0 AND ip_end >= ip_start AND ip_end <= 4294967295),
    CONSTRAINT chk_ipc_country_format CHECK (char_length(country_code) = 2),
    CONSTRAINT chk_ipc_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT chk_ipc_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- Para búsquedas en rango binario instantáneas
CREATE INDEX IF NOT EXISTS idx_ip_country_range 
ON ip_to_country (ip_start, ip_end);

-- Para búsquedas por código de país
CREATE INDEX IF NOT EXISTS idx_ip_country_code 
ON ip_to_country (country_code);

-- Para convertir IPv4 en formato texto ('192.168.1.1') a entero BIGINT
CREATE OR REPLACE FUNCTION inet_to_bigint(ip_text TEXT)
RETURNS BIGINT AS $$
DECLARE
    octets INTEGER[];
BEGIN
    octets := string_to_array(ip_text, '.')::INTEGER[];
    IF array_length(octets, 1) <> 4 THEN
        RETURN NULL;
    END IF;
    RETURN (octets[1]::BIGINT * 16777216) +
           (octets[2]::BIGINT * 65536) +
           (octets[3]::BIGINT * 256) +
           (octets[4]::BIGINT);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Función de búsqueda geográfica rápida a partir de una IP en texto
CREATE OR REPLACE FUNCTION lookup_ip_geo(p_ip_text TEXT)
RETURNS TABLE (
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6)
) AS $$
DECLARE
    v_ip_num BIGINT;
BEGIN
    v_ip_num := inet_to_bigint(p_ip_text);
    IF v_ip_num IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        ipc.country_code,
        ipc.country_name,
        ipc.city,
        ipc.latitude,
        ipc.longitude
    FROM ip_to_country ipc
    WHERE v_ip_num BETWEEN ipc.ip_start AND ipc.ip_end
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE ip_to_country IS 'Mapeo de rangos IPv4 a países y coordenadas geográficas para resolución geo y round-trip';
COMMENT ON COLUMN ip_to_country.ip_start IS 'Límite inferior del rango IPv4 en representación numérica entera';
COMMENT ON COLUMN ip_to_country.ip_end IS 'Límite superior del rango IPv4 en representación numérica entera';
-- <<< FIN MIGRACIÓN: 08_ip_to_country.sql <<<
