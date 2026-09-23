use super::header::{DnsHeader, DnsParseError, HEADER_SIZE};
use super::question::Question;

/// Clasificación de un paquete DNS entrante, según el criterio definido en el enunciado del proyecto.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PacketKind {
    /// QR=0 y OPCODE=0: se resuelve localmente contra los registros del equipo (vía DNS API).
    StandardQuery,
    /// Cualquier otro caso: se delega íntegro (BASE64/HTTPS) al DNS API.
    NonStandard,
}

/// Un mensaje DNS recibido: header ya parseado + bytes crudos completos.
#[derive(Debug)]
pub struct DnsMessage {
    pub header: DnsHeader,
    pub raw: Vec<u8>,
}

impl DnsMessage {
    /// Parsea únicamente el header, lo demás se parsea en módulos dedicados.
    pub fn parse(raw: Vec<u8>) -> Result<Self, DnsParseError> {
        let header = DnsHeader::parse(&raw)?;
        Ok(Self { header, raw })
    }

    pub fn classify(&self) -> PacketKind {
        if self.header.is_standard_query() {
            PacketKind::StandardQuery
        } else {
            PacketKind::NonStandard
        }
    }

    /// Bytes posteriores al header, donde empieza la sección Question (RFC1035 §4.1.2).
    pub fn body(&self) -> &[u8] {
        &self.raw[HEADER_SIZE..]
    }

    /// Parsea la sección Question a partir de los bytes del cuerpo.
    pub fn question(&self) -> Result<Question, DnsParseError> {
        Question::parse(self.body())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const STANDARD_QUERY: [u8; HEADER_SIZE] = [
        0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];

    #[test]
    fn clasifica_query_estandar_correctamente() {
        let msg = DnsMessage::parse(STANDARD_QUERY.to_vec()).unwrap();
        assert_eq!(msg.classify(), PacketKind::StandardQuery);
        assert!(msg.body().is_empty());
    }

    #[test]
    fn body_devuelve_los_bytes_posteriores_al_header() {
        let mut raw = STANDARD_QUERY.to_vec();
        raw.extend_from_slice(&[0xAA, 0xBB]);
        let msg = DnsMessage::parse(raw).unwrap();
        assert_eq!(msg.body(), &[0xAA, 0xBB]);
    }

    #[test]
    fn rechaza_paquete_demasiado_corto() {
        let raw = vec![0u8; 3];
        assert!(DnsMessage::parse(raw).is_err());
    }
}
