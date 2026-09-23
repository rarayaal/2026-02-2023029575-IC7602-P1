package dnsapi.healthchecks;

import java.util.List;
import java.util.Optional;

/** Acceso a la configuracion de health checks. */
public interface HealthCheckRepository {

    List<HealthCheck> findAll();

    Optional<HealthCheck> findById(String id);

    /**
     * @throws DuplicateHealthCheckException si esa IP ya tiene un health check
     */
    HealthCheck create(HealthCheck check);

    Optional<HealthCheck> update(String id, HealthCheck check);

    boolean delete(String id);
}
