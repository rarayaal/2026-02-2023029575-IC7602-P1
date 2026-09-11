package dnsapi.records;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Implementacion en memoria del repositorio de registros.
 *
 * <p>Es temporal: sirve para que el API funcione y se pueda probar mientras el esquema de datos
 * (T-25) no existe. No persiste nada entre arranques.</p>
 */
public final class InMemoryDnsRecordRepository implements DnsRecordRepository {

    private final Map<String, RecordType> typesByDomain;

    public InMemoryDnsRecordRepository(Map<String, RecordType> typesByDomain) {
        Map<String, RecordType> canonical = new HashMap<>();
        typesByDomain.forEach((domain, type) -> canonical.put(DnsRecordRepository.normalize(domain), type));
        this.typesByDomain = Map.copyOf(canonical);
    }

    /**
     * Datos de ejemplo para desarrollo. Son los mismos dominios que usa el contrato del API y los
     * mocks de la DNS UI, para que las pruebas manuales entre componentes coincidan.
     */
    public static InMemoryDnsRecordRepository withSampleData() {
        return new InMemoryDnsRecordRepository(Map.of(
                "api.company.com", RecordType.SINGLE,
                "cdn.company.com", RecordType.MULTI,
                "app.company.com", RecordType.WEIGHT,
                "portal.company.com", RecordType.GEO,
                "edge.company.com", RecordType.ROUND_TRIP));
    }

    @Override
    public Optional<RecordType> findTypeByDomain(String domain) {
        return Optional.ofNullable(typesByDomain.get(DnsRecordRepository.normalize(domain)));
    }
}
