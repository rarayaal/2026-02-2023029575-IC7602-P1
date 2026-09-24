package dnsapi.http;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import dnsapi.ipcountry.GeoLocation;
import dnsapi.ipcountry.IpCountryRepository;
import dnsapi.ipcountry.IpRange;
import dnsapi.ipcountry.Ipv4;
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import java.util.Locale;

/**
 * CRUD de IP-to-Country y busqueda geografica (T-22), seccion 5 del contrato.
 *
 * <p>La UI administra los rangos y el DNS Interceptor usa la busqueda para resolver los registros
 * de tipo {@code geo}: toma la IP de origen del cliente y pregunta en que pais cae.</p>
 */
public final class IpCountryController {

    public static final String PATH = "/api/ip-country";
    public static final String LOOKUP_PATH = PATH + "/lookup";

    private final IpCountryRepository ranges;

    public IpCountryController(IpCountryRepository ranges) {
        this.ranges = ranges;
    }

    /**
     * Cuerpo aceptado al crear o modificar un rango. El rango se puede expresar de dos formas: con
     * su IP inicial y final, o con una notacion CIDR que el API expande.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record IpRangeRequest(
            String cidr,
            String ipStart,
            String ipEnd,
            String countryCode,
            String countryName,
            String city,
            Double latitude,
            Double longitude) {
    }

    public void register(Javalin app) {
        // La ruta de busqueda se registra antes que la de {id} para que "lookup" no se interprete
        // como el id de un rango.
        app.get(LOOKUP_PATH, this::lookup);

        app.get(PATH, ctx -> ctx.json(ranges.findAll()));
        app.get(PATH + "/{id}", this::get);
        app.post(PATH, this::create);
        app.put(PATH + "/{id}", this::update);
        app.delete(PATH + "/{id}", this::delete);
    }

    private void lookup(Context ctx) {
        String ip = ctx.queryParam("ip");
        if (ip == null || ip.isBlank()) {
            throw new InvalidRequestException("invalid_body", "Falta el parametro obligatorio 'ip'");
        }
        if (!Ipv4.isValid(ip)) {
            throw new InvalidRequestException("invalid_ip", "La IP no es una IPv4 valida: " + ip);
        }

        // Que no se encuentre no es un error: es una respuesta valida, igual que en /api/exists.
        GeoLocation location = ranges.lookup(ip.trim())
                .orElseGet(() -> new GeoLocation(ip.trim(), null, null, null, null, null));
        ctx.json(location);
    }

    private void get(Context ctx) {
        String id = ctx.pathParam("id");
        ranges.findById(id).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void create(Context ctx) {
        ctx.status(HttpStatus.CREATED).json(ranges.create(validate(readBody(ctx))));
    }

    private void update(Context ctx) {
        String id = ctx.pathParam("id");
        ranges.update(id, validate(readBody(ctx))).ifPresentOrElse(ctx::json, () -> notFound(ctx, id));
    }

    private void delete(Context ctx) {
        String id = ctx.pathParam("id");
        if (ranges.delete(id)) {
            ctx.status(HttpStatus.NO_CONTENT);
        } else {
            notFound(ctx, id);
        }
    }

    private static void notFound(Context ctx, String id) {
        ctx.status(HttpStatus.NOT_FOUND).json(new ErrorResponse("not_found", "No existe el rango con id " + id));
    }

    private static IpRangeRequest readBody(Context ctx) {
        try {
            IpRangeRequest body = ctx.bodyAsClass(IpRangeRequest.class);
            if (body == null) {
                throw new InvalidRequestException("invalid_body", "El cuerpo de la peticion esta vacio");
            }
            return body;
        } catch (InvalidRequestException e) {
            throw e;
        } catch (Exception e) {
            throw new InvalidRequestException("invalid_body", "El cuerpo no es un JSON valido para un rango de IPs");
        }
    }

    /** Aplica las reglas de la seccion 5 del contrato y arma el rango con sus dos extremos. */
    private static IpRange validate(IpRangeRequest body) {
        String start;
        String end;

        if (body.cidr() != null && !body.cidr().isBlank()) {
            long[] bounds;
            try {
                bounds = Ipv4.fromCidr(body.cidr());
            } catch (IllegalArgumentException e) {
                throw new InvalidRequestException("invalid_body", e.getMessage());
            }
            start = Ipv4.toDotted(bounds[0]);
            end = Ipv4.toDotted(bounds[1]);
        } else {
            if (!Ipv4.isValid(body.ipStart()) || !Ipv4.isValid(body.ipEnd())) {
                throw new InvalidRequestException("invalid_body",
                        "Hay que enviar 'cidr', o bien 'ipStart' e 'ipEnd' como IPv4 validas");
            }
            start = body.ipStart().trim();
            end = body.ipEnd().trim();
            if (Ipv4.toNumber(start) > Ipv4.toNumber(end)) {
                throw new InvalidRequestException("invalid_body", "'ipStart' no puede ser mayor que 'ipEnd'");
            }
        }

        String countryCode = body.countryCode() == null ? "" : body.countryCode().trim().toUpperCase(Locale.ROOT);
        if (!countryCode.matches("[A-Z]{2}")) {
            throw new InvalidRequestException("invalid_body", "'countryCode' debe ser un codigo de dos letras");
        }
        if (body.countryName() == null || body.countryName().isBlank()) {
            throw new InvalidRequestException("invalid_body", "El campo 'countryName' es obligatorio");
        }

        checkCoordinate(body.latitude(), 90, "latitude");
        checkCoordinate(body.longitude(), 180, "longitude");

        return new IpRange(null, start, end, countryCode, body.countryName().trim(),
                body.city(), body.latitude(), body.longitude());
    }

    private static void checkCoordinate(Double value, int limit, String field) {
        if (value != null && (value < -limit || value > limit)) {
            throw new InvalidRequestException("invalid_body",
                    "'" + field + "' debe estar entre -" + limit + " y " + limit);
        }
    }
}
