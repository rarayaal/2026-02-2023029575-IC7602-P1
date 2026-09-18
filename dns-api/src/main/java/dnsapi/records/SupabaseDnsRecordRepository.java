package dnsapi.records;

import com.fasterxml.jackson.databind.JsonNode;
import dnsapi.supabase.SupabaseClient;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Repositorio de registros DNS sobre las tablas de Supabase (esquema de T-25).
 *
 * <p>Traduce entre la forma de la base ({@code domain_name}, {@code ip_address}, {@code is_healthy},
 * en snake_case) y la forma del contrato ({@code domain}, {@code ip}, {@code status}). Asi los
 * consumidores del API no dependen de como estan nombradas las columnas.</p>
 */
public final class SupabaseDnsRecordRepository implements DnsRecordRepository {

    private static final String RECORDS = "dns_records";
    private static final String CONSENSUS = "view_target_consensus";

    /**
     * Columnas que se piden de cada registro. La parte entre parentesis le pide a Supabase que
     * incluya, dentro de cada registro, sus filas de {@code dns_record_targets}, y dentro de cada
     * target su health check. Es el equivalente a un JOIN, pero en una sola peticion HTTP.
     */
    private static final String RECORD_COLUMNS = "id,domain_name,record_type,ttl,is_active,"
            + "dns_record_targets(id,ip_address,weight,country_code,is_healthy,last_check_at,"
            + "health_check_configs(id))";

    private final SupabaseClient supabase;

    public SupabaseDnsRecordRepository(SupabaseClient supabase) {
        this.supabase = supabase;
    }

    @Override
    public Optional<RecordType> findTypeByDomain(String domain) {
        String query = "select=record_type"
                + "&domain_name=eq." + SupabaseClient.encode(DnsRecordRepository.normalize(domain))
                + "&is_active=eq.true"
                + "&limit=1";
        JsonNode rows = supabase.get(RECORDS, query);
        if (rows.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(RecordType.fromValue(rows.get(0).get("record_type").asText()));
    }

    @Override
    public List<DnsRecord> findAll(String domain, RecordType type) {
        StringBuilder query = new StringBuilder("select=").append(RECORD_COLUMNS).append("&order=domain_name");
        if (domain != null) {
            query.append("&domain_name=eq.").append(SupabaseClient.encode(DnsRecordRepository.normalize(domain)));
        }
        if (type != null) {
            query.append("&record_type=eq.").append(SupabaseClient.encode(type.value()));
        }
        return toRecords(supabase.get(RECORDS, query.toString()));
    }

    @Override
    public Optional<DnsRecord> findById(String id) {
        String query = "select=" + RECORD_COLUMNS + "&id=eq." + SupabaseClient.encode(id);
        return toRecords(supabase.get(RECORDS, query)).stream().findFirst();
    }

    /** Convierte las filas de Supabase en registros del contrato, agregando las latencias medidas. */
    private List<DnsRecord> toRecords(JsonNode rows) {
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<String, JsonNode> latencies = latenciesByTarget(rows);

        List<DnsRecord> records = new ArrayList<>();
        for (JsonNode row : rows) {
            List<DnsTarget> targets = new ArrayList<>();
            for (JsonNode target : row.path("dns_record_targets")) {
                targets.add(toTarget(target, latencies.get(target.get("id").asText())));
            }
            records.add(new DnsRecord(
                    row.get("id").asText(),
                    row.get("domain_name").asText(),
                    RecordType.fromValue(row.get("record_type").asText()),
                    row.get("ttl").asInt(),
                    row.get("is_active").asBoolean(),
                    targets));
        }
        return records;
    }

    private DnsTarget toTarget(JsonNode row, JsonNode latency) {
        // Solo se reporta la latencia si algun Health Checker de verdad midio esta IP. La vista
        // devuelve 0.0 cuando no hay mediciones, y un 0 haria que la estrategia round-trip
        // escogiera justamente la IP que nadie ha probado.
        boolean measured = latency != null && latency.path("total_reporting_instances").asInt() > 0;

        return new DnsTarget(
                row.get("id").asText(),
                row.get("ip_address").asText(),
                intOrNull(row.get("weight")),
                textOrNull(row.get("country_code")),
                status(row),
                healthCheckId(row.get("health_check_configs")),
                measured ? latency.get("avg_rtt_ms").asDouble() : null,
                measured ? latency.get("min_rtt_ms").asDouble() : null,
                textOrNull(row.get("last_check_at")));
    }

    /**
     * Deriva el estado de salud de una IP. En la base es un booleano mas la fecha del ultimo
     * chequeo; el contrato distingue ademas el caso de una IP que nunca se ha chequeado.
     */
    private static String status(JsonNode target) {
        if (textOrNull(target.get("last_check_at")) == null) {
            return "unknown";
        }
        return target.get("is_healthy").asBoolean() ? "healthy" : "unhealthy";
    }

    /**
     * Como cada IP tiene a lo sumo un health check, Supabase devuelve el health check embebido
     * como un objeto, o como una lista de un elemento segun la version. Se aceptan las dos formas.
     */
    private static String healthCheckId(JsonNode embedded) {
        if (embedded == null || embedded.isNull()) {
            return null;
        }
        JsonNode check = embedded.isArray() ? embedded.path(0) : embedded;
        return textOrNull(check.get("id"));
    }

    /**
     * Trae de la vista de consenso las latencias de todos los targets de estos registros, en una
     * sola peticion, y las indexa por id de target.
     */
    private Map<String, JsonNode> latenciesByTarget(JsonNode records) {
        List<String> recordIds = new ArrayList<>();
        records.forEach(row -> recordIds.add(row.get("id").asText()));

        String query = "select=target_id,avg_rtt_ms,min_rtt_ms,total_reporting_instances"
                + "&record_id=in.(" + recordIds.stream().map(SupabaseClient::encode).collect(Collectors.joining(",")) + ")";

        Map<String, JsonNode> byTarget = new HashMap<>();
        for (JsonNode row : supabase.get(CONSENSUS, query)) {
            byTarget.put(row.get("target_id").asText(), row);
        }
        return byTarget;
    }

    private static String textOrNull(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.asText();
    }

    private static Integer intOrNull(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.asInt();
    }
}
