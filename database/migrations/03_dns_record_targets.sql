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
