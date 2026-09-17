use std::env;

/// Configuración del Interceptor. Se carga una única vez al arrancar.
pub struct Config {
    pub bind_addr: String,
    pub udp_port: u16,
    /// URL base del DNS API, ej. "http://localhost:8081".
    pub dns_api_url: String,
    /// Timeout de las solicitudes HTTP al DNS APIdw.
    pub dns_api_timeout_ms: u64,
}

impl Config {
    /// Lee la configuración desde variables de entorno, con defaults para desarrollo local.
    pub fn from_env() -> Self {
        let bind_addr =
            env::var("INTERCEPTOR_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0".to_string());

        // Default 53 = puerto estándar DNS; en dev sin privilegios se sobreescribe vía env var.
        let udp_port = env::var("INTERCEPTOR_UDP_PORT")
            .ok()
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(53);

        // Default apunta al mock_dns_api local; en integración real, P3 define el valor final.
        let dns_api_url =
            env::var("DNS_API_URL").unwrap_or_else(|_| "http://localhost:8081".to_string());

        let dns_api_timeout_ms = env::var("DNS_API_TIMEOUT_MS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5000);

        Self {
            bind_addr,
            udp_port,
            dns_api_url,
            dns_api_timeout_ms,
        }
    }

    pub fn socket_addr(&self) -> String {
        format!("{}:{}", self.bind_addr, self.udp_port)
    }
}
