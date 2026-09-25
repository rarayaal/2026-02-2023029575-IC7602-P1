package dnsapi.ipcountry;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Un rango de direcciones IP asignado a un pais (seccion 5 del contrato).
 *
 * <p>Hacia afuera el rango se expresa con su IP inicial y final en notacion de puntos; en la base
 * se guardan como numeros. La ciudad y las coordenadas son opcionales y las usa la estrategia
 * {@code round-trip} para estimar donde esta el cliente.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record IpRange(
        String id,
        String ipStart,
        String ipEnd,
        String countryCode,
        String countryName,
        String city,
        Double latitude,
        Double longitude) {
}
