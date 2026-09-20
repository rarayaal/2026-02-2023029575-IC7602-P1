// motor de resolucion DNS con las cinco estrategias de seleccion de IP

use rand::Rng;
use std::net::Ipv4Addr;
use std::str::FromStr;
use std::sync::atomic::{AtomicUsize, Ordering};
use tracing::{info, warn};

use crate::models::{DestinoDns, RegistroDns};

// contador global para la estrategia multi o round robin
static CONTADOR_MULTI: AtomicUsize = AtomicUsize::new(0);

// estructura principal del motor de resolucion
pub struct MotorResolucion;

impl MotorResolucion {
    // selecciona la mejor IP segun la estrategia configurada descartando las enfermas
    pub fn seleccionar_ip_destino(
        registro: &RegistroDns,
        ip_cliente_str: &str,
    ) -> Option<(Ipv4Addr, u32)> {
        // saca solo las IPs que estan sanas
        let destinos_sanos: Vec<&DestinoDns> = registro
            .destinos
            .iter()
            .filter(|t| t.esta_sano())
            .collect();

        // si no hay IPs buenas retorna nada
        if destinos_sanos.is_empty() {
            warn!("No hay destinos saludables disponibles para el dominio '{}'", registro.dominio);
            return None;
        }

        // ejecuta la estrategia correspondiente
        let destino_seleccionado = match registro.tipo.as_str() {
            // retorna la primera IP buena disponible
            "single" => destinos_sanos.first().copied(),

            // turno a turno entre las IPs sanas
            "multi" => {
                let idx = CONTADOR_MULTI.fetch_add(1, Ordering::Relaxed) % destinos_sanos.len();
                destinos_sanos.get(idx).copied()
            }

            // eleccion al azar segun el peso asignado
            "weight" => Self::seleccionar_por_peso(&destinos_sanos),

            // eleccion por ubicacion geografica o al azar
            "geo" => Self::seleccionar_por_geo(&destinos_sanos, ip_cliente_str),

            // escoge la IP con menor tiempo de respuesta RTT
            "round-trip" => Self::seleccionar_por_latencia(&destinos_sanos),

            desconocido => {
                warn!("Estrategia de resolución desconocida: '{}'. Usando primera IP sana.", desconocido);
                destinos_sanos.first().copied()
            }
        };

        // convierte la IP en formato de texto a Ipv4Addr
        if let Some(destino) = destino_seleccionado {
            if let Ok(ip) = Ipv4Addr::from_str(&destino.ip) {
                info!(
                    "Estrategia [{}] para '{}' seleccionó IP {} (cliente: {})",
                    registro.tipo, registro.dominio, ip, ip_cliente_str
                );
                return Some((ip, registro.ttl));
            }
        }

        None
    }

    // seleccion por peso acumulado
    fn seleccionar_por_peso<'a>(destinos: &[&'a DestinoDns]) -> Option<&'a DestinoDns> {
        let peso_total: u32 = destinos.iter().map(|t| t.peso.unwrap_or(1)).sum();
        if peso_total == 0 {
            return destinos.first().copied();
        }

        let mut rng = rand::thread_rng();
        let mut valor_objetivo = rng.gen_range(1..=peso_total);

        for destino in destinos {
            let peso = destino.peso.unwrap_or(1);
            if valor_objetivo <= peso {
                return Some(destino);
            }
            valor_objetivo -= peso;
        }

        destinos.first().copied()
    }

    // seleccion por pais
    fn seleccionar_por_geo<'a>(destinos: &[&'a DestinoDns], _ip_cliente: &str) -> Option<&'a DestinoDns> {
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..destinos.len());
        destinos.get(idx).copied()
    }

    // seleccion por la latencia mas baja
    fn seleccionar_por_latencia<'a>(destinos: &[&'a DestinoDns]) -> Option<&'a DestinoDns> {
        destinos
            .iter()
            .min_by(|a, b| {
                let rtt_a = a.latencia_promedio_ms.unwrap_or(f64::MAX);
                let rtt_b = b.latencia_promedio_ms.unwrap_or(f64::MAX);
                rtt_a.partial_cmp(&rtt_b).unwrap_or(std::cmp::Ordering::Equal)
            })
            .copied()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{DestinoDns, RegistroDns};

    fn crear_destino(ip: &str, peso: u32, estado: &str, latencia: f64) -> DestinoDns {
        DestinoDns {
            id: None,
            ip: ip.to_string(),
            peso: Some(peso),
            pais: None,
            estado: Some(estado.to_string()),
            latencia_promedio_ms: Some(latencia),
        }
    }

    #[test]
    fn test_estrategia_single() {
        let registro = RegistroDns {
            id: None,
            dominio: "single.com".to_string(),
            tipo: "single".to_string(),
            ttl: 300,
            esta_activo: true,
            destinos: vec![crear_destino("10.0.0.1", 1, "healthy", 10.0)],
        };

        let res = MotorResolucion::seleccionar_ip_destino(&registro, "127.0.0.1").unwrap();
        assert_eq!(res.0, Ipv4Addr::new(10, 0, 0, 1));
    }

    #[test]
    fn test_estrategia_multi_round_robin() {
        let registro = RegistroDns {
            id: None,
            dominio: "multi.com".to_string(),
            tipo: "multi".to_string(),
            ttl: 300,
            esta_activo: true,
            destinos: vec![
                crear_destino("10.0.0.1", 1, "healthy", 10.0),
                crear_destino("10.0.0.2", 1, "healthy", 10.0),
            ],
        };

        let res1 = MotorResolucion::seleccionar_ip_destino(&registro, "127.0.0.1").unwrap();
        let res2 = MotorResolucion::seleccionar_ip_destino(&registro, "127.0.0.1").unwrap();

        assert_ne!(res1.0, res2.0);
    }

    #[test]
    fn test_estrategia_round_trip_menor_latencia() {
        let registro = RegistroDns {
            id: None,
            dominio: "rt.com".to_string(),
            tipo: "round-trip".to_string(),
            ttl: 300,
            esta_activo: true,
            destinos: vec![
                crear_destino("10.0.0.1", 1, "healthy", 50.0),
                crear_destino("10.0.0.2", 1, "healthy", 5.0),
            ],
        };

        let res = MotorResolucion::seleccionar_ip_destino(&registro, "127.0.0.1").unwrap();
        assert_eq!(res.0, Ipv4Addr::new(10, 0, 0, 2));
    }

    #[test]
    fn test_ignora_destinos_unhealthy() {
        let registro = RegistroDns {
            id: None,
            dominio: "down.com".to_string(),
            tipo: "single".to_string(),
            ttl: 300,
            esta_activo: true,
            destinos: vec![crear_destino("10.0.0.1", 1, "unhealthy", 10.0)],
        };

        assert!(MotorResolucion::seleccionar_ip_destino(&registro, "127.0.0.1").is_none());
    }
}
