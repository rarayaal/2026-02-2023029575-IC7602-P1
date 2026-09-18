package dnsapi.records;

/**
 * Ya existe un registro para ese dominio.
 *
 * <p>La base tiene un indice unico sobre el nombre de dominio, asi que no puede haber dos registros
 * para el mismo host. El endpoint traduce esta excepcion a un {@code 409 Conflict}.</p>
 */
public class DuplicateDomainException extends RuntimeException {

    public DuplicateDomainException(String domain) {
        super("Ya existe un registro para el dominio " + domain);
    }
}
