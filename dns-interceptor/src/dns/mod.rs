// submodulo para el manejo y parseo de paquetes DNS
pub mod builder;
pub mod header;
pub mod message;
pub mod question;
pub mod response;

pub use builder::construir_respuesta_dns;
pub use header::DnsHeader;
pub use header::EncabezadoDns;
pub use message::{DnsMessage, PacketKind};
pub use question::{PreguntaDns, Question};
pub use response::{build_response, ResolvedRecord};
