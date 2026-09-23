package dnsapi.ipcountry;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Respuesta de {@code GET /api/ip-country/lookup}: donde queda una IP.
 *
 * <p>Se responde con los campos en {@code null} cuando la IP no cae en ningun rango conocido.</p>
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record GeoLocation(
        String ip,
        String countryCode,
        String countryName,
        String city,
        Double latitude,
        Double longitude) {
}
