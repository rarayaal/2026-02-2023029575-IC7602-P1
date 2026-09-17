// servidor UDP asincrono que recibe y procesa las peticiones DNS

use std::net::{Ipv4Addr, SocketAddr};
use std::sync::Arc;
use tokio::net::UdpSocket;
use tracing::{error, info, warn};

use crate::api_client::ClienteApiDns;
use crate::config::Configuracion;
use crate::dns::{construir_respuesta_dns, EncabezadoDns, PreguntaDns};
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
    // lee el encabezado de 12 bytes
    let encabezado = match EncabezadoDns::parsear(&paquete) {
        Ok(h) => h,
        Err(e) => {
            warn!("Paquete UDP descartado desde {direccion_cliente}: {e:?}");
            return;
        }
    };

    // si no es una consulta estandar se manda a la API en BASE64
    if !encabezado.es_consulta_estandar() {
        info!("Paquete No Estándar recibido de {direccion_cliente} -> Delegando a DNS API");
        delegar_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
        return;
    }

    // lee la seccion de pregunta para sacar el nombre del dominio
    let pregunta = match PreguntaDns::parsear(&paquete) {
        Ok(q) => q,
        Err(e) => {
            warn!("Sección Question inválida desde {direccion_cliente}: {e:?}");
            delegar_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
            return;
        }
    };

    let ip_cliente_str = direccion_cliente.ip().to_string();
    info!("Consulta estándar de {direccion_cliente} para host: '{}'", pregunta.nombre_host);

    // revisa con la API REST si el dominio existe
    match cliente_api.verificar_existencia(&pregunta.nombre_host).await {
        Ok(res_existe) if res_existe.existe => {
            // si existe trae las IPs y busca la mejor con la estrategia
            if let Ok(Some(registro)) = cliente_api.obtener_registro(&pregunta.nombre_host).await {
                if let Some((ip_destino, ttl)) = MotorResolucion::seleccionar_ip_destino(&registro, &ip_cliente_str) {
                    if let Ok(bytes_respuesta) = construir_respuesta_dns(&paquete, ip_destino, ttl) {
                        // devuelve la respuesta al cliente UDP
                        let _ = socket.send_to(&bytes_respuesta, direccion_cliente).await;
                        info!("Respuesta DNS enviada a {direccion_cliente} -> IP: {ip_destino}");
                        return;
                    }
                }
            }
            warn!("No se pudo seleccionar una IP sana para '{}' -> aplicando fallback", pregunta.nombre_host);
            delegar_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
        }
        Ok(_) => {
            // si no esta registrado lo delega a la API resolutora
            info!("Dominio '{}' no registrado localmente -> Reenviando a DNS API", pregunta.nombre_host);
            delegar_no_estandar(paquete, direccion_cliente, socket, cliente_api).await;
        }
        Err(e) => {
            // si la API esta caida responde 127.0.0.1 para probar localmente sin caidas
            warn!("DNS API fuera de línea ({e}). Modo pruebas locales: respondiendo 127.0.0.1 para '{}'", pregunta.nombre_host);
            let ip_prueba = Ipv4Addr::new(127, 0, 0, 1);
            if let Ok(bytes_respuesta) = construir_respuesta_dns(&paquete, ip_prueba, 300) {
                let _ = socket.send_to(&bytes_respuesta, direccion_cliente).await;
                info!("Respuesta DNS de prueba enviada a {direccion_cliente} -> IP: {ip_prueba}");
            }
        }
    }
}

// reenvia las peticiones no estandares o no registradas en BASE64 a la DNS API
async fn delegar_no_estandar(
    paquete: Vec<u8>,
    direccion_cliente: SocketAddr,
    socket: Arc<UdpSocket>,
    cliente_api: Arc<ClienteApiDns>,
) {
    match cliente_api.resolver_remoto_base64(&paquete).await {
        Ok(bytes_respuesta) => {
            let _ = socket.send_to(&bytes_respuesta, direccion_cliente).await;
            info!("Respuesta remota decodificada y enviada a {direccion_cliente}");
        }
        Err(e) => {
            error!("Fallo en la delegación remota para {direccion_cliente}: {e}");
            // si falla la delegacion responde la IP local por respaldo
            let ip_prueba = Ipv4Addr::new(127, 0, 0, 1);
            if let Ok(bytes_respuesta) = construir_respuesta_dns(&paquete, ip_prueba, 300) {
                let _ = socket.send_to(&bytes_respuesta, direccion_cliente).await;
                info!("Respuesta DNS de contingencia enviada a {direccion_cliente} -> IP: {ip_prueba}");
            }
        }
    }
}
