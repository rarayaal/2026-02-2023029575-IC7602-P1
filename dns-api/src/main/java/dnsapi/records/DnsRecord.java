package dnsapi.records;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Un registro DNS con sus IPs de destino.
 *
 * @param id       UUID que asigna la base de datos
 * @param domain   nombre de dominio, ya normalizado
 * @param type     estrategia de resolucion
 * @param ttl      segundos que el cliente puede guardar la respuesta
 * @param isActive si esta en {@code false}, el registro existe pero no se resuelve
 * @param targets  las IPs de destino
 */
public record DnsRecord(
        String id,
        String domain,
        RecordType type,
        int ttl,
        // Sin la anotacion, Jackson trata "is" como prefijo de un getter booleano y escribiria
        // "active" en el JSON, que no es lo que dice el contrato.
        @JsonProperty("isActive") boolean isActive,
        List<DnsTarget> targets) {
}
