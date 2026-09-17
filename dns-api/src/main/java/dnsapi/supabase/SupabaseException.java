package dnsapi.supabase;

/**
 * Supabase respondio con un error, o no se pudo hablar con el.
 *
 * <p>Guarda el codigo HTTP para que quien llama pueda distinguir casos: por ejemplo, un 409 significa
 * que se violo una restriccion unica, como un dominio repetido. Cuando no hubo respuesta (sin red,
 * tiempo agotado) el codigo es 0.</p>
 */
public class SupabaseException extends RuntimeException {

    private final int status;

    public SupabaseException(int status, String message) {
        super(message);
        this.status = status;
    }

    public SupabaseException(String message, Throwable cause) {
        super(message, cause);
        this.status = 0;
    }

    public int status() {
        return status;
    }
}
