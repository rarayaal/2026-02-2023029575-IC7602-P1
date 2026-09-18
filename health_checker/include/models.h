#ifndef MODELS_H
#define MODELS_H

#include <stdbool.h>
#include <stddef.h>

/* Protocolo de monitoreo */
typedef enum { PROTO_TCP, PROTO_HTTP } TargetProtocol;

/* Parametros de monitoreo asociados a un target */
typedef struct {
  char id[40]; /* UUID de health_check_configs */
  TargetProtocol protocol;
  int port;
  char *path;
  int *expected_statuses;
  size_t expected_statuses_count;
  char *basic_auth_user;
  char *basic_auth_pass;
  int timeout_ms;
  int retries;
  int interval_seconds;
  bool is_enabled;
} HealthCheckConfig;

/* Nodo de la lista enlazada de targets DNS */
typedef struct TargetNode {
  char id[40];         /* UUID de dns_record_targets */
  char record_id[40];  /* UUID de dns_records */
  char ip_address[46]; /* IPv4 o IPv6 en texto */
  int weight;
  char country_code[3];
  bool is_healthy;
  bool is_active;
  HealthCheckConfig *config;
  struct TargetNode *next;
} TargetNode;

/* Ciclo de vida y gestion de memoria */
TargetNode *target_node_create(void);
void target_node_free(TargetNode *node);
void target_list_free(TargetNode *head);
size_t target_list_count(const TargetNode *head);

#endif /* MODELS_H */
