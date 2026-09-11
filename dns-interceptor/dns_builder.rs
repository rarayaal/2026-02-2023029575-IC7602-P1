use std::net::Ipv4Addr;

#[derive(Debug)]
pub enum DnsError {
    QueryTooShort,
    MalformedQuestion,
}

/// Respuesta DNS estandar tipo A para una consulta entrante
pub fn build_dns_response(query_buffer: &[u8], ip_to_return: Ipv4Addr, ttl: u32) -> Result<Vec<u8>, DnsError> {


    // el paquete debe tener 12 bytes de header 
    if query_buffer.len() < 12 {
        return Err(DnsError::QueryTooShort);
    }

    let mut response = Vec::with_capacity(query_buffer.len() + 16);

    // los primeros 2 bytes son el ID 
    response.extend_from_slice(&query_buffer[0..2]);

    // Flags QR=1 para responder, AA=1 para autoritativo, RD=1 si el cliente lo pidió, RA=1 para recursion disponible, RCODE=0 para sin error
    let rd = query_buffer[2] & 0x01;
    let byte2 = 0x84 | rd; // 1000 0100 QR=1, Opcode=0, AA=1, TC=0, RD
    let byte3 = 0x80;      // 1000 0000 RA=1, Z=0, RCODE=0
    response.push(byte2);
    response.push(byte3);

    // QDCOUNT 1 replicar la pregunta original
    response.extend_from_slice(&[0x00, 0x01]);
    // ANCOUNT 1 retornar 1 registro en la respuesta
    response.extend_from_slice(&[0x00, 0x01]);
    // NSCOUNT 0
    response.extend_from_slice(&[0x00, 0x00]);
    // ARCOUNT 0
    response.extend_from_slice(&[0x00, 0x00]);

    // copia la seccion de preguntas completa
    let mut cursor = 12;
    while cursor < query_buffer.len() {
        let length = query_buffer[cursor] as usize;
        if length == 0 {
            cursor += 1; // fin del QNAME
            break;
        }
        cursor += 1 + length;
    }

    // Debe incluir los campos QTYPE (2 bytes) y QCLASS (2 bytes)
    // se deben cambiar los campos QTYPE 2 bytes y QCLASS 2 bytes 
    let question_end = cursor + 4;
    if question_end > query_buffer.len() {
        return Err(DnsError::MalformedQuestion);
    }

    // replica de la seccion de preguntas completa
    response.extend_from_slice(&query_buffer[12..question_end]);

    //construir la seccion de respuestas 
    // comprime de puntero al nombre que apunta al offset 12 donde empieza el QNAME
    response.extend_from_slice(&[0xC0, 0x0C]);

    //  0x0001 A record
    response.extend_from_slice(&[0x00, 0x01]);
    // 0x0001 IN - Internet
    response.extend_from_slice(&[0x00, 0x01]);
    // 4 bytes
    response.extend_from_slice(&ttl.to_be_bytes());
    // 4 bytes longitud de IPv4
    response.extend_from_slice(&[0x00, 0x04]);
    // los 4 octetos de la IP
    response.extend_from_slice(&ip_to_return.octets());

    Ok(response)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::net::Ipv4Addr;

    #[test]
    fn test_build_dns_response() {
        // paquete del dns de consulta para prueba
        let raw_query = vec![
            0x1a, 0x2b, // ID
            0x01, 0x00, // Flags 
            0x00, 0x01, // QDCOUNT = 1
            0x00, 0x00, // ANCOUNT = 0
            0x00, 0x00, // NSCOUNT = 0
            0x00, 0x00, // ARCOUNT = 0

            0x04, b't', b'e', b's', b't',
            0x03, b'c', b'o', b'm',
            0x00,       // EON
            0x00, 0x01, // QTYPE = A
            0x00, 0x01  // QCLASS = IN
        ];

        let target_ip = Ipv4Addr::new(192, 168, 1, 100);
        let result = build_dns_response(&raw_query, target_ip, 300);

        assert!(result.is_ok());
        let res = result.unwrap();

        // Validar transacción de identificador
        assert_eq!(&res[0..2], &[0x1a, 0x2b]);
        // Verificar Flags de respuesta
        assert_eq!(res[2], 0x85);
        assert_eq!(res[3], 0x80);
        // Verificar ANCOUNT = 1
        assert_eq!(&res[6..8], &[0x00, 0x01]);
        // Verificar IP de los bytes
        assert_eq!(&res[res.len() - 4..], &[192, 168, 1, 100]);
    }
}