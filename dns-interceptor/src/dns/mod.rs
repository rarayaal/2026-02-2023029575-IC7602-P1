// submodulo para el manejo y parseo de paquetes DNS
pub mod header;
pub mod message;
pub mod question;
pub mod response;

pub use message::{DnsMessage, PacketKind};
pub use response::{build_response, ResolvedRecord};
