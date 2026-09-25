//! Mock temporal para probar sin depender del DNS API real

use std::env;

use base64::engine::general_purpose::STANDARD;
use base64::Engine;
use serde_json::{json, Value};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};

#[tokio::main]
async fn main() {
    let port: u16 = env::var("MOCK_API_PORT")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(8081);

    let listener = TcpListener::bind(("0.0.0.0", port))
        .await
        .expect("no se pudo bindear el mock_dns_api");
    println!("mock_dns_api escuchando en http://0.0.0.0:{port}/api/dns_resolver");

    loop {
        let (socket, _) = match listener.accept().await {
            Ok(v) => v,
            Err(e) => {
                eprintln!("error aceptando conexión: {e}");
                continue;
            }
        };
        tokio::spawn(handle_connection(socket));
    }
}

async fn handle_connection(mut socket: TcpStream) {
    let mut buf = vec![0u8; 8192];
    let n = match socket.read(&mut buf).await {
        Ok(n) if n > 0 => n,
        _ => return,
    };

    let request = String::from_utf8_lossy(&buf[..n]);
    let body = request.split("\r\n\r\n").nth(1).unwrap_or("");

    let response_body = process_body(body);
    let http_response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        response_body.len(),
        response_body
    );

    let _ = socket.write_all(http_response.as_bytes()).await;
}

fn process_body(body: &str) -> String {
    let parsed: Value = match serde_json::from_str(body) {
        Ok(v) => v,
        Err(_) => return json!({"error": "invalid json"}).to_string(),
    };

    let encoded = match parsed.get("data").and_then(Value::as_str) {
        Some(s) => s,
        None => return json!({"error": "missing data field"}).to_string(),
    };

    let mut packet = match STANDARD.decode(encoded) {
        Ok(p) => p,
        Err(_) => return json!({"error": "invalid base64"}).to_string(),
    };

    // Marca de agua del mock: prendemos QR (byte 2, bit alto) para simular una "respuesta".
    if packet.len() > 2 {
        packet[2] |= 0b1000_0000;
    }

    json!({ "data": STANDARD.encode(&packet) }).to_string()
}
