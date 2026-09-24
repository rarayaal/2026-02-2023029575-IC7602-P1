-- Poblado de datos iniciales para la tabla ip_to_country
-- Soporte para resolución geo y cálculo de proximidad round-trip
INSERT INTO ip_to_country (ip_start, ip_end, country_code, country_name, city, latitude, longitude)
VALUES
    -- Costa Rica (CR)
    (inet_to_bigint('190.113.0.0'), inet_to_bigint('190.113.255.255'), 'CR', 'Costa Rica', 'San José', 9.928100, -84.090700),
    (inet_to_bigint('196.40.0.0'),  inet_to_bigint('196.40.255.255'),  'CR', 'Costa Rica', 'Cartago',  9.864400, -83.919400),
    (inet_to_bigint('201.191.0.0'), inet_to_bigint('201.191.255.255'), 'CR', 'Costa Rica', 'Alajuela', 10.016300, -84.211600),

    -- Estados Unidos (US)
    (inet_to_bigint('8.8.8.0'),     inet_to_bigint('8.8.8.255'),     'US', 'United States', 'Mountain View', 37.386100, -122.083900),
    (inet_to_bigint('12.0.0.0'),    inet_to_bigint('12.255.255.255'), 'US', 'United States', 'New York',      40.712800,  -74.006000),
    (inet_to_bigint('104.16.0.0'),  inet_to_bigint('104.31.255.255'), 'US', 'United States', 'San Francisco', 37.774900, -122.419400),
    (inet_to_bigint('198.51.100.0'),inet_to_bigint('198.51.100.255'),'US', 'United States', 'Dallas',        32.776700,  -96.797000),

    -- España (ES)
    (inet_to_bigint('80.58.0.0'),   inet_to_bigint('80.58.255.255'),  'ES', 'Spain', 'Madrid',    40.416800,  -3.703800),
    (inet_to_bigint('88.0.0.0'),    inet_to_bigint('88.31.255.255'),  'ES', 'Spain', 'Barcelona', 41.385100,   2.173400),

    -- Alemania (DE)
    (inet_to_bigint('85.214.0.0'),  inet_to_bigint('85.214.255.255'), 'DE', 'Germany', 'Frankfurt', 50.110900,   8.682100),
    (inet_to_bigint('194.95.0.0'),  inet_to_bigint('194.95.255.255'), 'DE', 'Germany', 'Berlin',    52.520000,  13.405000),

    -- Japón (JP)
    (inet_to_bigint('133.0.0.0'),   inet_to_bigint('133.255.255.255'),'JP', 'Japan', 'Tokyo', 35.676200, 139.650300),

    -- Brasil (BR)
    (inet_to_bigint('177.0.0.0'),   inet_to_bigint('177.255.255.255'),'BR', 'Brazil', 'São Paulo', -23.550500, -46.633300),

    -- México (MX)
    (inet_to_bigint('187.130.0.0'), inet_to_bigint('187.255.255.255'),'MX', 'Mexico', 'Mexico City', 19.432600, -99.133200),
    (inet_to_bigint('200.68.128.0'),inet_to_bigint('200.68.255.255'),'MX', 'Mexico', 'Guadalajara', 20.659700, -103.349600),

    -- Cloudflare DNS Anycast (AU / Global)
    (inet_to_bigint('1.1.1.0'),     inet_to_bigint('1.1.1.255'),     'AU', 'Australia', 'Sydney', -33.868800, 151.209300)
ON CONFLICT DO NOTHING;
