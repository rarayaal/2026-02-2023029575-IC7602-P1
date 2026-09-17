package dnsapi.supabase;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

/**
 * Cliente HTTP minimo para la API REST de Supabase.
 *
 * <p>Supabase expone cada tabla y vista de la base como un recurso REST (PostgREST): un GET a
 * {@code /rest/v1/dns_records} lee la tabla, un POST inserta, un PATCH actualiza y un DELETE borra.
 * Los filtros viajan en la query string, por ejemplo {@code domain_name=eq.api.company.com}.</p>
 *
 * <p>Esta clase solo se encarga del transporte: arma la URL, pone los encabezados de autenticacion,
 * manda la peticion y convierte la respuesta a JSON. Que tablas se consultan y como se interpretan
 * los datos es trabajo de los repositorios.</p>
 */
public final class SupabaseClient {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final HttpClient http;
    private final ObjectMapper json;
    private final String restUrl;
    private final String key;

    public SupabaseClient(String supabaseUrl, String key) {
        // Un solo HttpClient para todo el API: reutiliza conexiones y es seguro entre hilos.
        this.http = HttpClient.newBuilder().connectTimeout(TIMEOUT).build();
        this.json = new ObjectMapper();
        this.restUrl = supabaseUrl + "/rest/v1/";
        this.key = key;
    }

    /** Lee filas de una tabla o vista. {@code query} es la query string ya armada, sin el "?". */
    public JsonNode get(String resource, String query) {
        return send(request(resource, query).GET());
    }

    /** Inserta una o varias filas y devuelve las filas creadas, con los ids que asigno la base. */
    public JsonNode post(String resource, Object body) {
        return send(request(resource, "")
                .header("Prefer", "return=representation")
                .POST(bodyOf(body)));
    }

    /** Actualiza las filas que cumplan el filtro y devuelve como quedaron. */
    public JsonNode patch(String resource, String query, Object body) {
        return send(request(resource, query)
                .header("Prefer", "return=representation")
                .method("PATCH", bodyOf(body)));
    }

    /** Borra las filas que cumplan el filtro. */
    public void delete(String resource, String query) {
        send(request(resource, query).DELETE());
    }

    /** Codifica un valor para usarlo dentro de un filtro de la query string. */
    public static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private HttpRequest.Builder request(String resource, String query) {
        String url = restUrl + resource + (query.isEmpty() ? "" : "?" + query);
        return HttpRequest.newBuilder(URI.create(url))
                .timeout(TIMEOUT)
                // Supabase pide la llave dos veces: como apikey para su gateway, y como token para
                // la base de datos.
                .header("apikey", key)
                .header("Authorization", "Bearer " + key)
                .header("Content-Type", "application/json")
                .header("Accept", "application/json");
    }

    private HttpRequest.BodyPublisher bodyOf(Object body) {
        try {
            return HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body));
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("No se pudo convertir el cuerpo a JSON", e);
        }
    }

    private JsonNode send(HttpRequest.Builder builder) {
        HttpRequest request = builder.build();
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (IOException e) {
            throw new SupabaseException("No se pudo contactar a Supabase: " + e.getMessage(), e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SupabaseException("Se interrumpio la llamada a Supabase", e);
        }

        int status = response.statusCode();
        if (status < 200 || status >= 300) {
            // No se incluye la URL completa en el mensaje: puede terminar en los logs.
            throw new SupabaseException(status,
                    "Supabase respondio " + status + " en " + request.method() + " " + request.uri().getPath()
                            + ": " + response.body());
        }

        String body = response.body();
        if (body == null || body.isBlank()) {
            return json.createArrayNode();
        }
        try {
            return json.readTree(body);
        } catch (JsonProcessingException e) {
            throw new SupabaseException(status, "Supabase devolvio algo que no es JSON: " + body);
        }
    }
}
