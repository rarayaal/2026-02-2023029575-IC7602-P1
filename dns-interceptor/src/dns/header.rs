/// Tamaño fijo del header DNS: 12 bytes (segun RFC1035 §4.1.1).
pub const HEADER_SIZE: usize = 12;

/// Errores posibles al parsear un mensaje DNS. Se amplía en fases futuras (Question, Answer, etc.).
#[derive(Debug, PartialEq, Eq)]
pub enum DnsParseError {
    /// El paquete no alcanza los 12 bytes mínimos del header.
    TooShort,
}

/// Header de 12 bytes de un mensaje DNS (RFC1035 §4.1.1 / RFC2929).
///
/// Layout de los dos bytes de flags (bytes 2 y 3, después del ID):
/// ```text
/// byte 2: QR(1) OPCODE(4) AA(1) TC(1) RD(1)
/// byte 3: RA(1) Z(3)      RCODE(4)
/// ```
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DnsHeader {
    pub id: u16,
    /// Query (false) o Response (true).
    pub qr: bool,
    /// Tipo de operación: 0 = QUERY estándar, 1 = IQUERY, 2 = STATUS, etc.
    pub opcode: u8,
    /// Authoritative Answer.
    pub aa: bool,
    /// Truncation: el mensaje fue truncado por exceder el tamaño permitido.
    pub tc: bool,
    /// Recursion Desired (seteado por el cliente).
    pub rd: bool,
    /// Recursion Available (seteado por el servidor en la respuesta).
    pub ra: bool,
    /// Reservado para uso futuro, debe ser 0 según RFC1035 (RFC2929 lo reutiliza en extensiones).
    pub z: u8,
    /// Response code (0 = sin error, etc.).
    pub rcode: u8,
    pub qdcount: u16,
    pub ancount: u16,
    pub nscount: u16,
    pub arcount: u16,
}

impl DnsHeader {
    /// Parsea los primeros 12 bytes de un mensaje DNS crudo.
    pub fn parse(bytes: &[u8]) -> Result<Self, DnsParseError> {
        if bytes.len() < HEADER_SIZE {
            return Err(DnsParseError::TooShort);
        }

        let id = u16::from_be_bytes([bytes[0], bytes[1]]);

        // Los flags vienen empaquetados en bits, no en bytes completos, así que se extraen con máscaras.
        let flags_hi = bytes[2];
        let flags_lo = bytes[3];

        let qr = (flags_hi & 0b1000_0000) != 0;
        let opcode = (flags_hi >> 3) & 0b0000_1111;
        let aa = (flags_hi & 0b0000_0100) != 0;
        let tc = (flags_hi & 0b0000_0010) != 0;
        let rd = (flags_hi & 0b0000_0001) != 0;

        let ra = (flags_lo & 0b1000_0000) != 0;
        let z = (flags_lo >> 4) & 0b0000_0111;
        let rcode = flags_lo & 0b0000_1111;

        let qdcount = u16::from_be_bytes([bytes[4], bytes[5]]);
        let ancount = u16::from_be_bytes([bytes[6], bytes[7]]);
        let nscount = u16::from_be_bytes([bytes[8], bytes[9]]);
        let arcount = u16::from_be_bytes([bytes[10], bytes[11]]);

        Ok(Self {
            id,
            qr,
            opcode,
            aa,
            tc,
            rd,
            ra,
            z,
            rcode,
            qdcount,
            ancount,
            nscount,
            arcount,
        })
    }

    /// Criterio de clasificación del proyecto: query estándar = QR=0 y OPCODE=0 (ver enunciado P1).
    pub fn is_standard_query(&self) -> bool {
        !self.qr && self.opcode == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// ID=0x1234, QR=0, OPCODE=0, RD=1, QDCOUNT=1, resto en 0 (query estándar típico de un cliente).
    const STANDARD_QUERY: [u8; HEADER_SIZE] = [
        0x12, 0x34, // ID
        0x01, 0x00, // flags: RD=1, resto 0
        0x00, 0x01, // QDCOUNT=1
        0x00, 0x00, // ANCOUNT=0
        0x00, 0x00, // NSCOUNT=0
        0x00, 0x00, // ARCOUNT=0
    ];

    /// Mismo ID, pero OPCODE=1 (IQUERY) -> no es un query estándar según el criterio del proyecto.
    const NON_STANDARD_OPCODE: [u8; HEADER_SIZE] = [
        0x12, 0x34, 0x08, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];

    /// QR=1 (respuesta) -> tampoco es un query estándar entrante.
    const NON_STANDARD_QR: [u8; HEADER_SIZE] = [
        0x12, 0x34, 0x80, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ];

    #[test]
    fn parsea_header_de_query_estandar() {
        let header = DnsHeader::parse(&STANDARD_QUERY).unwrap();
        assert_eq!(header.id, 0x1234);
        assert!(!header.qr);
        assert_eq!(header.opcode, 0);
        assert!(header.rd);
        assert_eq!(header.qdcount, 1);
        assert!(header.is_standard_query());
    }

    #[test]
    fn clasifica_opcode_distinto_de_cero_como_no_estandar() {
        let header = DnsHeader::parse(&NON_STANDARD_OPCODE).unwrap();
        assert_eq!(header.opcode, 1);
        assert!(!header.is_standard_query());
    }

    #[test]
    fn clasifica_respuesta_como_no_estandar() {
        let header = DnsHeader::parse(&NON_STANDARD_QR).unwrap();
        assert!(header.qr);
        assert!(!header.is_standard_query());
    }

    #[test]
    fn rechaza_paquetes_mas_cortos_que_el_header() {
        let bytes = [0u8; 5];
        assert_eq!(DnsHeader::parse(&bytes), Err(DnsParseError::TooShort));
    }
}
