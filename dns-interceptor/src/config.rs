// aca leemos la configuracion del sistema desde el entorno
use std::env;

// estructura que guarda los parametros del interceptor
#[derive(Debug, Clone)]
pub struct Configuracion {
    pub direccion_bind: String,
    pub puerto_udp: u16,
    pub url_api_dns: String,
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

        let url_api_dns =
            env::var("DNS_API_URL").unwrap_or_else(|_| "http://localhost:8080".to_string());

        Self {
            direccion_bind,
            puerto_udp,
            url_api_dns,
        }
    }

    // armamos el string con la direccion y el puerto para el socket
    pub fn direccion_socket(&self) -> String {
        format!("{}:{}", self.direccion_bind, self.puerto_udp)
    }
}
