package dnsapi.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dnsapi.config.ApiConfig;
import dnsapi.records.InMemoryDnsRecordRepository;
import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** Prueba el endpoint /api/exists de punta a punta, por HTTP real. */
class ExistsControllerTest {

    private static ApiServer server;
    private static HttpClient client;
    private static String baseUrl;

    @BeforeAll
    static void startServer() {
        server = new ApiServer(
                new ApiConfig("127.0.0.1", 0, 16),
                InMemoryDnsRecordRepository.withSampleData());
        server.start();

        client = HttpClient.newHttpClient();
        baseUrl = "http://127.0.0.1:" + server.port();
    }

    @AfterAll
    static void stopServer() {
        server.stop();
    }

    private static HttpResponse<String> exists(String hostname) throws IOException, InterruptedException {
        String url = baseUrl + ExistsController.PATH;
        if (hostname != null) {
            url += "?hostname=" + URLEncoder.encode(hostname, StandardCharsets.UTF_8);
        }
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).GET().build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    @DisplayName("Un dominio registrado responde exists true con su tipo")
    void existingDomain() throws Exception {
        HttpResponse<String> response = exists("api.company.com");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"exists\":true"), response.body());
        assertTrue(response.body().contains("\"type\":\"single\""), response.body());
        assertTrue(response.body().contains("\"hostname\":\"api.company.com\""), response.body());
    }

    @Test
    @DisplayName("El tipo round-trip viaja con guion, como espera el Interceptor")
    void roundTripKeepsHyphen() throws Exception {
        HttpResponse<String> response = exists("edge.company.com");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"type\":\"round-trip\""), response.body());
    }

    @Test
    @DisplayName("Un dominio sin registro responde 200 con exists false y type null")
    void unknownDomain() throws Exception {
        HttpResponse<String> response = exists("noexiste.company.com");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"exists\":false"), response.body());
        assertTrue(response.body().contains("\"type\":null"), response.body());
    }

    @Test
    @DisplayName("Encuentra el dominio aunque venga en mayusculas y con punto final")
    void normalizesHostname() throws Exception {
        HttpResponse<String> response = exists("API.Company.COM.");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"exists\":true"), response.body());
        assertTrue(response.body().contains("\"hostname\":\"api.company.com\""), response.body());
    }

    @Test
    @DisplayName("Sin el parametro hostname responde 400")
    void missingHostname() throws Exception {
        HttpResponse<String> response = exists(null);

        assertEquals(400, response.statusCode());
        assertTrue(response.body().contains("\"error\":\"missing_hostname\""), response.body());
    }

    @Test
    @DisplayName("Con el parametro hostname vacio responde 400")
    void blankHostname() throws Exception {
        HttpResponse<String> response = exists("   ");

        assertEquals(400, response.statusCode());
        assertTrue(response.body().contains("\"error\":\"missing_hostname\""), response.body());
    }
}
