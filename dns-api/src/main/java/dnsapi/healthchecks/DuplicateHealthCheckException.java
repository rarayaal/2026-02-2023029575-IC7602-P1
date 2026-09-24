package dnsapi.healthchecks;

/**
 * Esa IP ya tiene un health check configurado.
 *
 * <p>La base lo impide con una restriccion unica sobre el target, porque el enunciado define un
 * chequeo por servicio monitoreado.</p>
 */
public class DuplicateHealthCheckException extends RuntimeException {

    public DuplicateHealthCheckException(String targetId) {
        super("La IP con id " + targetId + " ya tiene un health check configurado");
    }
}
