#include "http_checker.h"
#include <curl/curl.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Tabla de caracteres Base64 segun RFC 4648 */
static const char b64_table[] =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/* Codifica datos binarios o texto a Base64 */
char *base64_encode(const unsigned char *data, size_t input_length) {
  size_t output_length = 4 * ((input_length + 2) / 3);
  char *encoded_data = (char *)malloc(output_length + 1);
  if (!encoded_data) {
    return NULL;
  }

  size_t i = 0;
  size_t j = 0;
  while (i < input_length) {
    uint32_t octet_a = i < input_length ? data[i++] : 0;
    uint32_t octet_b = i < input_length ? data[i++] : 0;
    uint32_t octet_c = i < input_length ? data[i++] : 0;

    uint32_t triple = (octet_a << 16) + (octet_b << 8) + octet_c;

    encoded_data[j++] = b64_table[(triple >> 18) & 0x3F];
    encoded_data[j++] = b64_table[(triple >> 12) & 0x3F];
    encoded_data[j++] =
        (i > input_length + 1) ? '=' : b64_table[(triple >> 6) & 0x3F];
    encoded_data[j++] = (i > input_length) ? '=' : b64_table[triple & 0x3F];
  }

  encoded_data[output_length] = '\0';
  return encoded_data;
}

/* Callback para descartar el cuerpo de la respuesta HTTP */
static size_t discard_body_callback(void *contents, size_t size, size_t nmemb,
                                    void *userp) {
  (void)contents;
  (void)userp;
  return size * nmemb;
}

/* Verifica si un codigo HTTP coincide con la lista esperada */
static bool is_status_expected(long status, const int *expected, size_t count) {
  if (!expected || count == 0) {
    return status == 200;
  }

  for (size_t i = 0; i < count; i++) {
    if (status == (long)expected[i]) {
      return true;
    }
  }
  return false;
}

/* Ejecuta un intento individual de peticion HTTP */
static HttpCheckResult
http_check_single_attempt(const char *ip_address, int port, const char *path,
                          const int *expected_statuses,
                          size_t expected_statuses_count, const char *user,
                          const char *pass, int timeout_ms) {
  HttpCheckResult result = {.is_healthy = false,
                            .http_status = 0,
                            .rtt_ms = 0.0,
                            .attempts_made = 1,
                            .error_message = {0}};

  CURL *curl = curl_easy_init();
  if (!curl) {
    snprintf(result.error_message, sizeof(result.error_message),
             "Fallo al inicializar curl");
    return result;
  }

  /* Construccion de URL de destino */
  char url[512];
  const char *target_path = (path && path[0] == '/') ? path : "/";
  snprintf(url, sizeof(url), "http://%s:%d%s", ip_address, port, target_path);

  curl_easy_setopt(curl, CURLOPT_URL, url);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT_MS, (long)timeout_ms);
  curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT_MS, (long)timeout_ms);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, discard_body_callback);
  curl_easy_setopt(curl, CURLOPT_NOSIGNAL, 1L);
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 0L);

  /* Configuracion de Basic Auth */
  struct curl_slist *headers = NULL;
  if (user && pass && strlen(user) > 0) {
    char credentials[256];
    snprintf(credentials, sizeof(credentials), "%s:%s", user, pass);

    char *b64 =
        base64_encode((const unsigned char *)credentials, strlen(credentials));
    if (b64) {
      char auth_header[384];
      snprintf(auth_header, sizeof(auth_header), "Authorization: Basic %s",
               b64);
      headers = curl_slist_append(headers, auth_header);
      curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
      free(b64);
    }
  }

  CURLcode res = curl_easy_perform(curl);

  if (res == CURLE_OK) {
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &result.http_status);
    double total_time_sec = 0.0;
    curl_easy_getinfo(curl, CURLINFO_TOTAL_TIME, &total_time_sec);
    result.rtt_ms = total_time_sec * 1000.0;

    if (is_status_expected(result.http_status, expected_statuses,
                           expected_statuses_count)) {
      result.is_healthy = true;
    } else {
      result.is_healthy = false;
      snprintf(result.error_message, sizeof(result.error_message),
               "Codigo HTTP %ld no coincide con los esperados",
               result.http_status);
    }
  } else {
    result.is_healthy = false;
    snprintf(result.error_message, sizeof(result.error_message),
             "Fallo HTTP: %s", curl_easy_strerror(res));
  }

  if (headers) {
    curl_slist_free_all(headers);
  }
  curl_easy_cleanup(curl);

  return result;
}

/* Orquesta el ciclo de comprobacion con reintentos */
HttpCheckResult http_check_perform(const char *ip_address, int port,
                                   const char *path,
                                   const int *expected_statuses,
                                   size_t expected_statuses_count,
                                   const char *user, const char *pass,
                                   int timeout_ms, int retries) {
  HttpCheckResult result = {.is_healthy = false,
                            .http_status = 0,
                            .rtt_ms = 0.0,
                            .attempts_made = 0,
                            .error_message = {0}};

  int max_attempts = (retries >= 0) ? retries + 1 : 1;

  for (int attempt = 1; attempt <= max_attempts; attempt++) {
    result = http_check_single_attempt(
        ip_address, port, path, expected_statuses, expected_statuses_count,
        user, pass, timeout_ms);
    result.attempts_made = attempt;

    if (result.is_healthy) {
      return result;
    }
  }

  return result;
}
