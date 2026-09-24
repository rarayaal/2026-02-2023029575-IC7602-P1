package dnsapi.ipcountry;

/**
 * Conversiones entre una IPv4 escrita con puntos y su valor numerico.
 *
 * <p>Una IPv4 son cuatro bytes. Escrita como {@code 190.113.4.20} es comoda para una persona, pero
 * para preguntar "en que rango cae" conviene verla como el numero que forman esos cuatro bytes
 * juntos: asi la comparacion es una resta y no un analisis de texto. La tabla de IP-to-Country
 * guarda los extremos de cada rango en esa forma numerica.</p>
 */
public final class Ipv4 {

    private static final long MAX = 0xFFFFFFFFL;

    private Ipv4() {
    }

    /** Indica si el texto es una IPv4 valida: cuatro numeros de 0 a 255 separados por puntos. */
    public static boolean isValid(String ip) {
        if (ip == null) {
            return false;
        }
        String[] octets = ip.trim().split("\\.", -1);
        if (octets.length != 4) {
            return false;
        }
        for (String octet : octets) {
            if (!octet.matches("\\d{1,3}") || Integer.parseInt(octet) > 255) {
                return false;
            }
        }
        return true;
    }

    /** Convierte {@code 190.113.4.20} en el numero 3195078676. */
    public static long toNumber(String ip) {
        if (!isValid(ip)) {
            throw new IllegalArgumentException("IPv4 invalida: " + ip);
        }
        String[] octets = ip.trim().split("\\.");
        long value = 0;
        for (String octet : octets) {
            // Cada octeto ocupa 8 bits: se corre lo acumulado y se le pega el siguiente.
            value = (value << 8) | Integer.parseInt(octet);
        }
        return value;
    }

    /** Operacion inversa de {@link #toNumber}. */
    public static String toDotted(long value) {
        return ((value >> 24) & 0xFF) + "." + ((value >> 16) & 0xFF) + "."
                + ((value >> 8) & 0xFF) + "." + (value & 0xFF);
    }

    /**
     * Expande una notacion CIDR como {@code 190.113.0.0/16} en su primera y su ultima IP.
     *
     * <p>El numero despues de la barra dice cuantos bits del inicio son fijos: los que quedan libres
     * forman el rango. Con /16 quedan 16 bits libres, o sea 65536 direcciones.</p>
     *
     * @return un arreglo de dos posiciones: inicio y fin del rango
     */
    public static long[] fromCidr(String cidr) {
        String[] parts = cidr == null ? new String[0] : cidr.trim().split("/");
        if (parts.length != 2 || !isValid(parts[0]) || !parts[1].matches("\\d{1,2}")) {
            throw new IllegalArgumentException("Notacion CIDR invalida: " + cidr);
        }
        int prefix = Integer.parseInt(parts[1]);
        if (prefix > 32) {
            throw new IllegalArgumentException("El prefijo de un CIDR va de 0 a 32: " + cidr);
        }

        long mask = prefix == 0 ? 0 : (MAX << (32 - prefix)) & MAX;
        long start = toNumber(parts[0]) & mask;
        long end = start | (~mask & MAX);
        return new long[] {start, end};
    }
}
