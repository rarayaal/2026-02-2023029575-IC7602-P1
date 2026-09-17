mod api_client;
mod config;
mod dns;
mod server;

use config::Config;

#[tokio::main]
async fn main() {
    // RUST_LOG=dns_interceptor=info (o debug) controla el nivel de detalle de los logs.
    tracing_subscriber::fmt::init();

    let config = Config::from_env();
    if let Err(e) = server::run(config).await {
        tracing::error!("El servidor UDP terminó con error: {e}");
        std::process::exit(1);
    }
}
