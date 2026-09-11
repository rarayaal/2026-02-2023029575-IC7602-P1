use std::env;

/// Configuración del Interceptor. Se carga una única vez al arrancar.
pub struct Config {
    pub bind_addr: String,
    pub udp_port: u16,
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

        Self {
            bind_addr,
            udp_port,
        }
    }

    pub fn socket_addr(&self) -> String {
        format!("{}:{}", self.bind_addr, self.udp_port)
    }
}
