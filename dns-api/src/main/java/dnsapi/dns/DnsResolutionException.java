package dnsapi.dns;

/** No se pudo obtener respuesta del servidor DNS remoto. */
public class DnsResolutionException extends RuntimeException {

    public DnsResolutionException(String message, Throwable cause) {
        super(message, cause);
    }
}
