package dnsapi.http;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import dnsapi.config.ApiConfig;
import dnsapi.records.InMemoryDnsRecordRepository;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class ApiServerTest {

    private static final int CONCURRENT_REQUESTS = 50;

    private static ApiServer server;
    private static HttpClient client;
    private static String baseUrl;

    @BeforeAll
    static void startServer() {
        // El puerto 0 hace que el sistema operativo asigne uno libre, para no chocar con nada.
        server = new ApiServer(new ApiConfig("127.0.0.1", 0, 32), InMemoryDnsRecordRepository.withSampleData());
        server.start();

        client = HttpClient.newHttpClient();
        baseUrl = "http://127.0.0.1:" + server.port();
    }

    @AfterAll
    static void stopServer() {
        server.stop();
    }

    private static HttpResponse<String> get(String path) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(baseUrl + path)).GET().build();
        return client.send(request, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    @DisplayName("El endpoint de salud responde 200 con JSON")
    void healthRespondsOk() throws Exception {
        HttpResponse<String> response = get("/api/health");

        assertEquals(200, response.statusCode());
        assertTrue(response.body().contains("\"status\":\"ok\""), response.body());
    }

    @Test
    @DisplayName("Una ruta desconocida responde 404 con el cuerpo de error del API")
    void unknownRouteRespondsNotFound() throws Exception {
        HttpResponse<String> response = get("/api/ruta-que-no-existe");

        assertEquals(404, response.statusCode());
        assertTrue(response.body().contains("\"error\":\"not_found\""), response.body());
    }

    @Test
    @DisplayName("Atiende multiples peticiones concurrentes sin errores")
    void handlesConcurrentRequests() throws Exception {
        List<Callable<Integer>> calls = IntStream.range(0, CONCURRENT_REQUESTS)
                .mapToObj(i -> (Callable<Integer>) () -> get("/api/health").statusCode())
                .toList();

        try (ExecutorService pool = Executors.newFixedThreadPool(CONCURRENT_REQUESTS)) {
            for (Future<Integer> result : pool.invokeAll(calls)) {
                assertEquals(200, result.get());
            }
        }
    }
}
