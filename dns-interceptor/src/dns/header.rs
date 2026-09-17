// modulo para parsear el encabezado de un paquete DNS
pub const TAMANO_ENCABEZADO: usize = 12;

// errores de lectura al procesar los bytes
#[derive(Debug, PartialEq, Eq)]
pub enum ErrorParseoDns {
    DemasiadoCorto,
    PreguntaInvalida,
}

// estructura con los 12 bytes del encabezado DNS
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EncabezadoDns {
    pub id: u16, // identificador de transaccion
    pub qr: bool, // cero consulta uno respuesta
    pub opcode: u8, // cero consulta estandar
    pub aa: bool, // uno respuesta autorizada
    pub tc: bool, // uno paquete truncado
    pub rd: bool, // uno si pide resolucion recursiva
    pub ra: bool, // uno si el servidor soporta recursion
    pub z: u8, // tres bits reservados
    pub rcode: u8, // codigo de respuesta
    pub qdcount: u16, // cantidad de preguntas
    pub ancount: u16, // cantidad de respuestas
    pub nscount: u16, // cantidad de registros de autoridad
    pub arcount: u16, // cantidad de registros adicionales
}

impl EncabezadoDns {
    // interpreta los primeros 12 bytes de la trama
    pub fn parsear(bytes: &[u8]) -> Result<Self, ErrorParseoDns> {
        if bytes.len() < TAMANO_ENCABEZADO { // revisa que tenga al menos 12 bytes
            return Err(ErrorParseoDns::DemasiadoCorto);
        }

        let id = u16::from_be_bytes([bytes[0], bytes[1]]); // ID de transaccion
        let flags_alto = bytes[2]; // flags de control parte alta
        let flags_bajo = bytes[3]; // flags de control parte baja

        // extrae bit por bit
        let qr = (flags_alto & 0b1000_0000) != 0; // QR bit 7
        let opcode = (flags_alto >> 3) & 0b0000_1111; // OPCODE bits 3 a 6
        let aa = (flags_alto & 0b0000_0100) != 0; // AA bit 2
        let tc = (flags_alto & 0b0000_0010) != 0; // TC bit 1
        let rd = (flags_alto & 0b0000_0001) != 0; // RD bit 0
        let ra = (flags_bajo & 0b1000_0000) != 0; // RA bit 7
        let z = (flags_bajo >> 4) & 0b0000_0111; // Z bits 4 a 6
        let rcode = flags_bajo & 0b0000_1111; // RCODE bits 0 a 3

        // contadores de las secciones del paquete
        let qdcount = u16::from_be_bytes([bytes[4], bytes[5]]); // QDCOUNT preguntas
        let ancount = u16::from_be_bytes([bytes[6], bytes[7]]); // ANCOUNT respuestas
        let nscount = u16::from_be_bytes([bytes[8], bytes[9]]); // NSCOUNT autoridad
        let arcount = u16::from_be_bytes([bytes[10], bytes[11]]); // ARCOUNT adicionales

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

    // verifica si es una consulta DNS estandar
    pub fn es_consulta_estandar(&self) -> bool {
        !self.qr && self.opcode == 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parsea_encabezado_query_estandar() {
        // paquete de prueba de 12 bytes
        let bytes: [u8; 12] = [
            0x12, 0x34, // ID 0x1234
            0x01, 0x00, // RD 1 QR 0 OPCODE 0
            0x00, 0x01, // QDCOUNT 1
            0x00, 0x00, // ANCOUNT 0
            0x00, 0x00, // NSCOUNT 0
            0x00, 0x00, // ARCOUNT 0
        ];

        let header = EncabezadoDns::parsear(&bytes).unwrap();
        assert_eq!(header.id, 0x1234);
        assert!(!header.qr);
        assert_eq!(header.opcode, 0);
        assert!(header.es_consulta_estandar());
    }
}
