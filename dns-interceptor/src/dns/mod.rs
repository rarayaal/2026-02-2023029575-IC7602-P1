// submodulo para el manejo y parseo de paquetes DNS
pub mod builder;
pub mod header;
pub mod question;

pub use builder::construir_respuesta_dns;
pub use header::EncabezadoDns;
pub use question::PreguntaDns;
