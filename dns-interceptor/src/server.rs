use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;

use tokio::net::UdpSocket;
use tracing::{info, warn};

use crate::api_client;
use crate::config::Config;
use crate::dns::{build_response, DnsMessage, PacketKind, ResolvedRecord};

/// Tamaño clásico máximo de un mensaje DNS sobre UDP sin EDNS0.
/// Paquetes más grandes se fragmentan (todavía no implementado).
const MAX_DNS_PACKET_SIZE: usize = 512;

/// Levanta el socket UDP y despacha cada paquete recibido a su propia tarea async.
pub async fn run(config: Config) -> std::io::Result<()> {
    let addr = config.socket_addr();
    let socket = UdpSocket::bind(&addr).await?;
    // Arc: el socket se comparte entre todas las tareas para poder responder a cada cliente.
    let socket = Arc::new(socket);
    info!("DNS Interceptor escuchando en udp://{addr}");

    // reqwest::Client ya es internamente un Arc; clonarlo por tarea es barato y comparte el connection pool.
    let http_client = reqwest::Client::builder()
        .timeout(Duration::from_millis(config.dns_api_timeout_ms))
        .build()
        .expect("no se pudo construir el cliente HTTP");
    let dns_api_url = Arc::new(config.dns_api_url.clone());

    let mut buf = [0u8; MAX_DNS_PACKET_SIZE];
    loop {
        let (len, client_addr) = match socket.recv_from(&mut buf).await {
            Ok(v) => v,
            Err(e) => {
                // No abortamos el loop por un error puntual de un paquete: el servidor debe seguir vivo.
                warn!("Error leyendo del socket UDP: {e}");
                continue;
            }
        };

        // Copiamos los bytes porque `buf` se reutiliza en la siguiente iteración del loop.
        let packet = buf[..len].to_vec();
        let socket = Arc::clone(&socket);
        let http_client = http_client.clone();
        let dns_api_url = Arc::clone(&dns_api_url);

        // Un tokio::spawn por paquete permite atender solicitudes simultáneas sin bloquear el loop.
        tokio::spawn(async move {
            handle_packet(packet, client_addr, socket, http_client, dns_api_url).await;
        });
    }
}

/// Procesa un único paquete: parsea el header, lo clasifica y, si es un query estándar, extrae
/// el hostname y responde con el serializador genérico. Los paquetes no estándar se delegan
/// íntegros al DNS API.
async fn handle_packet(
    packet: Vec<u8>,
    client_addr: SocketAddr,
    socket: Arc<UdpSocket>,
    http_client: reqwest::Client,
    dns_api_url: Arc<String>,
) {
    match DnsMessage::parse(packet) {
        Ok(message) => {
            let kind = message.classify();

            match kind {
                // Solo los query estándar se resuelven localmente, el resto se delega
                // íntegro al DNS API, sin necesidad de leer su contenido.
                PacketKind::StandardQuery => match message.question() {
                    Ok(question) => {
                        info!(
                            "Paquete de {client_addr}: id={:#06x} qname={} qtype={} qclass={} -> {:?}",
                            message.header.id, question.qname, question.qtype, question.qclass, kind
                        );

                        // Placeholder mientras no esta la integración con la API.
                        let records = [ResolvedRecord {
                            ip: "93.184.216.34".parse().unwrap(),
                            ttl: 300,
                        }];
                        let response = build_response(&message, &question, &records);

                        if let Err(e) = socket.send_to(&response, client_addr).await {
                            warn!("Error enviando respuesta a {client_addr}: {e}");
                        }
                    }
                    Err(e) => warn!(
                        "Paquete de {client_addr} clasificado como {kind:?} pero con Question inválida: {e:?}"
                    ),
                },
                PacketKind::NonStandard => {
                    info!(
                        "Paquete de {client_addr}: id={:#06x} opcode={} -> {:?}, delegando al DNS API",
                        message.header.id, message.header.opcode, kind
                    );

                    match api_client::resolve_via_api(&http_client, &dns_api_url, &message.raw).await {
                        Ok(response) => {
                            if let Err(e) = socket.send_to(&response, client_addr).await {
                                warn!("Error enviando respuesta del DNS API a {client_addr}: {e}");
                            }
                        }
                        // Si el DNS API no responde, no se envía nada, el cliente reintentará o expirará su propio timeout
                        Err(e) => warn!("Error delegando paquete de {client_addr} al DNS API: {e:?}"),
                    }
                }
            }
        }
        // Un header inválido no bota el servidor, solo se descarta el paquete.
        Err(e) => {
            warn!("Paquete de {client_addr} descartado, header inválido: {e:?}");
        }
    }
}
