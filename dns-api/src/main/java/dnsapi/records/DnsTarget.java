package dnsapi.records;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Una IP de destino de un registro DNS (seccion 3 del contrato).
 *
 * <p>Los campos que no aplican al tipo del registro viajan en {@code null} y se omiten del JSON:
 * un target de un registro {@code single} no muestra {@code weight} ni {@code country}.</p>
 *
 * @param id            UUID que asigna la base de datos
 * @param ip            direccion IPv4 que se entrega en la respuesta DNS
 * @param weight        peso relativo, solo para {@code weight}
 * @param country       codigo ISO de dos letras, solo para {@code geo}
 * @param status        {@code healthy}, {@code unhealthy} o {@code unknown}; lo decide el Health Checker
 * @param healthCheckId UUID del health check de esta IP, o {@code null} si no tiene
 * @param avgRttMs      round-trip promedio medido por los Health Checkers, si hay mediciones
 * @param minRttMs      round-trip minimo medido, si hay mediciones
 * @param lastCheckAt   fecha del ultimo chequeo, o {@code null} si nunca se ha chequeado
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record DnsTarget(
        String id,
        String ip,
        Integer weight,
        String country,
        String status,
        String healthCheckId,
        Double avgRttMs,
        Double minRttMs,
        String lastCheckAt) {
}
