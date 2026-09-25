// modelos de datos para hablar con la DNS API en formato JSON

use serde::{Deserialize, Serialize};

// respuesta del GET api exists para ver si el dominio existe
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RespuestaExiste {
    // verdadero si el dominio esta en la base de datos
    #[serde(alias = "exists")]
    pub existe: bool,
    // nombre de host consultado
    pub hostname: String,
    // tipo de registro como single multi weight geo roundtrip o None si no existe
    #[serde(alias = "type")]
    pub tipo: Option<String>,
}

// representa una IP de destino asociada a un dominio
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DestinoDns {
    // id unico del destino
    pub id: Option<String>,
    // direccion IP v4 de la maquina
    pub ip: String,
    // peso para el balanceo probabilistico
    #[serde(alias = "weight")]
    pub peso: Option<u32>,
    // codigo del pais de dos letras para el ruteo por zona
    #[serde(alias = "country")]
    pub pais: Option<String>,
    // estado reportado por el monitor de salud
    #[serde(alias = "status")]
    pub estado: Option<String>,
    // latencia en milisegundos para la estrategia roundtrip
    #[serde(alias = "avgLatencyMs", alias = "latency", alias = "rtt")]
    pub latencia_promedio_ms: Option<f64>,
}

impl DestinoDns {
    // revisa si la IP esta buena para mandarle trafico
    pub fn esta_sano(&self) -> bool {
        match self.estado.as_deref() {
            Some("healthy") => true,
            Some("unhealthy") => false,
            _ => true, // si no se sabe se asume buena por defecto
        }
    }
}

// registro DNS completo traido desde la API en Java
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RegistroDns {
    // id del registro
    pub id: Option<String>,
    // nombre del dominio
    #[serde(alias = "domain", alias = "hostname")]
    pub dominio: String,
    // estrategia de resolucion configurada
    #[serde(alias = "type")]
    pub tipo: String,
    // tiempo de vida TTL en segundos
    pub ttl: u32,
    // indica si el registro esta activo
    #[serde(alias = "isActive", alias = "active")]
    pub esta_activo: bool,
    // lista de destinos o IPs asociadas
    #[serde(alias = "targets")]
    pub destinos: Vec<DestinoDns>,
}

// paquete DNS binario metido en BASE64 para enviar a la API
#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct PaqueteDnsBase64 {
    // paquete en BASE64
    pub data: String,
}

// respuesta del servicio de ubicacion por IP
#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RespuestaPaisIp {
    // codigo del pais
    #[serde(alias = "countryCode", alias = "country")]
    pub codigo_pais: Option<String>,
    // nombre del pais
    #[serde(alias = "countryName", alias = "name")]
    pub nombre_pais: Option<String>,
}
