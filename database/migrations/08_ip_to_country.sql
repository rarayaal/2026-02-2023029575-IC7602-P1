CREATE TABLE IF NOT EXISTS ip_to_country (
    id BIGSERIAL PRIMARY KEY,
    ip_start BIGINT NOT NULL,
    ip_end BIGINT NOT NULL,
    country_code VARCHAR(2) NOT NULL,
    country_name VARCHAR(100) NOT NULL,
    city VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),

    -- Validaciones de rango IP y coordenadas
    CONSTRAINT chk_ip_range_valid CHECK (ip_start >= 0 AND ip_end >= ip_start AND ip_end <= 4294967295),
    CONSTRAINT chk_ipc_country_format CHECK (char_length(country_code) = 2),
    CONSTRAINT chk_ipc_latitude CHECK (latitude IS NULL OR (latitude >= -90.0 AND latitude <= 90.0)),
    CONSTRAINT chk_ipc_longitude CHECK (longitude IS NULL OR (longitude >= -180.0 AND longitude <= 180.0))
);

-- Para búsquedas en rango binario instantáneas
CREATE INDEX IF NOT EXISTS idx_ip_country_range 
ON ip_to_country (ip_start, ip_end);

-- Para búsquedas por código de país
CREATE INDEX IF NOT EXISTS idx_ip_country_code 
ON ip_to_country (country_code);

-- Para convertir IPv4 en formato texto ('192.168.1.1') a entero BIGINT
CREATE OR REPLACE FUNCTION inet_to_bigint(ip_text TEXT)
RETURNS BIGINT AS $$
DECLARE
    octets INTEGER[];
BEGIN
    octets := string_to_array(ip_text, '.')::INTEGER[];
    IF array_length(octets, 1) <> 4 THEN
        RETURN NULL;
    END IF;
    RETURN (octets[1]::BIGINT * 16777216) +
           (octets[2]::BIGINT * 65536) +
           (octets[3]::BIGINT * 256) +
           (octets[4]::BIGINT);
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- Función de búsqueda geográfica rápida a partir de una IP en texto
CREATE OR REPLACE FUNCTION lookup_ip_geo(p_ip_text TEXT)
RETURNS TABLE (
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    city VARCHAR(100),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6)
) AS $$
DECLARE
    v_ip_num BIGINT;
BEGIN
    v_ip_num := inet_to_bigint(p_ip_text);
    IF v_ip_num IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        ipc.country_code,
        ipc.country_name,
        ipc.city,
        ipc.latitude,
        ipc.longitude
    FROM ip_to_country ipc
    WHERE v_ip_num BETWEEN ipc.ip_start AND ipc.ip_end
    LIMIT 1;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON TABLE ip_to_country IS 'Mapeo de rangos IPv4 a países y coordenadas geográficas para resolución geo y round-trip';
COMMENT ON COLUMN ip_to_country.ip_start IS 'Límite inferior del rango IPv4 en representación numérica entera';
COMMENT ON COLUMN ip_to_country.ip_end IS 'Límite superior del rango IPv4 en representación numérica entera';
