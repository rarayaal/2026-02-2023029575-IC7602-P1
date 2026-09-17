// modulo para leer la seccion de pregunta de un paquete DNS segun RFC1035

use super::header::{ErrorParseoDns, TAMANO_ENCABEZADO};

// guarda los datos de la pregunta DNS
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PreguntaDns {
    // nombre del host consultado
    pub nombre_host: String,
    // tipo de consulta uno para IPv4 o 28 para IPv6
    pub tipo_consulta: u16,
    // clase de la consulta uno para internet
    pub clase_consulta: u16,
    // posicion en bytes donde termina la pregunta
    pub offset_final: usize,
}

impl PreguntaDns {
    // lee la pregunta del paquete empezando despues del encabezado
    pub fn parsear(bytes: &[u8]) -> Result<Self, ErrorParseoDns> {
        // revisa que tenga mas de 12 bytes
        if bytes.len() <= TAMANO_ENCABEZADO {
            return Err(ErrorParseoDns::DemasiadoCorto);
        }

        let mut cursor = TAMANO_ENCABEZADO;
        let mut etiquetas = Vec::new();

        // bucle para sacar cada parte del nombre
        loop {
            if cursor >= bytes.len() {
                return Err(ErrorParseoDns::PreguntaInvalida);
            }

            // saca el largo de la siguiente parte
            let longitud = bytes[cursor] as usize;
            if longitud == 0 {
                // byte cero indica el final del nombre
                cursor += 1;
                break;
            }

            // valida que no tenga punteros raros ni se salga del buffer
            if longitud >= 192 || cursor + 1 + longitud > bytes.len() {
                return Err(ErrorParseoDns::PreguntaInvalida);
            }

            // extrae el texto de la etiqueta
            let bytes_etiqueta = &bytes[cursor + 1..cursor + 1 + longitud];
            let texto_etiqueta = std::str::from_utf8(bytes_etiqueta)
                .map_err(|_| ErrorParseoDns::PreguntaInvalida)?;

            // guarda la palabra en minusculas
            etiquetas.push(texto_etiqueta.to_lowercase());
            cursor += 1 + longitud;
        }

        // lee los ultimos cuatro bytes con el QTYPE y QCLASS
        if cursor + 4 > bytes.len() {
            return Err(ErrorParseoDns::PreguntaInvalida);
        }

        let tipo_consulta = u16::from_be_bytes([bytes[cursor], bytes[cursor + 1]]);
        let clase_consulta = u16::from_be_bytes([bytes[cursor + 2], bytes[cursor + 3]]);
        let offset_final = cursor + 4;

        // une las palabras con puntos para armar el FQDN
        let nombre_host = etiquetas.join(".");

        Ok(Self {
            nombre_host,
            tipo_consulta,
            clase_consulta,
            offset_final,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parsea_qname_valido() {
        // simulacion binaria de una pregunta DNS
        let bytes = vec![
            0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // header de 12 bytes
            0x03, b'a', b'p', b'p', // tres bytes app
            0x07, b'c', b'o', b'm', b'p', b'a', b'n', b'y', // siete bytes company
            0x03, b'c', b'o', b'm', // tres bytes com
            0x00,       // fin del nombre
            0x00, 0x01, // tipo A
            0x00, 0x01, // clase IN
        ];

        let q = PreguntaDns::parsear(&bytes).unwrap();
        assert_eq!(q.nombre_host, "app.company.com");
        assert_eq!(q.tipo_consulta, 1);
        assert_eq!(q.clase_consulta, 1);
    }
}
