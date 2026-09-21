use super::header::DnsParseError;

/// Sección Question de un mensaje DNS (RFC1035): nombre solicitado + tipo + clase.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Question {
    /// Hostname en formato legible, reconstruido a partir de los labels.
    pub qname: String,
    pub qtype: u16,
    pub qclass: u16,
    /// Cuántos bytes ocupó esta Question.
    pub consumed: usize,
}

impl Question {
    /// Parsea la primera sección Question a partir de los bytes posteriores al header
    /// (`DnsMessage::body()`).
    ///
    /// Un nombre DNS es una secuencia de labels `[longitud][bytes...]` terminada en un byte de
    /// longitud 0 (root). No se soportan punteros de compresión aquí: en la Question de un query
    /// entrante no tendría sentido que apunten hacia atrás (caerían dentro del header), así que se
    /// devuelve error en vez de intentar resolverlos.
    pub fn parse(body: &[u8]) -> Result<Self, DnsParseError> {
        let mut labels = Vec::new();
        let mut offset = 0;

        loop {
            let len_byte = *body.get(offset).ok_or(DnsParseError::TooShort)?;

            if len_byte == 0 {
                offset += 1;
                break;
            }

            // 0xC0 en los dos bits altos = puntero de compresión (o forma reservada); no soportado.
            if len_byte & 0b1100_0000 != 0 {
                return Err(DnsParseError::UnsupportedNamePointer);
            }

            let label_len = len_byte as usize;
            offset += 1;
            let label_bytes = body
                .get(offset..offset + label_len)
                .ok_or(DnsParseError::TooShort)?;

            // Suficiente para hostnames típicos (ASCII); DNS internacionalizado usa Punycode ASCII.
            labels.push(String::from_utf8_lossy(label_bytes).to_string());
            offset += label_len;
        }

        let qtype_qclass = body.get(offset..offset + 4).ok_or(DnsParseError::TooShort)?;
        let qtype = u16::from_be_bytes([qtype_qclass[0], qtype_qclass[1]]);
        let qclass = u16::from_be_bytes([qtype_qclass[2], qtype_qclass[3]]);
        offset += 4;

        Ok(Self {
            qname: labels.join("."),
            qtype,
            qclass,
            consumed: offset,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Codifica una Question a mano: labels con su byte de longitud + terminador 0 + QTYPE/QCLASS.
    fn encode_question(labels: &[&str], qtype: u16, qclass: u16) -> Vec<u8> {
        let mut bytes = Vec::new();
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
    fn parsea_hostname_simple() {
        let body = encode_question(&["example", "com"], 1, 1);
        let q = Question::parse(&body).unwrap();
        assert_eq!(q.qname, "example.com");
        assert_eq!(q.qtype, 1); // A
        assert_eq!(q.qclass, 1); // IN
        assert_eq!(q.consumed, body.len());
    }

    #[test]
    fn parsea_hostname_con_varios_subdominios() {
        let body = encode_question(&["www", "sub", "example", "com"], 28, 1);
        let q = Question::parse(&body).unwrap();
        assert_eq!(q.qname, "www.sub.example.com");
        assert_eq!(q.qtype, 28); // AAAA
    }

    #[test]
    fn rechaza_puntero_de_compresion() {
        let body = [0xC0, 0x0C, 0x00, 0x01, 0x00, 0x01];
        assert_eq!(
            Question::parse(&body),
            Err(DnsParseError::UnsupportedNamePointer)
        );
    }

    #[test]
    fn rechaza_paquete_truncado_en_medio_de_un_label() {
        let body = [0x07, b'e', b'x']; // dice longitud 7 pero solo hay 2 bytes disponibles
        assert_eq!(Question::parse(&body), Err(DnsParseError::TooShort));
    }

    #[test]
    fn rechaza_paquete_sin_qtype_ni_qclass() {
        let body = [0x00]; // nombre raíz (root) pero sin los 4 bytes de QTYPE/QCLASS
        assert_eq!(Question::parse(&body), Err(DnsParseError::TooShort));
    }
}
