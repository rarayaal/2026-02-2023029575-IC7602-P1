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
