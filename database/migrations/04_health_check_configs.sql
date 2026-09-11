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
