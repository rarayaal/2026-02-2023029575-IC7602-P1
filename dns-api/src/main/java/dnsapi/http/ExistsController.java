package dnsapi.http;

import dnsapi.records.DnsRecordRepository;
import dnsapi.records.RecordType;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

/**
 * Endpoint {@code GET /api/exists} (T-18).
 *
 * <p>Lo consume el DNS Interceptor: antes de resolver un nombre necesita saber si hay un registro
 * para ese host y de que tipo es, para escoger la estrategia de balanceo.</p>
 */
public final class ExistsController {

    public static final String PATH = "/api/exists";
    private static final String HOSTNAME_PARAM = "hostname";

    private final DnsRecordRepository records;

    public ExistsController(DnsRecordRepository records) {
        this.records = records;
    }

    public void register(Javalin app) {
        app.get(PATH, this::handle);
    }

    /**
     * Respuesta del contrato.
     *
     * @param exists   si hay un registro para el host
     * @param hostname el nombre ya normalizado, para que quien pregunta sepa que se busco
     * @param type     el tipo de registro, o {@code null} cuando no existe
     */
    public record ExistsResponse(boolean exists, String hostname, RecordType type) {
    }

    private void handle(Context ctx) {
        String requested = ctx.queryParam(HOSTNAME_PARAM);

        if (requested == null || requested.isBlank()) {
            ctx.status(HttpStatus.BAD_REQUEST).json(new ErrorResponse(
                    "missing_hostname",
                    "Falta el parametro obligatorio '" + HOSTNAME_PARAM + "'"));
            return;
        }

        String hostname = DnsRecordRepository.normalize(requested);
        RecordType type = records.findTypeByDomain(hostname).orElse(null);

        // Que el host no exista no es un error: es una respuesta valida a la pregunta, asi que 200.
        ctx.json(new ExistsResponse(type != null, hostname, type));
    }
}
