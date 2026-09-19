-- View: Último reporte de salud de cada target por cada instancia activa
-- Se descartan instancias inactivas (sin heartbeat reciente) y reportes obsoletos
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

-- 2. Vista de Consenso de Mayoría Simple por cada target
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
    -- Contar votos de la última evaluación de cada instancia activa
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

