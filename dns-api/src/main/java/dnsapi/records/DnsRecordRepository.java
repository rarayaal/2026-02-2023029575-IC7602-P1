package dnsapi.records;

import java.util.List;
import java.util.Locale;
import java.util.Optional;

/**
 * Acceso a los registros DNS almacenados.
 *
 * <p>Esta interfaz existe para que los endpoints no dependan de donde viven los datos. La
 * implementacion real habla con Supabase; si algun dia cambiara la base, se escribe otra
 * implementacion y los endpoints no se tocan.</p>
 */
public interface DnsRecordRepository {

    /**
     * Busca el tipo de registro asociado a un dominio. Solo considera registros activos.
     *
     * @return el tipo, o vacio si el dominio no tiene un registro activo
     */
    Optional<RecordType> findTypeByDomain(String domain);

    /**
     * Lista los registros con sus targets. Los dos filtros son opcionales: con {@code null} no se
     * filtra por ese campo.
     */
    List<DnsRecord> findAll(String domain, RecordType type);

    /** Busca un registro por su id. */
    Optional<DnsRecord> findById(String id);

    /**
     * Deja un nombre de dominio en su forma canonica.
     *
     * <p>En DNS los nombres no distinguen mayusculas, y un nombre absoluto puede venir con un punto
     * al final: {@code www.example.com.} y {@code WWW.Example.com} son el mismo host. Como las
     * consultas llegan desde el DNS Interceptor tal cual las escribio el cliente, hay que
     * normalizarlas antes de comparar.</p>
     */
    static String normalize(String domain) {
        if (domain == null) {
            return "";
        }
        String result = domain.trim().toLowerCase(Locale.ROOT);
        while (result.endsWith(".")) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }
}
