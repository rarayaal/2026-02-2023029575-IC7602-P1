#include "tcp_checker.h"
#include <arpa/inet.h>
#include <errno.h>
#include <fcntl.h>
#include <netinet/in.h>
#include <stdio.h>
#include <string.h>
#include <sys/select.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

/* Ejecuta un intento individual de conexion TCP no bloqueante */
static bool tcp_check_single_attempt(const char *ip, int port, int timeout_ms,
                                     double *out_rtt_ms, char *error_buf,
                                     size_t error_buf_len) {
  int domain = AF_INET;
  struct sockaddr_in addr4;
  struct sockaddr_in6 addr6;
  struct sockaddr *target_addr = NULL;
  socklen_t addr_len = 0;

  memset(&addr4, 0, sizeof(addr4));
  memset(&addr6, 0, sizeof(addr6));

  if (inet_pton(AF_INET, ip, &addr4.sin_addr) == 1) {
    addr4.sin_family = AF_INET;
    addr4.sin_port = htons((uint16_t)port);
    target_addr = (struct sockaddr *)&addr4;
    addr_len = sizeof(addr4);
  } else if (inet_pton(AF_INET6, ip, &addr6.sin6_addr) == 1) {
    domain = AF_INET6;
    addr6.sin6_family = AF_INET6;
    addr6.sin6_port = htons((uint16_t)port);
    target_addr = (struct sockaddr *)&addr6;
    addr_len = sizeof(addr6);
  } else {
    snprintf(error_buf, error_buf_len, "Direccion IP invalida: %s", ip);
    return false;
  }

  int sockfd = socket(domain, SOCK_STREAM, 0);
  if (sockfd < 0) {
    snprintf(error_buf, error_buf_len, "Falla al crear socket: %s",
             strerror(errno));
    return false;
  }

  /* Establecer socket en modo no bloqueante */
  int flags = fcntl(sockfd, F_GETFL, 0);
  if (flags < 0 || fcntl(sockfd, F_SETFL, flags | O_NONBLOCK) < 0) {
    snprintf(error_buf, error_buf_len,
             "Falla al configurar modo no bloqueante");
    close(sockfd);
    return false;
  }

  struct timespec start_time, end_time;
  clock_gettime(CLOCK_MONOTONIC, &start_time);

  int res = connect(sockfd, target_addr, addr_len);
  if (res == 0) {
    /* Conexion inmediata */
    clock_gettime(CLOCK_MONOTONIC, &end_time);
    *out_rtt_ms = (double)(end_time.tv_sec - start_time.tv_sec) * 1000.0 +
                  (double)(end_time.tv_nsec - start_time.tv_nsec) / 1000000.0;
    close(sockfd);
    return true;
  }

  if (errno != EINPROGRESS) {
    snprintf(error_buf, error_buf_len, "Falla al conectar: %s",
             strerror(errno));
    close(sockfd);
    return false;
  }

  /* Esperar que el socket complete el handshake o expire el timeout */
  fd_set write_fds;
  FD_ZERO(&write_fds);
  FD_SET(sockfd, &write_fds);

  struct timeval tv;
  tv.tv_sec = timeout_ms / 1000;
  tv.tv_usec = (timeout_ms % 1000) * 1000;

  int sel_res = select(sockfd + 1, NULL, &write_fds, NULL, &tv);
  if (sel_res == 0) {
    snprintf(error_buf, error_buf_len, "Timeout de conexion alcanzado: %d ms",
             timeout_ms);
    close(sockfd);
    return false;
  } else if (sel_res < 0) {
    snprintf(error_buf, error_buf_len, "Error en select: %s", strerror(errno));
    close(sockfd);
    return false;
  }

  /* Validar el estado final del socket */
  int so_error = 0;
  socklen_t len = sizeof(so_error);
  if (getsockopt(sockfd, SOL_SOCKET, SO_ERROR, &so_error, &len) < 0) {
    snprintf(error_buf, error_buf_len, "Error en getsockopt: %s",
             strerror(errno));
    close(sockfd);
    return false;
  }

  if (so_error != 0) {
    snprintf(error_buf, error_buf_len, "Conexion rechazada: %s",
             strerror(so_error));
    close(sockfd);
    return false;
  }

  clock_gettime(CLOCK_MONOTONIC, &end_time);
  *out_rtt_ms = (double)(end_time.tv_sec - start_time.tv_sec) * 1000.0 +
                (double)(end_time.tv_nsec - start_time.tv_nsec) / 1000000.0;

  close(sockfd);
  return true;
}

TcpCheckResult tcp_check_perform(const char *ip_address, int port,
                                 int timeout_ms, int retries) {
  TcpCheckResult result;
  memset(&result, 0, sizeof(result));

  int max_attempts = retries >= 0 ? retries + 1 : 1;

  for (int attempt = 1; attempt <= max_attempts; attempt++) {
    result.attempts_made = attempt;
    double rtt = 0.0;

    bool ok = tcp_check_single_attempt(ip_address, port, timeout_ms, &rtt,
                                       result.error_message,
                                       sizeof(result.error_message));
    if (ok) {
      result.is_healthy = true;
      result.rtt_ms = rtt;
      result.error_message[0] = '\0';
      return result;
    }

    if (attempt < max_attempts) {
      /* Pausa de 200 ms antes del siguiente reintento */
      usleep(200000);
    }
  }

  result.is_healthy = false;
  return result;
}
