// modelos de datos para hablar con la DNS API en formato JSON según docs/contrato-dns-api.md

use serde::{Deserialize, Serialize};

/// Respuesta del GET /api/exists
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RespuestaExiste {
    /// verdadero si el dominio existe y está activo
    #[serde(rename = "exists")]
    pub existe: bool,
    /// nombre de host consultado (normalizado)
    pub hostname: String,
    /// tipo de registro: "single", "multi", "weight", "geo", "round-trip" o None si no existe
    #[serde(rename = "type")]
    pub tipo: Option<String>,
}

/// Representa una IP de destino (target) asociada a un dominio
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct DestinoDns {
    /// ID único del destino asignado por la BD
    pub id: Option<String>,
    /// Dirección IPv4 de destino
    pub ip: String,
    /// Peso relativo para balanceo probabilístico (estrategia weight)
    #[serde(rename = "weight")]
    pub peso: Option<u32>,
    /// Código ISO de país (2 letras) para ruteo geográfico (estrategia geo)
    #[serde(rename = "country")]
    pub pais: Option<String>,
    /// Estado reportado por el Health Checker ("healthy", "unhealthy", "unknown")
    #[serde(rename = "status")]
    pub estado: Option<String>,
    /// ID del health check configurado para esta IP
    #[serde(rename = "healthCheckId")]
    pub health_check_id: Option<String>,
    /// Latencia promedio RTT en ms (estrategia round-trip)
    #[serde(rename = "avgRttMs")]
    pub latencia_promedio_ms: Option<f64>,
    /// Latencia mínima RTT en ms
    #[serde(rename = "minRttMs")]
    pub min_rtt_ms: Option<f64>,
    /// Fecha de la última prueba de salud realizada
    #[serde(rename = "lastCheckAt")]
    pub last_check_at: Option<String>,
}

impl DestinoDns {
    /// Revisa si la IP está saludable para enviarle tráfico
    pub fn esta_sano(&self) -> bool {
        match self.estado.as_deref() {
            Some("healthy") => true,
            Some("unhealthy") => false,
            _ => true, // si no se sabe ("unknown" o None), se asume buena por defecto
        }
    }
}

/// Registro DNS completo retornado por el DNS API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RegistroDns {
    /// ID único del registro
    pub id: Option<String>,
    /// Nombre de dominio (ej. "api.company.com")
    #[serde(rename = "domain")]
    pub dominio: String,
    /// Estrategia de resolución ("single", "multi", "weight", "geo", "round-trip")
    #[serde(rename = "type")]
    pub tipo: String,
    /// Time to Live en segundos
    pub ttl: u32,
    /// Indica si el registro está activo en el sistema
    #[serde(rename = "isActive")]
    pub esta_activo: bool,
    /// Lista de destinos (targets) asociados
    #[serde(rename = "targets")]
    pub destinos: Vec<DestinoDns>,
}

/// Paquete DNS binario en BASE64 enviado a /api/dns_resolver
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PaqueteDnsBase64 {
    pub data: String,
}

/// Respuesta del servicio IP-to-Country (/api/ip-country/lookup?ip=...)
#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct RespuestaPaisIp {
    pub ip: Option<String>,
    #[serde(rename = "countryCode")]
    pub codigo_pais: Option<String>,
    #[serde(rename = "countryName")]
    pub nombre_pais: Option<String>,
}
