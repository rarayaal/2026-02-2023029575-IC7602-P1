package dnsapi.healthchecks;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Los dos tipos de chequeo que define el enunciado. */
public enum HealthCheckProtocol {

    TCP,
    HTTP;

    /** El contrato y la base usan el nombre en mayusculas, igual que la constante. */
    @JsonValue
    public String value() {
        return name();
    }

    public static HealthCheckProtocol fromValue(String text) {
        String normalized = text == null ? "" : text.trim().toUpperCase(Locale.ROOT);
        for (HealthCheckProtocol protocol : values()) {
            if (protocol.name().equals(normalized)) {
                return protocol;
            }
        }
        throw new IllegalArgumentException("Protocolo de health check desconocido: " + text);
    }
}
