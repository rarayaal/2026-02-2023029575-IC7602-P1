use std::net::IpAddr;

use super::message::DnsMessage;
use super::question::Question;

const CLASS_IN: u16 = 1;
const TYPE_A: u16 = 1;
const TYPE_AAAA: u16 = 28;

/// Puntero de compresión (RFC1035) hacia el nombre de la Question, que siempre arranca en
/// el byte 12 (justo después del header). Generarlo nosotros es válido y evita repetir el
/// hostname completo en cada Answer; distinto de parsear punteros entrantes, que sí rechazamos.
const QUESTION_NAME_POINTER: [u8; 2] = [0xC0, 0x0C];

/// Un registro ya resuelto (IP + TTL), listo para convertirse en un Answer RR.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ResolvedRecord {
    pub ip: IpAddr,
    pub ttl: u32,
}

/// Arma una respuesta DNS completa (header + Question + Answers) conforme a RFC1035/RFC2929.
///
/// `query` aporta el ID y las flags a reflejar (RD, OPCODE); la Question se echoa tal cual llegó
pub fn build_response(query: &DnsMessage, question: &Question, records: &[ResolvedRecord]) -> Vec<u8> {
    let mut out = Vec::new();

    // Header (12 bytes)
    out.extend_from_slice(&query.header.id.to_be_bytes());

    // QR=1 (respuesta).
    let mut flags_hi: u8 = 0b1000_0000;
    flags_hi |= (query.header.opcode & 0b0000_1111) << 3;
    flags_hi |= 0b0000_0100; // AA
    if query.header.rd {
        flags_hi |= 0b0000_0001;
    }
    out.push(flags_hi);

    // RA=1: el Interceptor sí resuelve recursivamente (delega al DNS API).
    out.push(0b1000_0000);

    out.extend_from_slice(&1u16.to_be_bytes()); // QDCOUNT: se echoa 1 Question
    out.extend_from_slice(&(records.len() as u16).to_be_bytes()); // ANCOUNT
    out.extend_from_slice(&0u16.to_be_bytes()); // NSCOUNT
    out.extend_from_slice(&0u16.to_be_bytes()); // ARCOUNT

    // Question
    out.extend_from_slice(&query.body()[..question.consumed]);

    // Answers 
    for record in records {
        out.extend_from_slice(&QUESTION_NAME_POINTER);

        let (rtype, rdata): (u16, Vec<u8>) = match record.ip {
            IpAddr::V4(v4) => (TYPE_A, v4.octets().to_vec()),
            IpAddr::V6(v6) => (TYPE_AAAA, v6.octets().to_vec()),
        };

        out.extend_from_slice(&rtype.to_be_bytes());
        out.extend_from_slice(&CLASS_IN.to_be_bytes());
        out.extend_from_slice(&record.ttl.to_be_bytes());
        out.extend_from_slice(&(rdata.len() as u16).to_be_bytes());
        out.extend_from_slice(&rdata);
    }

    out
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dns::header::HEADER_SIZE;

    fn sample_query() -> (DnsMessage, Question) {
        let mut raw = vec![0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        raw.extend_from_slice(&[
            0x07, b'e', b'x', b'a', b'm', b'p', b'l', b'e', 0x03, b'c', b'o', b'm', 0x00, 0x00,
            0x01, 0x00, 0x01,
        ]);
        let message = DnsMessage::parse(raw).unwrap();
        let question = message.question().unwrap();
        (message, question)
    }

    #[test]
    fn arma_respuesta_con_un_registro_a() {
        let (query, question) = sample_query();
        let records = [ResolvedRecord {
            ip: "93.184.216.34".parse().unwrap(),
            ttl: 300,
        }];

        let response = build_response(&query, &question, &records);

        // Header: mismo ID, QR=1, ANCOUNT=1.
        let header = crate::dns::header::DnsHeader::parse(&response).unwrap();
        assert_eq!(header.id, 0x1234);
        assert!(header.qr);
        assert!(header.aa);
        assert!(header.rd);
        assert!(header.ra);
        assert_eq!(header.qdcount, 1);
        assert_eq!(header.ancount, 1);

        // Question echoed tal cual.
        let question_end = HEADER_SIZE + question.consumed;
        assert_eq!(
            &response[HEADER_SIZE..question_end],
            &query.body()[..question.consumed]
        );

        // Answer: puntero de compresión + TYPE A + CLASS IN + TTL + RDLENGTH=4 + RDATA.
        let answer = &response[question_end..];
        assert_eq!(&answer[0..2], &[0xC0, 0x0C]);
        assert_eq!(u16::from_be_bytes([answer[2], answer[3]]), TYPE_A);
        assert_eq!(u16::from_be_bytes([answer[4], answer[5]]), CLASS_IN);
        assert_eq!(u32::from_be_bytes([answer[6], answer[7], answer[8], answer[9]]), 300);
        assert_eq!(u16::from_be_bytes([answer[10], answer[11]]), 4);
        assert_eq!(&answer[12..16], &[93, 184, 216, 34]);
        assert_eq!(answer.len(), 16);
    }

    #[test]
    fn arma_respuesta_con_multiples_registros() {
        let (query, question) = sample_query();
        let records = [
            ResolvedRecord { ip: "10.0.0.1".parse().unwrap(), ttl: 60 },
            ResolvedRecord { ip: "10.0.0.2".parse().unwrap(), ttl: 60 },
        ];

        let response = build_response(&query, &question, &records);
        let header = crate::dns::header::DnsHeader::parse(&response).unwrap();
        assert_eq!(header.ancount, 2);
    }

    #[test]
    fn serializa_registro_ipv6_como_aaaa() {
        let (query, question) = sample_query();
        let records = [ResolvedRecord {
            ip: "::1".parse().unwrap(),
            ttl: 60,
        }];

        let response = build_response(&query, &question, &records);
        let question_end = HEADER_SIZE + question.consumed;
        let answer = &response[question_end..];
        assert_eq!(u16::from_be_bytes([answer[2], answer[3]]), TYPE_AAAA);
        assert_eq!(u16::from_be_bytes([answer[10], answer[11]]), 16); // RDLENGTH IPv6
    }
}
