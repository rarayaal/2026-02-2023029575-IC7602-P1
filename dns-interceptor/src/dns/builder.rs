// modulo para armar la respuesta binaria DNS de tipo A IPv4 segun RFC1035

use std::net::Ipv4Addr;

// posibles errores al armar el paquete DNS
#[derive(Debug, PartialEq, Eq)]
pub enum ErrorConstruccionDns {
    // la consulta tiene menos bytes de los necesarios
    ConsultaDemasiadoCorta,
    // la seccion de pregunta viene mal formateada
    PreguntaInvalida,
}

// arma un paquete binario de respuesta DNS para el cliente
pub fn construir_respuesta_dns(
    buffer_consulta: &[u8],
    ip_a_retornar: Ipv4Addr,
    ttl: u32,
) -> Result<Vec<u8>, ErrorConstruccionDns> {
    if buffer_consulta.len() < 12 {
        return Err(ErrorConstruccionDns::ConsultaDemasiadoCorta);
    }

    // preparamos el vector con espacio para el paquete y la respuesta
    let mut respuesta = Vec::with_capacity(buffer_consulta.len() + 16);

    // copia el mismo ID de transaccion del cliente
    respuesta.extend_from_slice(&buffer_consulta[0..2]);

    // arma los flags de control para la respuesta
    let rd = buffer_consulta[2] & 0x01; // conserva el flag RD del cliente
    let byte2 = 0x84 | rd; // QR en uno autoritativo en uno
    let byte3 = 0x80; // RA en uno recursion disponible
    respuesta.push(byte2);
    respuesta.push(byte3);

    // contadores del paquete DNS
    respuesta.extend_from_slice(&[0x00, 0x01]); // QDCOUNT una pregunta
    respuesta.extend_from_slice(&[0x00, 0x01]); // ANCOUNT una respuesta
    respuesta.extend_from_slice(&[0x00, 0x00]); // NSCOUNT cero autoridad
    respuesta.extend_from_slice(&[0x00, 0x00]); // ARCOUNT cero adicionales

    // copia la seccion de la pregunta original
    let mut cursor = 12;
    while cursor < buffer_consulta.len() {
        let longitud = buffer_consulta[cursor] as usize;
        if longitud == 0 {
            cursor += 1;
            break;
        }
        cursor += 1 + longitud;
    }

    // incluye los cuatro bytes de QTYPE y QCLASS
    let fin_pregunta = cursor + 4;
    if fin_pregunta > buffer_consulta.len() {
        return Err(ErrorConstruccionDns::PreguntaInvalida);
    }

    respuesta.extend_from_slice(&buffer_consulta[12..fin_pregunta]);

    // arma la seccion de respuesta con los datos de la IP
    respuesta.extend_from_slice(&[0xC0, 0x0C]); // puntero de compresion al byte 12
    respuesta.extend_from_slice(&[0x00, 0x01]); // TYPE registro tipo A
    respuesta.extend_from_slice(&[0x00, 0x01]); // CLASS red de internet
    respuesta.extend_from_slice(&ttl.to_be_bytes()); // tiempo de vida TTL de cuatro bytes
    respuesta.extend_from_slice(&[0x00, 0x04]); // RDLENGTH largo de la IP de cuatro bytes
    respuesta.extend_from_slice(&ip_a_retornar.octets()); // los cuatro numeros de la IP IPv4

    Ok(respuesta)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn construye_respuesta_binaria_valida() {
        // paquete de consulta para probar
        let consulta_cruda = vec![
            0x1a, 0x2b, // ID
            0x01, 0x00, // flags
            0x00, 0x01, // QDCOUNT uno
            0x00, 0x00, // ANCOUNT cero
            0x00, 0x00, // NSCOUNT cero
            0x00, 0x00, // ARCOUNT cero
            0x04, b't', b'e', b's', b't', 0x03, b'c', b'o', b'm', 0x00, 0x00, 0x01, 0x00, 0x01,
        ];

        let ip_objetivo = Ipv4Addr::new(192, 168, 1, 100);
        let res = construir_respuesta_dns(&consulta_cruda, ip_objetivo, 300).unwrap();

        // revisa que el ID sea igual
        assert_eq!(&res[0..2], &[0x1a, 0x2b]);
        // revisa los flags
        assert_eq!(res[2], 0x85);
        // revisa que la IP quede al final
        assert_eq!(&res[res.len() - 4..], &[192, 168, 1, 100]);
    }
}
