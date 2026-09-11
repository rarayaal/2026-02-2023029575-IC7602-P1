package dnsapi.records;

import java.util.Locale;
import java.util.Optional;

/**
 * Acceso a los registros DNS almacenados.
 *
 * <p>Esta interfaz existe para que el API no dependa de donde viven los datos. Hoy la unica
 * implementacion guarda todo en memoria, porque el esquema real (T-25) todavia no esta definido.
 * Cuando exista, se agrega una implementacion contra Supabase y los endpoints no cambian.</p>
 */
public interface DnsRecordRepository {

    /**
     * Busca el tipo de registro asociado a un dominio.
     *
     * @return el tipo, o vacio si el dominio no tiene registro
     */
    Optional<RecordType> findTypeByDomain(String domain);

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
