package dnsapi.http;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dnsapi.dns.DnsResolutionException;
import dnsapi.dns.UdpDnsClient;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import java.util.Base64;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Endpoint {@code POST /api/dns_resolver} (T-20), seccion 7 del contrato.
 *
 * <p>Lo usa el DNS Interceptor cuando no puede resolver un paquete por su cuenta: se lo manda al
 * API codificado en BASE64, el API lo reenvia tal cual a un servidor DNS remoto y le devuelve la
 * respuesta, tambien en BASE64.</p>
 *
 * <p>El API no interpreta el paquete. Solo lo transporta, que es justo lo que pide el enunciado:
 * un servicio no orientado a conexion (DNS sobre UDP) viajando sobre uno orientado a conexion
 * (HTTP sobre TCP).</p>
 */
public final class DnsResolverController {

    private static final Logger log = LoggerFactory.getLogger(DnsResolverController.class);

    public static final String PATH = "/api/dns_resolver";

    /** Un mensaje DNS siempre arranca con un encabezado de 12 bytes (RFC1035). */
    private static final int DNS_HEADER_SIZE = 12;

    private final UdpDnsClient dnsClient;

    public DnsResolverController(UdpDnsClient dnsClient) {
        this.dnsClient = dnsClient;
    }

    /** El cuerpo, tanto de la peticion como de la respuesta: el paquete DNS en BASE64. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record PacketPayload(String data) {
    }

    public void register(Javalin app) {
        app.post(PATH, this::handle);

        app.exception(DnsResolutionException.class, (exception, ctx) -> {
            log.warn("No se pudo resolver el paquete contra el servidor DNS remoto: {}", exception.getMessage());
            ctx.status(HttpStatus.BAD_GATEWAY)
                    .json(new ErrorResponse("dns_unreachable", exception.getMessage()));
        });
    }

    private void handle(Context ctx) {
        PacketPayload body;
        try {
            body = ctx.bodyAsClass(PacketPayload.class);
        } catch (Exception e) {
            badRequest(ctx, "invalid_body", "El cuerpo debe ser un JSON con el campo 'data'");
            return;
        }

        if (body == null || body.data() == null || body.data().isBlank()) {
            badRequest(ctx, "invalid_body", "El campo 'data' es obligatorio");
            return;
        }

        byte[] query;
        try {
            query = Base64.getDecoder().decode(body.data().trim());
        } catch (IllegalArgumentException e) {
            badRequest(ctx, "invalid_base64", "El campo 'data' no esta codificado en BASE64 valido");
            return;
        }

        if (query.length < DNS_HEADER_SIZE) {
            badRequest(ctx, "invalid_packet",
                    "El paquete tiene " + query.length + " bytes; un mensaje DNS necesita al menos " + DNS_HEADER_SIZE);
            return;
        }

        byte[] response = dnsClient.resolve(query);
        ctx.json(new PacketPayload(Base64.getEncoder().encodeToString(response)));
    }

    private static void badRequest(Context ctx, String code, String message) {
        ctx.status(HttpStatus.BAD_REQUEST).json(new ErrorResponse(code, message));
    }
}
