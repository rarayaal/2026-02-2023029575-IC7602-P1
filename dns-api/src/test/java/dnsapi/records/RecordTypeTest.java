package dnsapi.records;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RecordTypeTest {

    @Test
    @DisplayName("El tipo round-trip viaja con guion, como dice el contrato")
    void roundTripUsesHyphen() {
        assertEquals("round-trip", RecordType.ROUND_TRIP.value());
        assertEquals(RecordType.ROUND_TRIP, RecordType.fromValue("round-trip"));
    }

    @Test
    @DisplayName("Convierte el texto del contrato al tipo, sin importar mayusculas")
    void parsesEveryType() {
        assertEquals(RecordType.SINGLE, RecordType.fromValue("single"));
        assertEquals(RecordType.MULTI, RecordType.fromValue("MULTI"));
        assertEquals(RecordType.WEIGHT, RecordType.fromValue(" weight "));
        assertEquals(RecordType.GEO, RecordType.fromValue("geo"));
    }

    @Test
    @DisplayName("Rechaza un tipo que no existe")
    void rejectsUnknownType() {
        assertThrows(IllegalArgumentException.class, () -> RecordType.fromValue("multicast"));
    }
}
