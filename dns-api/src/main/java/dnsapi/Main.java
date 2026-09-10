package dnsapi;

import dnsapi.config.ApiConfig;
import dnsapi.config.ConfigurationException;
import dnsapi.http.ApiServer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Punto de entrada del DNS API. */
public final class Main {

    private static final Logger log = LoggerFactory.getLogger(Main.class);

    private Main() {
    }

    public static void main(String[] args) {
        try {
            ApiServer server = new ApiServer(ApiConfig.fromEnvironment(System::getenv));
            // Para que Docker pueda detener el contenedor sin matar peticiones a medio atender.
            Runtime.getRuntime().addShutdownHook(new Thread(server::stop, "dns-api-shutdown"));
            server.start();
        } catch (ConfigurationException e) {
            log.error("Configuracion invalida, el API no puede arrancar: {}", e.getMessage());
            System.exit(1);
        }
    }
}
