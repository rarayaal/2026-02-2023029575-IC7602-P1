#ifndef HTTP_CHECKER_H
#define HTTP_CHECKER_H

#include <stdbool.h>
#include <stddef.h>

/* Resultado de la comprobacion de salud HTTP */
typedef struct {
  bool is_healthy;
  long http_status;
  double rtt_ms;
  int attempts_made;
  char error_message[256];
} HttpCheckResult;

/* Ejecuta el ciclo de comprobacion HTTP con reintentos y autenticacion */
HttpCheckResult http_check_perform(const char *ip_address, int port,
                                   const char *path,
                                   const int *expected_statuses,
                                   size_t expected_statuses_count,
                                   const char *user, const char *pass,
                                   int timeout_ms, int retries);

/* Codifica datos binarios o texto en formato Base64 */
char *base64_encode(const unsigned char *data, size_t input_length);

#endif /* HTTP_CHECKER_H */
