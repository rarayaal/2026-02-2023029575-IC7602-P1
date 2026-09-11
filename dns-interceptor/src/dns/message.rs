use super::header::{DnsHeader, DnsParseError, HEADER_SIZE};

/// Clasificación de un paquete DNS entrante, según el criterio definido en el enunciado del proyecto.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PacketKind {
    /// QR=0 y OPCODE=0: se resuelve localmente contra los registros del equipo (vía DNS API).
    StandardQuery,
    /// Cualquier otro caso: se delega íntegro (BASE64/HTTPS) al DNS API (aun no existe).
    NonStandard,
}

/// Un mensaje DNS recibido: header ya parseado + bytes crudos completos.
///
/// Conservamos `raw` porque, para paquetes no estándar, el paquete completo se reenvía tal cual
/// (codificado en BASE64) al DNS API — no hace falta reconstruirlo desde los campos parseados.
#[derive(Debug)]
pub struct DnsMessage {
    pub header: DnsHeader,
    // Se usa a partir de la Fase 5 (delegación BASE64 al DNS API); por ahora solo lo leen los tests.
    #[allow(dead_code)]
    pub raw: Vec<u8>,
}

impl DnsMessage {
    /// Parsea únicamente el header, lo demas se parsea en futuros feats.
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
    // Se usa a partir de la Fase 3 para extraer el hostname; por ahora solo lo leen los tests.
    #[allow(dead_code)]
    pub fn body(&self) -> &[u8] {
        &self.raw[HEADER_SIZE..]
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
        assert!(msg.body().is_empty()); // no hay Question en este ejemplo, solo header
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
