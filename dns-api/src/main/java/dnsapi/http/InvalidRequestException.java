package dnsapi.http;

/**
 * El cuerpo o los parametros de la peticion no cumplen el contrato. Se responde {@code 400} con el
 * codigo que trae la excepcion, para que quien llama pueda distinguir el motivo.
 */
public class InvalidRequestException extends RuntimeException {

    private final String code;

    public InvalidRequestException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String code() {
        return code;
    }
}
