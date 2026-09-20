package dnsapi.config;

import java.util.function.UnaryOperator;

/**
 * Configuracion del DNS API.
 *
 * <p>Todo se lee de variables de entorno porque el enunciado prohibe valores quemados en el
 * codigo. La fuente de esas variables se recibe como parametro en lugar de llamar a
 * {@code System.getenv} aqui adentro, para poder construir la configuracion desde cualquier lado.</p>
 *
 * @param host        interfaz en la que escucha el servidor
 * @param port        puerto HTTP del API
 * @param maxThreads  tope de peticiones que se pueden atender al mismo tiempo
 * @param supabaseUrl URL del proyecto de Supabase, sin barra final
 * @param supabaseKey llave con la que el API se autentica ante Supabase
 */
public record ApiConfig(String host, int port, int maxThreads, String supabaseUrl, String supabaseKey) {

    public static final String ENV_HOST = "DNS_API_HOST";
    public static final String ENV_PORT = "DNS_API_PORT";
    public static final String ENV_MAX_THREADS = "DNS_API_MAX_THREADS";
    public static final String ENV_SUPABASE_URL = "SUPABASE_URL";
    public static final String ENV_SUPABASE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

    private static final String DEFAULT_HOST = "0.0.0.0";
    private static final int DEFAULT_PORT = 8080;
    private static final int DEFAULT_MAX_THREADS = 100;

    public static ApiConfig fromEnvironment(UnaryOperator<String> env) {
        return new ApiConfig(
                text(env, ENV_HOST, DEFAULT_HOST),
                number(env, ENV_PORT, DEFAULT_PORT),
                number(env, ENV_MAX_THREADS, DEFAULT_MAX_THREADS),
                withoutTrailingSlash(required(env, ENV_SUPABASE_URL)),
                required(env, ENV_SUPABASE_KEY));
    }

    /** Devuelve el valor de la variable, o el valor por omision si viene ausente o vacia. */
    private static String text(UnaryOperator<String> env, String name, String fallback) {
        String value = env.apply(name);
        return (value == null || value.isBlank()) ? fallback : value.trim();
    }

    /**
     * Lee una variable sin valor por omision. Se usa para datos propios del despliegue, como la
     * direccion y la llave de la base: si faltan, el API no puede funcionar y no debe arrancar.
     */
    private static String required(UnaryOperator<String> env, String name) {
        String value = text(env, name, null);
        if (value == null) {
            throw new ConfigurationException("La variable " + name + " es obligatoria y no esta definida");
        }
        return value;
    }

    /** Igual que {@link #text}, pero exigiendo un entero positivo. */
    private static int number(UnaryOperator<String> env, String name, int fallback) {
        String value = text(env, name, null);
        if (value == null) {
            return fallback;
        }
        int parsed;
        try {
            parsed = Integer.parseInt(value);
        } catch (NumberFormatException e) {
            throw new ConfigurationException(name + " debe ser un numero entero, se recibio: " + value);
        }
        if (parsed <= 0) {
            throw new ConfigurationException(name + " debe ser mayor que cero, se recibio: " + parsed);
        }
        return parsed;
    }

    /** Evita que al armar las rutas quede una doble barra, como en {@code .co//rest/v1}. */
    private static String withoutTrailingSlash(String url) {
        return url.endsWith("/") ? url.substring(0, url.length() - 1) : url;
    }
}
