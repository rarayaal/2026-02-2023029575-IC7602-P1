use std::net::SocketAddr;
use std::sync::Arc;

use tokio::net::UdpSocket;
use tracing::{info, warn};

use crate::config::Config;
use crate::dns::{DnsMessage, PacketKind};

/// Tamaño clásico máximo de un mensaje DNS sobre UDP sin EDNS0 (RFC1035 sección 4.2.1).
/// Paquetes más grandes se fragmentan (todavía no implementado).
const MAX_DNS_PACKET_SIZE: usize = 512;

/// Levanta el socket UDP y despacha cada paquete recibido a su propia tarea async.
pub async fn run(config: Config) -> std::io::Result<()> {
    let addr = config.socket_addr();
    let socket = UdpSocket::bind(&addr).await?;
    // Arc: el socket se comparte entre todas las tareas para poder responder a cada cliente.
    let socket = Arc::new(socket);
    info!("DNS Interceptor escuchando en udp://{addr}");

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

        // Un tokio::spawn por paquete permite atender solicitudes simultáneas sin bloquear el loop.
        tokio::spawn(async move {
            handle_packet(packet, client_addr, socket).await;
        });
    }
}

/// Procesa un único paquete: parsea el header, lo clasifica y, si es un query estándar, extrae
/// el hostname. Por ahora no se hace un envio "real".
async fn handle_packet(packet: Vec<u8>, client_addr: SocketAddr, _socket: Arc<UdpSocket>) {
    match DnsMessage::parse(packet) {
        Ok(message) => {
            let kind = message.classify();

            match kind {
                // Solo los query estándar se resuelven localmente, el resto se delega
                // íntegro al DNS API, sin necesidad de leer su contenido.
                PacketKind::StandardQuery => match message.question() {
                    Ok(question) => info!(
                        "Paquete de {client_addr}: id={:#06x} qname={} qtype={} qclass={} -> {:?}",
                        message.header.id, question.qname, question.qtype, question.qclass, kind
                    ),
                    Err(e) => warn!(
                        "Paquete de {client_addr} clasificado como {kind:?} pero con Question inválida: {e:?}"
                    ),
                },
                PacketKind::NonStandard => info!(
                    "Paquete de {client_addr}: id={:#06x} opcode={} -> {:?}",
                    message.header.id, message.header.opcode, kind
                ),
            }
        }
        // Un header inválido no bota el servidor, solo se descarta el paquete.
        Err(e) => {
            warn!("Paquete de {client_addr} descartado, header inválido: {e:?}");
        }
    }
}
