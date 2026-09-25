package dnsapi.healthchecks;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Configuracion de un health check (seccion 6 del contrato).
 *
 * <p>Pertenece a una IP concreta, no a un dominio: en un registro con varias IPs, cada una puede
 * apuntar a un servicio distinto, en otro puerto y con otro path.</p>
 *
 * @param targetId         IP a la que se le hace el chequeo
 * @param expectedStatuses codigos HTTP que se consideran sanos; solo aplica a HTTP
 * @param timeoutMs        cuanto se espera cada intento, en milisegundos
 * @param intervalSeconds  cada cuanto se repite el chequeo, en segundos
 * @param isEnabled        si esta apagado, los Health Checkers lo ignoran
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record HealthCheck(
        String id,
        String targetId,
        HealthCheckProtocol protocol,
        int port,
        String path,
        List<Integer> expectedStatuses,
        BasicAuth basicAuth,
        int timeoutMs,
        int retries,
        int intervalSeconds,
        @JsonProperty("isEnabled") boolean isEnabled) {
}
