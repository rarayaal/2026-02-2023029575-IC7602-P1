// cliente HTTP para comunicarse con la DNS API en Java

use base64::engine::general_purpose::STANDARD as BASE64;
use base64::Engine as _;
use reqwest::Client;
use std::time::Duration;
use tracing::info;

use crate::models::{PaqueteDnsBase64, RegistroDns, RespuestaExiste, RespuestaPaisIp};

// cliente HTTP reutilizable con tiempo de espera de tres segundos
#[derive(Clone)]
pub struct ClienteApiDns {
    // cliente interno de reqwest
    cliente: Client,
    // URL base de la API REST
    url_base: String,
}

impl ClienteApiDns {
    // crea una nueva instancia del cliente HTTP
    pub fn nuevo(url_base: String) -> Self {
        let cliente = Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { cliente, url_base }
    }

    // revisa si el dominio existe con el GET api exists
    pub async fn verificar_existencia(&self, nombre_host: &str) -> Result<RespuestaExiste, String> {
        let url = format!("{}/api/exists?hostname={}", self.url_base, nombre_host);
        match self.cliente.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    resp.json::<RespuestaExiste>()
                        .await
                        .map_err(|e| format!("Error deserializando /api/exists: {e}"))
                } else {
                    Err(format!("HTTP error {} en {}", resp.status(), url))
                }
            }
            Err(e) => Err(format!("Fallo de conexión hacia DNS API: {e}")),
        }
    }

    // trae los datos del registro y sus destinos IP usando GET api records
    pub async fn obtener_registro(&self, dominio: &str) -> Result<Option<RegistroDns>, String> {
        let url = format!("{}/api/records?domain={}", self.url_base, dominio);
        match self.cliente.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    let registros: Vec<RegistroDns> = resp
                        .json()
                        .await
                        .map_err(|e| format!("Error deserializando registros: {e}"))?;
                    // busca el registro que este activo
                    Ok(registros.into_iter().find(|r| r.esta_activo))
                } else {
                    Ok(None)
                }
            }
            Err(e) => Err(format!("Error obteniendo registro para {dominio}: {e}")),
        }
    }

    // envia la consulta en BASE64 a POST api dns resolver para resolucion remota
    pub async fn resolver_remoto_base64(&self, paquete_dns_crudo: &[u8]) -> Result<Vec<u8>, String> {
        // pasa el paquete de bytes a texto en BASE64
        let b64_entrada = BASE64.encode(paquete_dns_crudo);
        let payload = PaqueteDnsBase64 { data: b64_entrada };

        let url = format!("{}/api/dns_resolver", self.url_base);
        info!("Delegando consulta no estándar a {}", url);

        match self.cliente.post(&url).json(&payload).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    let res_payload: PaqueteDnsBase64 = resp
                        .json()
                        .await
                        .map_err(|e| format!("Error parseando JSON de resolver: {e}"))?;

                    // convierte la respuesta en BASE64 de vuelta a bytes binarios
                    BASE64
                        .decode(&res_payload.data)
                        .map_err(|e| format!("Error decodificando respuesta BASE64: {e}"))
                } else {
                    Err(format!("API resolutora retornó HTTP {}", resp.status()))
                }
            }
            Err(e) => Err(format!("Fallo contactando API resolutora remota: {e}")),
        }
    }

    // consulta el pais de la IP con el servicio de ubicacion
    #[allow(dead_code)]
    pub async fn consultar_pais_ip(&self, ip_cliente: &str) -> Option<String> {
        let url = format!("{}/api/ip-country/lookup?ip={}", self.url_base, ip_cliente);
        if let Ok(resp) = self.cliente.get(&url).send().await {
            if let Ok(datos) = resp.json::<RespuestaPaisIp>().await {
                return datos.codigo_pais;
            }
        }
        None
    }
}
