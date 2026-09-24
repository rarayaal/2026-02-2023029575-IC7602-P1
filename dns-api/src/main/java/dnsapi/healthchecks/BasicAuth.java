package dnsapi.healthchecks;

/**
 * Credenciales para monitorear un servicio protegido con basic auth.
 *
 * <p>La contrasena es de solo escritura: se acepta al crear o modificar, pero el API la devuelve
 * siempre en {@code null}. Quien la necesita completa es el Health Checker, y la lee directamente
 * de la base de datos.</p>
 */
public record BasicAuth(String username, String password) {
}
