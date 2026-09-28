// servidor UDP asincrono que recibe y procesa las peticiones DNS

use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;
use tokio::net::UdpSocket;
use tracing::{info, warn};

use crate::api_client::ClienteApiDns;
use crate::config::Configuracion;
use crate::dns::{build_response, DnsMessage, PacketKind, ResolvedRecord};
use crate::resolver::MotorResolucion;

// tamano maximo del paquete DNS en UDP de 512 bytes
const TAMANO_MAX_PAQUETE_DNS: usize = 512;

// funcion principal que arranca el servidor UDP
pub async fn ejecutar(config: Configuracion) -> std::io::Result<()> {
    let direccion = config.direccion_socket();
    // abre el puerto UDP configurado
    let socket = UdpSocket::bind(&direccion).await?;
    let socket = Arc::new(socket);
    let cliente_api = Arc::new(ClienteApiDns::nuevo(config.url_api_dns));

    info!("DNS Interceptor activo y escuchando en udp://{}", direccion);

    let mut buf = [0u8; TAMANO_MAX_PAQUETE_DNS];
    // bucle para recibir paquetes por UDP
    loop {
        let (longitud, direccion_cliente) = match socket.recv_from(&mut buf).await {
            Ok(v) => v,
            Err(e) => {
                warn!("Error leyendo del socket UDP: {e}");
                continue;
            }
        };

        // copia los bytes para atender la peticion en segundo plano
        let paquete = buf[..longitud].to_vec();
        let socket_clon = Arc::clone(&socket);
        let api_clon = Arc::clone(&cliente_api);

        // levanta una tarea liviana en tokio para procesar el paquete
        tokio::spawn(async move {
            procesar_paquete(paquete, direccion_cliente, socket_clon, api_clon).await;
        });
    }
}

// procesa un paquete DNS recibido de un cliente
async fn procesar_paquete(
    paquete: Vec<u8>,
    direccion_cliente: SocketAddr,
    socket: Arc<UdpSocket>,
    cliente_api: Arc<ClienteApiDns>,
) {
    match DnsMessage::parse(paquete.clone()) {
        Ok(mensaje) => {
            let tipo_paquete = mensaje.classify();
            let ip_cliente_str = direccion_cliente.ip().to_string();

            match tipo_paquete {
                PacketKind::StandardQuery => match mensaje.question() {
                    Ok(pregunta) => {
                        info!(
                            "Paquete de {direccion_cliente}: id={:#06x} qname={} qtype={} qclass={} -> StandardQuery",
                            mensaje.header.id,
                            pregunta.qname,
                            pregunta.qtype,
                            pregunta.qclass
                        );

                        // Intenta resolver via API REST (verificar existencia + obtener registro)

                        match cliente_api.verificar_existencia(&pregunta.qname).await {
                            Ok(res_existe) if res_existe.existe => {
                                // Si el dominio existe localmente, busca el mejor registro segun estrategia
                                match cliente_api.obtener_registro(&pregunta.qname).await {
                                    Ok(Some(registro)) => {
                                        let pais_cliente = if registro.tipo == "geo" {
                                            cliente_api.consultar_pais_ip(&ip_cliente_str).await
                                        } else {
                                            None
                                        };

                                        if let Some((ip_destino, ttl)) = MotorResolucion::seleccionar_ip_destino(
                                            &registro,
                                            &ip_cliente_str,
                                            pais_cliente.as_deref(),
                                        ) {
                                            let registros = [ResolvedRecord {
                                                ip: IpAddr::V4(ip_destino),
                                                ttl,
                                            }];
                                            let respuesta = build_response(&mensaje, &pregunta, &registros);
                                            if let Err(e) = socket.send_to(&respuesta, direccion_cliente).await {
                                                warn!("Error enviando respuesta a {direccion_cliente}: {e}");
                                            }
                                            info!("Respuesta DNS enviada a {direccion_cliente} -> IP: {ip_destino} (estrategia: {})", registro.tipo);
                                            return;
                                        }
                                    }
                                    Ok(None) => {
                                        warn!("Dominio '{}' existe pero sin registros activos para {direccion_cliente}", pregunta.qname);
                                    }
                                    Err(e) => {
                                        warn!("Error obteniendo registro para '{}': {e}", pregunta.qname);
                                    }
                                }
                            }
                            Ok(_) => {
                                info!("Dominio '{}' no registrado localmente -> Reenviando a DNS API", pregunta.qname);
                            }
                            Err(e) => {
                                warn!("Error verificando existencia de '{}': {e} -> reenviando a DNS API", pregunta.qname);
                            }
                        }

                        // Fallback: si no se resolvio localmente, delega a la API resolutora
                        delegar_paquete_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
                    }
                    Err(e) => {
                        warn!("Paquete de {direccion_cliente} clasificado como StandardQuery pero con Question inválida: {e:?}");
                        // Aun asi intenta delegarlo
                        delegar_paquete_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
                    }
                },
                PacketKind::NonStandard => {
                    info!(
                        "Paquete de {direccion_cliente}: id={:#06x} opcode={} -> NonStandard, delegando al DNS API",
                        mensaje.header.id,
                        mensaje.header.opcode
                    );

                    delegar_paquete_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
                }
            }
        }
        Err(e) => {
            warn!("Paquete UDP descartado desde {direccion_cliente}: {e:?}");
            return;
        }
    };
}

// reenvia un paquete en BASE64 a la DNS API via resolver_remoto_base64
async fn delegar_paquete_no_estandar(
    paquete: Vec<u8>,
    direccion_cliente: SocketAddr,
    socket: Arc<UdpSocket>,
    cliente_api: Arc<ClienteApiDns>,
) {
    match cliente_api.resolver_remoto_base64(&paquete).await {
        Ok(bytes_respuesta) => {
            if let Err(e) = socket.send_to(&bytes_respuesta, direccion_cliente).await {
                warn!("Error reenviando respuesta del DNS API a {direccion_cliente}: {e}");
            }
            info!("Respuesta del DNS API decodificada y reenviada a {direccion_cliente}");
        }
        Err(e) => {
            warn!("Error delegando paquete de {direccion_cliente} al DNS API: {e}");
        }
    }
}

