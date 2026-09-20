package dnsapi.config;

/**
 * Se lanza cuando una variable de entorno requerida no esta definida o tiene un valor invalido.
 * El API falla de inmediato al arrancar en lugar de seguir con un valor por omision silencioso.
 */
public class ConfigurationException extends RuntimeException {

    public ConfigurationException(String message) {
        super(message);
    }
}
