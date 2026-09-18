package dnsapi.http;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dnsapi.records.DnsRecord;
import dnsapi.records.DnsRecordRepository;
import dnsapi.records.DnsTarget;
import dnsapi.records.DuplicateDomainException;
import dnsapi.records.RecordType;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * CRUD de registros DNS (T-21), seccion 4 del contrato.
 *
 * <p>Lo usan la DNS UI para administrar los registros y el DNS Interceptor para traer las IPs de un
 * dominio con {@code GET /api/records?domain=}.</p>
 */
public final class RecordsController {

    public static final String PATH = "/api/records";

    private static final int DEFAULT_TTL = 300;
    private static final int MAX_DOMAIN_LENGTH = 253;

    private final DnsRecordRepository records;

    public RecordsController(DnsRecordRepository records) {
        this.records = records;
    }

    /**
     * Lo que el API acepta en el cuerpo de un POST o PUT. Es distinto de {@link DnsRecord} a
     * proposito: aqui todo puede venir ausente, para poder validarlo y aplicar valores por omision,
     * y no existen los campos que el cliente no debe escribir (el id del registro y el status).
     * Los campos desconocidos se ignoran, para que la UI pueda mandar el objeto tal como lo tiene.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record RecordRequest(String domain, String type, Integer ttl, Boolean isActive, List<TargetRequest> targets) {
    }

    /** Un target en el cuerpo. El {@code id} solo viene en un PUT, para conservar un target existente. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TargetRequest(String id, String ip, Integer weight, String country) {
    }

    /** El cuerpo o los parametros no cumplen el contrato. Se responde {@code 400}. */
    static final class InvalidRequestException extends RuntimeException {
        private final String code;

        InvalidRequestException(String code, String message) {
            super(message);
            this.code = code;
        }
    }

    public void register(Javalin app) {
        app.get(PATH, this::list);
        app.get(PATH + "/{id}", this::get);
        app.post(PATH, this::create);
        app.put(PATH + "/{id}", this::update);
        app.delete(PATH + "/{id}", this::delete);

        app.exception(InvalidRequestException.class, (e, ctx) ->
                ctx.status(HttpStatus.BAD_REQUEST).json(new ErrorResponse(e.code, e.getMessage())));
        app.exception(DuplicateDomainException.class, (e, ctx) ->
                ctx.status(HttpStatus.CONFLICT).json(new ErrorResponse("duplicate_domain", e.getMessage())));
    }

    private void list(Context ctx) {
        String domain = ctx.queryParam("domain");
        String type = ctx.queryParam("type");
        ctx.json(records.findAll(
                blank(domain) ? null : domain,
                blank(type) ? null : parseType(type)));
    }

