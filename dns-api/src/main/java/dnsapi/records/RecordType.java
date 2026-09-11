package dnsapi.records;

import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Locale;

/** Los cinco tipos de registro que define el enunciado. */
public enum RecordType {

    SINGLE("single"),
    MULTI("multi"),
    WEIGHT("weight"),
    GEO("geo"),
    ROUND_TRIP("round-trip");

    private final String value;

    RecordType(String value) {
        this.value = value;
    }

    /**
     * Texto con el que viaja el tipo en el JSON. Se declara aparte del nombre de la constante
     * porque Java no permite un guion en un identificador, pero el contrato dice "round-trip".
     */
    @JsonValue
    public String value() {
        return value;
    }

    /** Convierte el texto del contrato al tipo, sin distinguir mayusculas. */
    public static RecordType fromValue(String text) {
        String normalized = text == null ? "" : text.trim().toLowerCase(Locale.ROOT);
        for (RecordType type : values()) {
            if (type.value.equals(normalized)) {
                return type;
            }
        }
        throw new IllegalArgumentException("Tipo de registro desconocido: " + text);
    }
}
