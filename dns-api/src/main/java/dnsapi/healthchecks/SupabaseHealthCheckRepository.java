package dnsapi.healthchecks;

import com.fasterxml.jackson.databind.JsonNode;
import dnsapi.supabase.SupabaseClient;
import dnsapi.supabase.SupabaseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Repositorio de health checks sobre la tabla {@code health_check_configs} de Supabase. */
public final class SupabaseHealthCheckRepository implements HealthCheckRepository {

    private static final String TABLE = "health_check_configs";
    private static final String COLUMNS = "id,target_id,protocol,port,path,expected_statuses,"
            + "basic_auth_user,basic_auth_pass,timeout_ms,retries,interval_seconds,is_enabled,"
            + "dns_record_targets(ip_address)";

    /** Codigo con el que Supabase avisa que se violo una restriccion unica. */
    private static final int CONFLICT = 409;

    private final SupabaseClient supabase;

    public SupabaseHealthCheckRepository(SupabaseClient supabase) {
        this.supabase = supabase;
    }

    @Override
    public List<HealthCheck> findAll() {
        List<HealthCheck> checks = new ArrayList<>();
        for (JsonNode row : supabase.get(TABLE, "select=" + COLUMNS)) {
            checks.add(toCheck(row));
        }
        return checks;
    }

    @Override
    public Optional<HealthCheck> findById(String id) {
        if (!isUuid(id)) {
            return Optional.empty();
        }
        JsonNode rows = supabase.get(TABLE, "select=" + COLUMNS + "&id=eq." + SupabaseClient.encode(id));
        return rows.isEmpty() ? Optional.empty() : Optional.of(toCheck(rows.get(0)));
    }

    @Override
    public HealthCheck create(HealthCheck check) {
        String targetUuid = resolveTargetUuid(check.targetId());
        try {
            JsonNode created = supabase.post(TABLE, toColumns(check, targetUuid));
            String newId = created.get(0).get("id").asText();
            return findById(newId).orElseGet(() -> toCheck(created.get(0)));
        } catch (SupabaseException e) {
            if (e.status() == CONFLICT) {
                throw new DuplicateHealthCheckException(check.targetId());
            }
            throw e;
        }
    }

    @Override
    public Optional<HealthCheck> update(String id, HealthCheck check) {
        if (!isUuid(id)) {
            return Optional.empty();
        }
        JsonNode updated;
        try {
            updated = supabase.patch(TABLE, "id=eq." + SupabaseClient.encode(id), toColumns(check, null));
        } catch (SupabaseException e) {
            if (e.status() == CONFLICT) {
                throw new DuplicateHealthCheckException(check.targetId());
            }
            throw e;
        }
        return updated.isEmpty() ? Optional.empty() : findById(id);
    }

    @Override
    public boolean delete(String id) {
        if (!isUuid(id)) {
            return false;
        }
        return !supabase.delete(TABLE, "id=eq." + SupabaseClient.encode(id)).isEmpty();
    }

    private String resolveTargetUuid(String targetIdOrIp) {
        if (targetIdOrIp == null || targetIdOrIp.isBlank()) {
            throw new IllegalArgumentException("El campo targetId o IP es obligatorio para el health check");
        }
        if (isUuid(targetIdOrIp)) {
            return targetIdOrIp;
        }

        // Buscar target por direccion IP en dns_record_targets
        JsonNode targets = supabase.get("dns_record_targets",
                "select=id&ip_address=eq." + SupabaseClient.encode(targetIdOrIp) + "&limit=1");
        if (!targets.isEmpty()) {
            return targets.get(0).get("id").asText();
        }

        // Si la IP no existe en ningun registro aun, asociar a un registro predeterminado local
        JsonNode records = supabase.get("dns_records",
                "select=id&domain_name=eq.healthcheck.local&limit=1");
        String recordId;
        if (!records.isEmpty()) {
            recordId = records.get(0).get("id").asText();
        } else {
            Map<String, Object> newRecord = new LinkedHashMap<>();
            newRecord.put("domain_name", "healthcheck.local");
            newRecord.put("record_type", "single");
            newRecord.put("ttl", 300);
            newRecord.put("is_active", true);
            JsonNode createdRecord = supabase.post("dns_records", newRecord);
            recordId = createdRecord.get(0).get("id").asText();
        }

        Map<String, Object> newTarget = new LinkedHashMap<>();
        newTarget.put("record_id", recordId);
        newTarget.put("ip_address", targetIdOrIp);
        newTarget.put("weight", 1);
        newTarget.put("is_healthy", true);
        newTarget.put("is_active", true);
        JsonNode createdTarget = supabase.post("dns_record_targets", newTarget);
        return createdTarget.get(0).get("id").asText();
    }

    private static HealthCheck toCheck(JsonNode row) {
        List<Integer> statuses = new ArrayList<>();
        for (JsonNode status : row.path("expected_statuses")) {
            statuses.add(status.asInt());
        }

        String user = textOrNull(row.get("basic_auth_user"));
        // La contrasena nunca sale del API: se devuelve en null aunque la base la tenga guardada.
        BasicAuth basicAuth = user == null ? null : new BasicAuth(user, null);

        String targetUuid = textOrNull(row.get("target_id"));
        String targetIp = textOrNull(row.path("dns_record_targets").get("ip_address"));
        String targetDisplay = (targetIp != null && !targetIp.isBlank()) ? targetIp : targetUuid;

        return new HealthCheck(
                row.get("id").asText(),
                targetDisplay,
                HealthCheckProtocol.fromValue(row.get("protocol").asText()),
                row.get("port").asInt(),
                textOrNull(row.get("path")),
                statuses.isEmpty() ? null : statuses,
                basicAuth,
                row.get("timeout_ms").asInt(),
                row.get("retries").asInt(),
                row.get("interval_seconds").asInt(),
                row.get("is_enabled").asBoolean());
    }

    /**
     * Traduce el health check a columnas de la base.
     *
     * @param targetUuid al crear se pasa el UUID del target resuelto
     */
    private static Map<String, Object> toColumns(HealthCheck check, String targetUuid) {
        Map<String, Object> row = new LinkedHashMap<>();
        if (targetUuid != null) {
            row.put("target_id", targetUuid);
        }
        row.put("protocol", check.protocol().value());
        row.put("port", check.port());
        row.put("path", check.path());
        row.put("expected_statuses", check.expectedStatuses());
        row.put("timeout_ms", check.timeoutMs());
        row.put("retries", check.retries());
        row.put("interval_seconds", check.intervalSeconds());
        row.put("is_enabled", check.isEnabled());

        if (check.basicAuth() == null) {
            // Sin credenciales: se limpian las dos columnas.
            row.put("basic_auth_user", null);
            row.put("basic_auth_pass", null);
        } else {
            row.put("basic_auth_user", check.basicAuth().username());
            // Si viene sin contrasena, se deja la que ya estaba guardada: la interfaz nunca la
            // recibe, asi que al editar el resto del formulario la mandaria vacia y se perderia.
            if (check.basicAuth().password() != null) {
                row.put("basic_auth_pass", check.basicAuth().password());
            }
        }
        return row;
    }

    private static boolean isUuid(String id) {
        try {
            UUID.fromString(id);
            return true;
        } catch (IllegalArgumentException | NullPointerException e) {
            return false;
        }
    }

    private static String textOrNull(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.asText();
    }
}
