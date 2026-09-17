use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::Duration;
use tracing::info;

use crate::models::{PaqueteDnsBase64, RegistroDns, RespuestaExiste, RespuestaPaisIp};

#[derive(Debug, Serialize)]
struct ResolveRequest<'a> {
    data: &'a str,
}

#[derive(Debug, Deserialize)]
struct ResolveResponse {
    data: String,
}

#[derive(Debug)]
pub enum ApiClientError {
    Request(reqwest::Error),
    BadStatus(reqwest::StatusCode),
    InvalidBase64(base64::DecodeError),
}

pub async fn resolve_via_api(
    client: &Client,
    base_url: &str,
    packet: &[u8],
) -> Result<Vec<u8>, ApiClientError> {
    let encoded = STANDARD.encode(packet);
    let url = format!("{base_url}/api/dns_resolver");

    let response = client
        .post(&url)
        .json(&ResolveRequest { data: &encoded })
        .send()
        .await
        .map_err(ApiClientError::Request)?;

    if !response.status().is_success() {
        return Err(ApiClientError::BadStatus(response.status()));
    }

    let body: ResolveResponse = response.json().await.map_err(ApiClientError::Request)?;
    STANDARD
        .decode(body.data)
        .map_err(ApiClientError::InvalidBase64)
}

#[derive(Clone)]
pub struct ClienteApiDns {
    cliente: Client,
    url_base: String,
}

impl ClienteApiDns {
    pub fn nuevo(url_base: String) -> Self {
        let cliente = Client::builder()
            .timeout(Duration::from_secs(3))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self { cliente, url_base }
    }

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

    pub async fn obtener_registro(&self, dominio: &str) -> Result<Option<RegistroDns>, String> {
        let url = format!("{}/api/records?domain={}", self.url_base, dominio);
        match self.cliente.get(&url).send().await {
            Ok(resp) => {
                if resp.status().is_success() {
                    let registros: Vec<RegistroDns> = resp
                        .json()
                        .await
                        .map_err(|e| format!("Error deserializando registros: {e}"))?;
                    Ok(registros.into_iter().find(|r| r.esta_activo))
                } else {
                    Ok(None)
                }
            }
            Err(e) => Err(format!("Error obteniendo registro para {dominio}: {e}")),
        }
    }

    pub async fn resolver_remoto_base64(&self, paquete_dns_crudo: &[u8]) -> Result<Vec<u8>, String> {
        let url = format!("{}/api/dns_resolver", self.url_base);
        info!("Delegando consulta no estándar a {}", url);

        resolve_via_api(&self.cliente, &self.url_base, paquete_dns_crudo)
            .await
            .map_err(|e| match e {
                ApiClientError::Request(err) => {
                    format!("Fallo contactando API resolutora remota: {err}")
                }
                ApiClientError::BadStatus(status) => {
                    format!("API resolutora retornó HTTP {status}")
                }
                ApiClientError::InvalidBase64(err) => {
                    format!("Error decodificando respuesta BASE64: {err}")
                }
            })
    }

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
