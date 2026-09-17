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