    private void get(Context ctx) {
        String id = ctx.pathParam("id");
        records.findById(id).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void create(Context ctx) {
        DnsRecord created = records.create(validate(readBody(ctx)));
        ctx.status(HttpStatus.CREATED).json(created);
    }

    private void update(Context ctx) {
        String id = ctx.pathParam("id");
        records.update(id, validate(readBody(ctx))).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void delete(Context ctx) {
        String id = ctx.pathParam("id");
        if (records.delete(id)) {
            ctx.status(HttpStatus.NO_CONTENT);
        } else {
            notFound(ctx, id);
        }
    }

    private static void notFound(Context ctx, String id) {
        ctx.status(HttpStatus.NOT_FOUND).json(new ErrorResponse("not_found", "No existe el registro con id " + id));
    }

    private static RecordRequest readBody(Context ctx) {
        try {
            RecordRequest body = ctx.bodyAsClass(RecordRequest.class);
            if (body == null) {
                throw new InvalidRequestException("invalid_body", "El cuerpo de la peticion esta vacio");
            }
            return body;
        } catch (InvalidRequestException e) {
            throw e;
        } catch (Exception e) {
            // Jackson reporta un JSON mal formado con una IOException, que Java no obliga a declarar
            // aqui porque bodyAsClass esta escrito en Kotlin. Por eso se atrapa Exception y no solo
            // RuntimeException.
            throw new InvalidRequestException("invalid_body", "El cuerpo no es un JSON valido para un registro DNS");
        }
    }

    /**
     * Revisa el cuerpo contra las reglas de la seccion 3 del contrato y lo convierte en un
     * {@link DnsRecord}. De cada target se conservan solo los campos que usa el tipo del registro:
     * un {@code country} en un registro {@code single} no significa nada y no se guarda.
     */
    private static DnsRecord validate(RecordRequest body) {
        String domain = DnsRecordRepository.normalize(body.domain());
        if (domain.isEmpty()) {
            throw new InvalidRequestException("invalid_body", "El campo 'domain' es obligatorio");
        }
        if (domain.length() > MAX_DOMAIN_LENGTH) {
            throw new InvalidRequestException("invalid_body",
                    "El dominio no puede tener mas de " + MAX_DOMAIN_LENGTH + " caracteres");
        }

        if (blank(body.type())) {
            throw new InvalidRequestException("invalid_body", "El campo 'type' es obligatorio");
        }
        RecordType type = parseType(body.type());

        int ttl = body.ttl() == null ? DEFAULT_TTL : body.ttl();
        if (ttl <= 0) {
            throw new InvalidRequestException("invalid_body", "El 'ttl' debe ser mayor que cero");
        }

        // La base usa true por omision; sin esto, un registro creado sin el campo naceria apagado.
        boolean isActive = body.isActive() == null || body.isActive();

        List<TargetRequest> incoming = body.targets() == null ? List.of() : body.targets();
        checkTargetCount(type, incoming.size());

        List<DnsTarget> targets = new ArrayList<>();
        for (TargetRequest target : incoming) {
            targets.add(validateTarget(type, target));
        }
        return new DnsRecord(null, domain, type, ttl, isActive, targets);
    }

    private static void checkTargetCount(RecordType type, int count) {
        if (count == 0) {
            throw new InvalidRequestException("invalid_body", "El registro necesita al menos una IP en 'targets'");
        }
        if (type == RecordType.SINGLE && count != 1) {
            throw new InvalidRequestException("invalid_body", "Un registro 'single' lleva exactamente una IP");
        }
        if (type == RecordType.MULTI && count < 2) {
            throw new InvalidRequestException("invalid_body", "Un registro 'multi' lleva dos IPs o mas");
        }
    }

    private static DnsTarget validateTarget(RecordType type, TargetRequest target) {
        if (target == null || !isIpv4(target.ip())) {
            String ip = target == null ? null : target.ip();
            throw new InvalidRequestException("invalid_body", "IP invalida en 'targets': " + ip);
        }

        Integer weight = null;
        if (type == RecordType.WEIGHT) {
            weight = target.weight();
            if (weight == null || weight <= 0) {
                throw new InvalidRequestException("invalid_body",
                        "En un registro 'weight' cada IP necesita un 'weight' mayor que cero (" + target.ip() + ")");
            }
        }

        String country = null;
        if (type == RecordType.GEO) {
            country = target.country() == null ? "" : target.country().trim().toUpperCase(Locale.ROOT);
            if (!country.matches("[A-Z]{2}")) {
                throw new InvalidRequestException("invalid_body",
                        "En un registro 'geo' cada IP necesita un 'country' de dos letras (" + target.ip() + ")");
            }
        }

        return new DnsTarget(target.id(), target.ip().trim(), weight, country, null, null, null, null, null);
    }

    private static RecordType parseType(String text) {
        try {
            return RecordType.fromValue(text);
        } catch (IllegalArgumentException e) {
            throw new InvalidRequestException("invalid_type",
                    "Tipo de registro desconocido: " + text + ". Validos: single, multi, weight, geo, round-trip");
        }
    }

    /** Una IPv4 en notacion de puntos: cuatro numeros de 0 a 255. */
    private static boolean isIpv4(String ip) {
        if (ip == null) {
            return false;
        }
        String[] octets = ip.trim().split("\\.", -1);
        if (octets.length != 4) {
            return false;
        }
        for (String octet : octets) {
            if (!octet.matches("\\d{1,3}") || Integer.parseInt(octet) > 255) {
                return false;
            }
        }
        return true;
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
