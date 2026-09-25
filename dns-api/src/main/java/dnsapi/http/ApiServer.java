package dnsapi.http;

import dnsapi.config.ApiConfig;
import dnsapi.dns.UdpDnsClient;
import dnsapi.healthchecks.HealthCheckRepository;
import dnsapi.ipcountry.IpCountryRepository;
import dnsapi.records.DnsRecordRepository;
import io.javalin.Javalin;
import io.javalin.http.HttpStatus;
import io.javalin.router.EndpointNotFound;
import java.util.Map;
import org.eclipse.jetty.util.thread.QueuedThreadPool;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Servidor HTTP del DNS API.
 *
 * <p>La concurrencia la resuelve el pool de hilos de Jetty, el servidor que Javalin lleva
 * embebido: cada peticion se atiende en un hilo distinto tomado del pool, asi que varias
 * consultas del DNS Interceptor se procesan en paralelo. El tamano del pool se configura por
 * variable de entorno para poder ajustarlo en el despliegue sin recompilar.</p>
 */
public final class ApiServer {

    private static final Logger log = LoggerFactory.getLogger(ApiServer.class);

    private final ApiConfig config;
    private final Javalin app;

    public ApiServer(ApiConfig config, DnsRecordRepository records, IpCountryRepository ranges,
                     HealthCheckRepository checks, UdpDnsClient dnsClient) {
        this.config = config;
        this.app = Javalin.create(javalin -> {
            javalin.showJavalinBanner = false;
            javalin.jetty.threadPool = new QueuedThreadPool(config.maxThreads());
        });
        registerRoutes(records, ranges, checks, dnsClient);
    }

    private void registerRoutes(DnsRecordRepository records, IpCountryRepository ranges,
                                HealthCheckRepository checks, UdpDnsClient dnsClient) {
        // Endpoint de vida: lo usan Docker Compose y Kubernetes para saber si el contenedor sirve.
        app.get("/api/health", ctx -> ctx.json(Map.of("status", "ok", "component", "dns-api")));

        new ExistsController(records).register(app);
        new RecordsController(records).register(app);
        new IpCountryController(ranges).register(app);
        new HealthChecksController(checks).register(app);
        new DnsResolverController(dnsClient).register(app);

        registerErrorHandlers();
    }

    private void registerErrorHandlers() {
        // Errores en JSON, para que el DNS Interceptor reciba siempre el mismo formato.
        // Se atrapa EndpointNotFound, que Javalin lanza solo cuando ninguna ruta coincide. Un
        // app.error(404) se ejecutaria tambien cuando un endpoint responde 404 a proposito, como
        // un registro que no existe, y le pisaria su mensaje.
        app.exception(InvalidRequestException.class, (exception, ctx) ->
                ctx.status(HttpStatus.BAD_REQUEST)
                        .json(new ErrorResponse(exception.code(), exception.getMessage())));

        app.exception(EndpointNotFound.class, (exception, ctx) ->
                ctx.status(HttpStatus.NOT_FOUND)
                        .json(new ErrorResponse("not_found", "No existe la ruta " + ctx.path())));

        app.exception(Exception.class, (exception, ctx) -> {
            log.error("Error atendiendo {} {}", ctx.method(), ctx.path(), exception);
            ctx.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .json(new ErrorResponse("internal_error", "Error interno del API"));
        });
    }

    public void start() {
        app.start(config.host(), config.port());
        log.info("DNS API escuchando en http://{}:{} con hasta {} peticiones concurrentes",
                config.host(), port(), config.maxThreads());
    }

    public void stop() {
        app.stop();
    }

    /** Puerto real en el que quedo escuchando; con el puerto 0 lo asigna el sistema operativo. */
    public int port() {
        return app.port();
    }
}
