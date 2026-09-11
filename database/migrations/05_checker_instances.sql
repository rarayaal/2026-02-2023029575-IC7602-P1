CREATE TABLE IF NOT EXISTS checker_instances (
    instance_id VARCHAR(100) PRIMARY KEY,
    country_code VARCHAR(2) NOT NULL,
    city VARCHAR(100) NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Validación de coordenadas geográficas
    CONSTRAINT chk_latitude_range CHECK (latitude >= -90.0 AND latitude <= 90.0),
    CONSTRAINT chk_longitude_range CHECK (longitude >= -180.0 AND longitude <= 180.0),
    CONSTRAINT chk_instance_country_format CHECK (char_length(country_code) = 2)
);

COMMENT ON TABLE checker_instances IS 'Instancias activas del Health Checker con su geolocalización simulada';
COMMENT ON COLUMN checker_instances.instance_id IS 'Identificador único de la instancia del contenedor Health Checker';
COMMENT ON COLUMN checker_instances.country_code IS 'Código ISO de país donde simula estar el checker';
COMMENT ON COLUMN checker_instances.city IS 'Ciudad donde simula estar el checker';
COMMENT ON COLUMN checker_instances.latitude IS 'Latitud (-90 a 90) para cálculo de distancias esféricas';
COMMENT ON COLUMN checker_instances.longitude IS 'Longitud (-180 a 180) para cálculo de distancias esféricas';
COMMENT ON COLUMN checker_instances.last_heartbeat IS 'Último latido enviado por el contenedor para verificar que sigue vivo';
