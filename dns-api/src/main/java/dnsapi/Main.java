package dnsapi;

import dnsapi.config.ApiConfig;
import dnsapi.config.ConfigurationException;
import dnsapi.http.ApiServer;
import dnsapi.records.DnsRecordRepository;
import dnsapi.records.InMemoryDnsRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Punto de entrada del DNS API. */
public final class Main {

    private static final Logger log = LoggerFactory.getLogger(Main.class);

    private Main() {
    }

    public static void main(String[] args) {
        try {
            ApiConfig config = ApiConfig.fromEnvironment(System::getenv);

            // Temporal: mientras el esquema de datos (T-25) no exista, los registros viven en
            // memoria. Al cambiar esta linea por la implementacion de Supabase, los endpoints
            // siguen funcionando sin modificarse.
            DnsRecordRepository records = InMemoryDnsRecordRepository.withSampleData();
            log.warn("Usando el repositorio en memoria con datos de ejemplo, no hay base de datos");

            ApiServer server = new ApiServer(config, records);
            // Para que Docker pueda detener el contenedor sin matar peticiones a medio atender.
            Runtime.getRuntime().addShutdownHook(new Thread(server::stop, "dns-api-shutdown"));
            server.start();
        } catch (ConfigurationException e) {
            log.error("Configuracion invalida, el API no puede arrancar: {}", e.getMessage());
            System.exit(1);
        }
    }
}
