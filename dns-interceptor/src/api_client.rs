use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize)]
struct ResolveRequest<'a> {
    data: &'a str,
}

#[derive(Debug, Deserialize)]
struct ResolveResponse {
    data: String,
}

/// Errores posibles al delegar un paquete al DNS API.
#[allow(dead_code)]
#[derive(Debug)]
pub enum ApiClientError {
    /// Falla de red/timeout/DNS al hacer la solicitud HTTP.
    Request(reqwest::Error),
    /// El DNS API respondió pero con un status code de error.
    BadStatus(reqwest::StatusCode),
    /// El campo `data` de la respuesta no es BASE64 válido.
    InvalidBase64(base64::DecodeError),
}

/// Codifica el paquete DNS completo en BASE64 y lo delega al DNS API vía HTTPS.
///
/// Se usa para paquetes no estándar (por el momento). Decodifica la respuesta BASE64 recibida y
/// devuelve los bytes listos para reenviar tal cual al cliente original.
pub async fn resolve_via_api(
    client: &reqwest::Client,
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

    STANDARD.decode(body.data).map_err(ApiClientError::InvalidBase64)
}
