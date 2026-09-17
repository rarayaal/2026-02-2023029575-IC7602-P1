// archivo principal del DNS Interceptor

mod api_client;
mod config;
mod dns;
mod models;
mod resolver;
mod server;

use config::Configuracion;

#[tokio::main]
async fn main() {
    // inicializa los logs para ver la consola
    tracing_subscriber::fmt::init();

    // carga la configuracion de las variables de entorno
    let config = Configuracion::desde_entorno();
    tracing::info!("Cargada configuración para puerto UDP {}", config.puerto_udp);

    // arranca el servidor UDP en Tokio
    if let Err(e) = server::ejecutar(config).await {
        tracing::error!("Error fatal en el servidor UDP: {e}");
        std::process::exit(1);
    }
}
