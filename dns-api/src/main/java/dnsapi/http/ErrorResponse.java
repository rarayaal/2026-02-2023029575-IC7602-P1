package dnsapi.http;

/**
 * Cuerpo uniforme para las respuestas de error del API.
 *
 * @param error   codigo estable, pensado para que lo consuma el DNS Interceptor
 * @param message descripcion legible para quien depura
 */
public record ErrorResponse(String error, String message) {
}
