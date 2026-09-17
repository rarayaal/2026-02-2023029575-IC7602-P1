pub mod header;
pub mod message;
pub mod question;
pub mod response;

#[allow(unused_imports)]
pub use header::DnsHeader;
pub use message::{DnsMessage, PacketKind};
#[allow(unused_imports)]
pub use question::Question;
#[allow(unused_imports)]
pub use response::{build_response, ResolvedRecord};
