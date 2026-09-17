package dnsapi;

import dnsapi.config.ApiConfig;
import dnsapi.config.ConfigurationException;
import dnsapi.http.ApiServer;
import dnsapi.records.DnsRecordRepository;
import dnsapi.records.InMemoryDnsRecordRepository;
import dnsapi.supabase.SupabaseClient;
import dnsapi.supabase.SupabaseException;
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

            SupabaseClient supabase = new SupabaseClient(config.supabaseUrl(), config.supabaseKey());
            // Se prueba la conexion antes de abrir el puerto: sin base de datos el API no sirve, y
            // es mejor fallar al arrancar con un mensaje claro que en la primera peticion.
            supabase.get("dns_records", "select=id&limit=1");
            log.info("Conexion con Supabase verificada");

            // Temporal: los registros siguen en memoria hasta que exista el repositorio de Supabase.
            // Al cambiar esta linea, los endpoints siguen funcionando sin modificarse.
            DnsRecordRepository records = InMemoryDnsRecordRepository.withSampleData();
            log.warn("Usando el repositorio en memoria con datos de ejemplo");

            ApiServer server = new ApiServer(config, records);
            // Para que Docker pueda detener el contenedor sin matar peticiones a medio atender.
            Runtime.getRuntime().addShutdownHook(new Thread(server::stop, "dns-api-shutdown"));
            server.start();
        } catch (ConfigurationException e) {
            log.error("Configuracion invalida, el API no puede arrancar: {}", e.getMessage());
            System.exit(1);
        } catch (SupabaseException e) {
            log.error("No hay conexion con Supabase, el API no puede arrancar: {}", e.getMessage());
            System.exit(1);
        }
    }
}
