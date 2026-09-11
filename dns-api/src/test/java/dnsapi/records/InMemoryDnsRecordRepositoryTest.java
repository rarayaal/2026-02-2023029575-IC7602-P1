package dnsapi.records;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class InMemoryDnsRecordRepositoryTest {

    private final DnsRecordRepository repository = new InMemoryDnsRecordRepository(Map.of(
            "api.company.com", RecordType.SINGLE,
            "edge.company.com", RecordType.ROUND_TRIP));

    @Test
    @DisplayName("Encuentra el tipo de un dominio registrado")
    void findsRegisteredDomain() {
        assertEquals(Optional.of(RecordType.SINGLE), repository.findTypeByDomain("api.company.com"));
        assertEquals(Optional.of(RecordType.ROUND_TRIP), repository.findTypeByDomain("edge.company.com"));
    }

    @Test
    @DisplayName("No encuentra un dominio que no existe")
    void missingDomainIsEmpty() {
        assertTrue(repository.findTypeByDomain("noexiste.company.com").isEmpty());
    }

    @Test
    @DisplayName("Ignora mayusculas, porque en DNS el nombre no las distingue")
    void isCaseInsensitive() {
        assertEquals(Optional.of(RecordType.SINGLE), repository.findTypeByDomain("API.Company.COM"));
    }

    @Test
    @DisplayName("Acepta el punto final de un nombre absoluto")
    void acceptsTrailingDot() {
        assertEquals(Optional.of(RecordType.SINGLE), repository.findTypeByDomain("api.company.com."));
    }

    @Test
    @DisplayName("Tolera entradas vacias o nulas sin reventar")
    void handlesBlankInput() {
        assertTrue(repository.findTypeByDomain(null).isEmpty());
        assertTrue(repository.findTypeByDomain("   ").isEmpty());
    }

    @Test
    @DisplayName("Los datos de ejemplo cubren los cinco tipos del enunciado")
    void sampleDataCoversEveryType() {
        DnsRecordRepository samples = InMemoryDnsRecordRepository.withSampleData();

        assertEquals(Optional.of(RecordType.SINGLE), samples.findTypeByDomain("api.company.com"));
        assertEquals(Optional.of(RecordType.MULTI), samples.findTypeByDomain("cdn.company.com"));
        assertEquals(Optional.of(RecordType.WEIGHT), samples.findTypeByDomain("app.company.com"));
        assertEquals(Optional.of(RecordType.GEO), samples.findTypeByDomain("portal.company.com"));
        assertEquals(Optional.of(RecordType.ROUND_TRIP), samples.findTypeByDomain("edge.company.com"));
    }
}
