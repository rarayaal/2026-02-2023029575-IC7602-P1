package dnsapi.ipcountry;

import com.fasterxml.jackson.databind.JsonNode;
import dnsapi.supabase.SupabaseClient;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Repositorio de IP-to-Country sobre Supabase.
 *
 * <p>Traduce los extremos del rango entre la notacion de puntos que usa el API y los numeros que
 * guarda la base.</p>
 */
public final class SupabaseIpCountryRepository implements IpCountryRepository {

    private static final String TABLE = "ip_to_country";
    private static final String COLUMNS = "id,ip_start,ip_end,country_code,country_name,city,latitude,longitude";

    /** Funcion que dejo el esquema (T-25) para resolver una IP de un solo golpe. */
    private static final String LOOKUP_FUNCTION = "rpc/lookup_ip_geo";

    private final SupabaseClient supabase;

    public SupabaseIpCountryRepository(SupabaseClient supabase) {
        this.supabase = supabase;
    }

    @Override
    public List<IpRange> findAll() {
        List<IpRange> ranges = new ArrayList<>();
        for (JsonNode row : supabase.get(TABLE, "select=" + COLUMNS + "&order=ip_start")) {
            ranges.add(toRange(row));
        }
        return ranges;
    }

    @Override
    public Optional<IpRange> findById(String id) {
        if (!isNumericId(id)) {
            return Optional.empty();
        }
        JsonNode rows = supabase.get(TABLE, "select=" + COLUMNS + "&id=eq." + SupabaseClient.encode(id));
        return rows.isEmpty() ? Optional.empty() : Optional.of(toRange(rows.get(0)));
    }

    @Override
    public IpRange create(IpRange range) {
        JsonNode created = supabase.post(TABLE, toColumns(range));
        return toRange(created.get(0));
    }

    @Override
    public Optional<IpRange> update(String id, IpRange range) {
        if (!isNumericId(id)) {
            return Optional.empty();
        }
        JsonNode updated = supabase.patch(TABLE, "id=eq." + SupabaseClient.encode(id), toColumns(range));
        return updated.isEmpty() ? Optional.empty() : Optional.of(toRange(updated.get(0)));
    }

    @Override
    public boolean delete(String id) {
        if (!isNumericId(id)) {
            return false;
        }
        return !supabase.delete(TABLE, "id=eq." + SupabaseClient.encode(id)).isEmpty();
    }

    @Override
    public Optional<GeoLocation> lookup(String ip) {
        // La busqueda se resuelve en la base con la funcion lookup_ip_geo: convierte la IP a numero
        // y devuelve el rango que la contiene. Traerse la tabla completa al API para recorrerla
        // seria mucho mas lento, porque son miles de rangos.
        Map<String, Object> body = Map.of("p_ip_text", ip);
        JsonNode rows = supabase.post(LOOKUP_FUNCTION, body);
        if (rows.isEmpty()) {
            return Optional.empty();
        }

        JsonNode row = rows.isArray() ? rows.get(0) : rows;
        return Optional.of(new GeoLocation(
                ip,
                textOrNull(row.get("country_code")),
                textOrNull(row.get("country_name")),
                textOrNull(row.get("city")),
                doubleOrNull(row.get("latitude")),
                doubleOrNull(row.get("longitude"))));
    }

    private static IpRange toRange(JsonNode row) {
        return new IpRange(
                row.get("id").asText(),
                Ipv4.toDotted(row.get("ip_start").asLong()),
                Ipv4.toDotted(row.get("ip_end").asLong()),
                textOrNull(row.get("country_code")),
                textOrNull(row.get("country_name")),
                textOrNull(row.get("city")),
                doubleOrNull(row.get("latitude")),
                doubleOrNull(row.get("longitude")));
    }

    private static Map<String, Object> toColumns(IpRange range) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("ip_start", Ipv4.toNumber(range.ipStart()));
        row.put("ip_end", Ipv4.toNumber(range.ipEnd()));
        row.put("country_code", range.countryCode());
        row.put("country_name", range.countryName());
        row.put("city", range.city());
        row.put("latitude", range.latitude());
        row.put("longitude", range.longitude());
        return row;
    }

    /** Los id de esta tabla son enteros que asigna la base, no UUID como en los registros DNS. */
    private static boolean isNumericId(String id) {
        return id != null && id.matches("\\d{1,19}");
    }

    private static String textOrNull(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.asText();
    }

    private static Double doubleOrNull(JsonNode node) {
        return (node == null || node.isNull()) ? null : node.asDouble();
    }
}
