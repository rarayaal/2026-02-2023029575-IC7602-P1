package dnsapi.ipcountry;

import java.util.List;
import java.util.Optional;

/** Acceso a la tabla IP-to-Country. */
public interface IpCountryRepository {

    List<IpRange> findAll();

    Optional<IpRange> findById(String id);

    IpRange create(IpRange range);

    Optional<IpRange> update(String id, IpRange range);

    boolean delete(String id);

    /**
     * Busca en que rango cae una IP.
     *
     * @return la ubicacion del rango que la contiene, o vacio si ninguno la cubre
     */
    Optional<GeoLocation> lookup(String ip);
}
