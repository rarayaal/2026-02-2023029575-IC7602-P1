use super::header::{DnsParseError, ErrorParseoDns, TAMANO_ENCABEZADO};

/// Sección Question de un mensaje DNS (RFC1035): nombre solicitado + tipo + clase.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Question {
    pub qname: String,
    pub nombre_host: String,
    pub qtype: u16,
    pub tipo_consulta: u16,
    pub qclass: u16,
    pub clase_consulta: u16,
    pub consumed: usize,
    pub offset_final: usize,
}

pub type PreguntaDns = Question;

impl Question {
    pub fn parse(body: &[u8]) -> Result<Self, DnsParseError> {
        let mut labels = Vec::new();
        let mut offset = 0;

        loop {
            let len_byte = *body.get(offset).ok_or(DnsParseError::TooShort)?;

            if len_byte == 0 {
                offset += 1;
                break;
            }

            if len_byte & 0b1100_0000 != 0 {
                return Err(DnsParseError::UnsupportedNamePointer);
            }

            let label_len = len_byte as usize;
            offset += 1;
            let label_bytes = body
                .get(offset..offset + label_len)
                .ok_or(DnsParseError::TooShort)?;
            let label = std::str::from_utf8(label_bytes)
                .map_err(|_| DnsParseError::InvalidQuestion)?
                .to_lowercase();

            labels.push(label);
            offset += label_len;
        }

        let qtype_qclass = body.get(offset..offset + 4).ok_or(DnsParseError::TooShort)?;
        let qtype = u16::from_be_bytes([qtype_qclass[0], qtype_qclass[1]]);
        let qclass = u16::from_be_bytes([qtype_qclass[2], qtype_qclass[3]]);
        offset += 4;

        let qname = labels.join(".");

        Ok(Self {
            qname: qname.clone(),
            nombre_host: qname,
            qtype,
            tipo_consulta: qtype,
            qclass,
            clase_consulta: qclass,
            consumed: offset,
            offset_final: offset,
        })
    }

    pub fn parsear(bytes: &[u8]) -> Result<Self, ErrorParseoDns> {
        if bytes.len() <= TAMANO_ENCABEZADO {
            return Err(ErrorParseoDns::DemasiadoCorto);
        }

        let pregunta = Self::parse(&bytes[TAMANO_ENCABEZADO..])?;
        Ok(Self {
            offset_final: TAMANO_ENCABEZADO + pregunta.consumed,
            ..pregunta
        })
    }
}
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn encode_question(labels: &[&str], qtype: u16, qclass: u16) -> Vec<u8> {
        let mut bytes = vec![0; TAMANO_ENCABEZADO];
        for label in labels {
            bytes.push(label.len() as u8);
            bytes.extend_from_slice(label.as_bytes());
        }
        bytes.push(0);
        bytes.extend_from_slice(&qtype.to_be_bytes());
        bytes.extend_from_slice(&qclass.to_be_bytes());
        bytes
    }

    #[test]
    fn parsea_qname_valido() {
        let bytes = encode_question(&["app", "company", "com"], 1, 1);

        let q = PreguntaDns::parsear(&bytes).unwrap();
        assert_eq!(q.nombre_host, "app.company.com");
        assert_eq!(q.qname, "app.company.com");
        assert_eq!(q.tipo_consulta, 1);
        assert_eq!(q.clase_consulta, 1);
        assert_eq!(q.offset_final, bytes.len());
    }

    #[test]
    fn parsea_body_desde_question() {
        let packet = encode_question(&["example", "com"], 28, 1);
        let q = Question::parse(&packet[TAMANO_ENCABEZADO..]).unwrap();
        assert_eq!(q.qname, "example.com");
        assert_eq!(q.qtype, 28);
        assert_eq!(q.consumed, packet.len() - TAMANO_ENCABEZADO);
    }

    #[test]
    fn rechaza_puntero_de_compresion() {
        let mut bytes = vec![0; TAMANO_ENCABEZADO];
        bytes.extend_from_slice(&[0xC0, 0x0C, 0x00, 0x01, 0x00, 0x01]);

        assert_eq!(
            PreguntaDns::parsear(&bytes),
            Err(ErrorParseoDns::PunteroNombreNoSoportado)
        );
    }

    #[test]
    fn rechaza_paquete_truncado() {
        let mut bytes = vec![0; TAMANO_ENCABEZADO];
        bytes.extend_from_slice(&[0x07, b'e', b'x']);

        assert_eq!(
            PreguntaDns::parsear(&bytes),
            Err(ErrorParseoDns::DemasiadoCorto)
        );
    }
    }
}
