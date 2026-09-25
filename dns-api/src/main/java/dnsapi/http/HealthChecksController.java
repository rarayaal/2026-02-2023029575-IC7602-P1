package dnsapi.http;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dnsapi.healthchecks.BasicAuth;
import dnsapi.healthchecks.DuplicateHealthCheckException;
import dnsapi.healthchecks.HealthCheck;
import dnsapi.healthchecks.HealthCheckProtocol;
import dnsapi.healthchecks.HealthCheckRepository;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import java.util.ArrayList;
import java.util.List;

/**
 * CRUD de health checks (T-45), seccion 6 del contrato.
 *
 * <p>Lo usa la DNS UI para configurar como se monitorea cada IP. El que ejecuta los chequeos es el
 * Health Checker, que lee esta configuracion directamente de la base.</p>
 */
public final class HealthChecksController {

    public static final String PATH = "/api/health-checks";

    private static final String DEFAULT_PATH = "/";
    private static final int DEFAULT_TIMEOUT_MS = 5000;
    private static final int DEFAULT_RETRIES = 3;
    private static final int DEFAULT_INTERVAL_SECONDS = 30;
    private static final int MAX_PORT = 65535;
    private static final List<Integer> DEFAULT_STATUSES = List.of(200);

    private final HealthCheckRepository checks;

    public HealthChecksController(HealthCheckRepository checks) {
        this.checks = checks;
    }

    /** Cuerpo aceptado al crear o modificar. Todo puede venir ausente para aplicar los valores por omision. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record HealthCheckRequest(
            String targetId,
            String protocol,
            Integer port,
            String path,
            List<Integer> expectedStatuses,
            BasicAuthRequest basicAuth,
            Integer timeoutMs,
            Integer retries,
            Integer intervalSeconds,
            Boolean isEnabled) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record BasicAuthRequest(String username, String password) {
    }

    public void register(Javalin app) {
        app.get(PATH, ctx -> ctx.json(checks.findAll()));
        app.get(PATH + "/{id}", this::get);
        app.post(PATH, this::create);
        app.put(PATH + "/{id}", this::update);
        app.delete(PATH + "/{id}", this::delete);

        app.exception(DuplicateHealthCheckException.class, (e, ctx) ->
                ctx.status(HttpStatus.CONFLICT).json(new ErrorResponse("duplicate_health_check", e.getMessage())));
    }

    private void get(Context ctx) {
        String id = ctx.pathParam("id");
        checks.findById(id).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void create(Context ctx) {
        HealthCheckRequest body = readBody(ctx);
        if (body.targetId() == null || body.targetId().isBlank()) {
            throw new InvalidRequestException("invalid_body",
                    "El campo 'targetId' es obligatorio: un health check pertenece a una IP");
        }
        ctx.status(HttpStatus.CREATED).json(checks.create(validate(body)));
    }

    private void update(Context ctx) {
        String id = ctx.pathParam("id");
        checks.update(id, validate(readBody(ctx))).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void delete(Context ctx) {
        String id = ctx.pathParam("id");
        if (checks.delete(id)) {
            ctx.status(HttpStatus.NO_CONTENT);
        } else {
            notFound(ctx, id);
        }
    }

    private static void notFound(Context ctx, String id) {
        ctx.status(HttpStatus.NOT_FOUND).json(new ErrorResponse("not_found", "No existe el health check con id " + id));
    }

    private static HealthCheckRequest readBody(Context ctx) {
        try {
            HealthCheckRequest body = ctx.bodyAsClass(HealthCheckRequest.class);
            if (body == null) {
                throw new InvalidRequestException("invalid_body", "El cuerpo de la peticion esta vacio");
            }
            return body;
        } catch (InvalidRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidRequestException("invalid_body", "El cuerpo no es un JSON valido para un health check");
        }
    }

    private static HealthCheck validate(HealthCheckRequest body) {
        HealthCheckProtocol protocol;
        try {
            protocol = HealthCheckProtocol.fromValue(body.protocol());
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("invalid_protocol",
                    "El campo 'protocol' debe ser TCP o HTTP, se recibio: " + body.protocol());
        }

        if (body.port() == null || body.port() < 1 || body.port() > MAX_PORT) {
            throw new InvalidRequestException("invalid_body", "El 'port' debe estar entre 1 y " + MAX_PORT);
        }

        int timeoutMs = positive(body.timeoutMs(), DEFAULT_TIMEOUT_MS, "timeoutMs");
        int intervalSeconds = positive(body.intervalSeconds(), DEFAULT_INTERVAL_SECONDS, "intervalSeconds");

        int retries = body.retries() == null ? DEFAULT_RETRIES : body.retries();
        if (retries < 0) {
            throw new InvalidRequestException("invalid_body", "El campo 'retries' no puede ser negativo");
        }

        boolean isEnabled = body.isEnabled() == null || body.isEnabled();

        // Lo que sigue solo tiene sentido en HTTP: en un chequeo TCP se descarta, igual que se
        // descartan los campos que no aplican al tipo de un registro DNS.
        String path = null;
        List<Integer> statuses = null;
        BasicAuth basicAuth = null;

        if (protocol == HealthCheckProtocol.HTTP) {
            path = (body.path() == null || body.path().isBlank()) ? DEFAULT_PATH : body.path().trim();
            statuses = validateStatuses(body.expectedStatuses());
            basicAuth = validateBasicAuth(body.basicAuth());
        }

        return new HealthCheck(null, body.targetId(), protocol, body.port(), path, statuses,
                basicAuth, timeoutMs, retries, intervalSeconds, isEnabled);
    }

    private static List<Integer> validateStatuses(List<Integer> statuses) {
        if (statuses == null || statuses.isEmpty()) {
            return DEFAULT_STATUSES;
        }
        List<Integer> valid = new ArrayList<>();
        for (Integer status : statuses) {
            if (status == null || status < 100 || status > 599) {
                throw new InvalidRequestException("invalid_body",
                        "Los codigos de 'expectedStatuses' deben estar entre 100 y 599, se recibio: " + status);
            }
            valid.add(status);
        }
        return valid;
    }

    private static BasicAuth validateBasicAuth(BasicAuthRequest auth) {
        if (auth == null || auth.username() == null || auth.username().isBlank()) {
            return null;
        }
        // La contrasena puede venir nula al editar: la interfaz nunca la recibe de vuelta, asi que
        // en ese caso se conserva la que ya estaba guardada.
        return new BasicAuth(auth.username().trim(), auth.password());
    }

    private static int positive(Integer value, int fallback, String field) {
        if (value == null) {
            return fallback;
        }
        if (value <= 0) {
            throw new InvalidRequestException("invalid_body", "El campo '" + field + "' debe ser mayor que cero");
        }
        return value;
    }
}
