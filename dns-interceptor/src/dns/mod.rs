pub mod header;
pub mod message;

// Re-exportados para las fases siguientes del Interceptor.
#[allow(unused_imports)]
pub use header::DnsHeader;
#[allow(unused_imports)]
pub use message::{DnsMessage, PacketKind};
