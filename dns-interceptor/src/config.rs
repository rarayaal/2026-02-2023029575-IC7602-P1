// aca leemos la configuracion del sistema desde el entorno
use std::env;

/// Configuración del Interceptor. Se carga una única vez al arrancar.
pub type Config = Configuracion;

#[derive(Debug, Clone)]
pub struct Configuracion {
    pub direccion_bind: String,
    pub puerto_udp: u16,
    pub url_api_dns: String,
    pub timeout_ms: u64,
}

impl Configuracion {
    // leemos las variables de entorno o usamos valores por defecto si no existen
    pub fn desde_entorno() -> Self {
        let direccion_bind =
            env::var("INTERCEPTOR_BIND_ADDR").unwrap_or_else(|_| "0.0.0.0".to_string());

        let puerto_udp = env::var("INTERCEPTOR_UDP_PORT")
            .ok()
            .and_then(|v| v.parse::<u16>().ok())
            .unwrap_or(5353);

        // Si se provee DNS_API_URL explícita se respeta; de lo contrario se arma con HOST y PORT.
        let url_api_dns = env::var("DNS_API_URL").unwrap_or_else(|_| {
            let host_api = env::var("DNS_API_HOST").unwrap_or_else(|_| "localhost".to_string());
            let puerto_api = env::var("DNS_API_PORT").unwrap_or_else(|_| "8080".to_string());
            let esquema_api = env::var("DNS_API_SCHEME").unwrap_or_else(|_| "http".to_string());
            format!("{esquema_api}://{host_api}:{puerto_api}")
        });


        let timeout_ms = env::var("DNS_API_TIMEOUT_MS")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .unwrap_or(5000);

        Self {
            direccion_bind,
            puerto_udp,
            url_api_dns,
            timeout_ms,
        }
    }

    // armamos el string con la direccion y el puerto para el socket
    pub fn direccion_socket(&self) -> String {
        format!("{}:{}", self.direccion_bind, self.puerto_udp)
    }
}

