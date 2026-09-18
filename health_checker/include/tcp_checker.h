#ifndef TCP_CHECKER_H
#define TCP_CHECKER_H

#include <stdbool.h>

/* Resultado de la comprobacion TCP */
typedef struct {
  bool is_healthy;
  double rtt_ms;
  int attempts_made;
  char error_message[256];
} TcpCheckResult;

/* Ejecuta la comprobacion TCP con control de timeout y reintentos */
TcpCheckResult tcp_check_perform(const char *ip_address, int port,
                                 int timeout_ms, int retries);

#endif /* TCP_CHECKER_H */
