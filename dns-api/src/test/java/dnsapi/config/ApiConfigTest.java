package dnsapi.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.function.UnaryOperator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApiConfigTest {

    /** Un ambiente falso: en las pruebas no se tocan las variables reales del proceso. */
    private static UnaryOperator<String> environment(Map<String, String> values) {
        return values::get;
    }

    @Test
    @DisplayName("Usa los valores por omision cuando el ambiente esta vacio")
    void usesDefaults() {
        ApiConfig config = ApiConfig.fromEnvironment(environment(Map.of()));

        assertEquals("0.0.0.0", config.host());
        assertEquals(8080, config.port());
        assertEquals(100, config.maxThreads());
    }

    @Test
    @DisplayName("Toma los valores declarados en el ambiente")
    void readsEnvironment() {
        ApiConfig config = ApiConfig.fromEnvironment(environment(Map.of(
                ApiConfig.ENV_HOST, "127.0.0.1",
                ApiConfig.ENV_PORT, "9090",
                ApiConfig.ENV_MAX_THREADS, "32")));

        assertEquals("127.0.0.1", config.host());
        assertEquals(9090, config.port());
        assertEquals(32, config.maxThreads());
    }

    @Test
    @DisplayName("Rechaza un puerto que no es numerico")
    void rejectsNonNumericPort() {
        ConfigurationException error = assertThrows(ConfigurationException.class, () ->
                ApiConfig.fromEnvironment(environment(Map.of(ApiConfig.ENV_PORT, "ochenta"))));

        assertTrue(error.getMessage().contains(ApiConfig.ENV_PORT), error.getMessage());
    }

    @Test
    @DisplayName("Rechaza un puerto negativo o cero")
    void rejectsNonPositivePort() {
        assertThrows(ConfigurationException.class, () ->
                ApiConfig.fromEnvironment(environment(Map.of(ApiConfig.ENV_PORT, "0"))));
    }
}
