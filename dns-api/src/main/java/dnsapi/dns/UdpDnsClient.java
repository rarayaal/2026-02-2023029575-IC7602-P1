package dnsapi.dns;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.Arrays;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cliente UDP contra un servidor DNS remoto (T-19).
 *
 * <p>Reenvia el paquete DNS tal como llego, sin interpretarlo: el API no necesita entender la
 * consulta, solo pasarla al servidor remoto y devolver lo que conteste. Por eso el paquete viaja
 * como un arreglo de bytes de punta a punta.</p>
 *
 * <p>La direccion del servidor remoto viene de la configuracion, nunca quemada en el codigo.</p>
 */
public final class UdpDnsClient {

    private static final Logger log = LoggerFactory.getLogger(UdpDnsClient.class);

    /**
     * Tamano del buffer de recepcion. El RFC1035 limita un mensaje DNS sobre UDP a 512 bytes, pero
     * con la extension EDNS0 un servidor puede responder mas, asi que se reserva de mas para no
     * truncar la respuesta.
     */
    private static final int MAX_RESPONSE_SIZE = 4096;

    private final InetAddress serverAddress;
    private final int serverPort;
    private final int timeoutMillis;

    public UdpDnsClient(String serverIp, int serverPort, int timeoutMillis) {
        try {
            this.serverAddress = InetAddress.getByName(serverIp);
        } catch (UnknownHostException e) {
            throw new IllegalArgumentException("Direccion del servidor DNS invalida: " + serverIp, e);
        }
        this.serverPort = serverPort;
        this.timeoutMillis = timeoutMillis;
    }

    /**
     * Envia un paquete DNS al servidor remoto y devuelve su respuesta.
     *
     * <p>Se abre un socket por consulta y se cierra al terminar. Podria reutilizarse uno solo, pero
     * entonces dos peticiones simultaneas escribirian en el mismo socket y cada una podria leer la
     * respuesta de la otra: UDP no tiene conexiones que las separen. Un socket por consulta le da a
     * cada una su propio puerto de origen, que es justo lo que mantiene las respuestas separadas.</p>
     *
     * @param query paquete DNS crudo, tal como lo mando el cliente original
     * @return la respuesta cruda del servidor remoto
     * @throws DnsResolutionException si el servidor no responde a tiempo o falla la red
     */
    public byte[] resolve(byte[] query) {
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(timeoutMillis);

            socket.send(new DatagramPacket(query, query.length, serverAddress, serverPort));

            byte[] buffer = new byte[MAX_RESPONSE_SIZE];
            DatagramPacket response = new DatagramPacket(buffer, buffer.length);
            socket.receive(response);

            log.debug("El servidor DNS {} respondio {} bytes", serverAddress.getHostAddress(), response.getLength());

            // El buffer mide 4096, pero la respuesta casi siempre es mas corta: se recorta para no
            // devolver los bytes vacios del final.
            return Arrays.copyOf(response.getData(), response.getLength());

        } catch (SocketTimeoutException e) {
            throw new DnsResolutionException(
                    "El servidor DNS " + serverAddress.getHostAddress() + " no respondio en "
                            + timeoutMillis + " ms", e);
        } catch (IOException e) {
            throw new DnsResolutionException(
                    "Error de red consultando al servidor DNS " + serverAddress.getHostAddress(), e);
        }
    }

    /** Descripcion del servidor remoto, para los logs de arranque. */
    public String target() {
        return serverAddress.getHostAddress() + ":" + serverPort;
    }
}
