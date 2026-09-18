#include "models.h"
#include "supabase_client.h"
#include "tcp_checker.h"
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>

static volatile bool keep_running = true;

/* Manejador de senales para terminacion controlada */
static void handle_signal(int sig) {
  (void)sig;
  printf(
      "\n[INFO] Senal de terminacion recibida. Cerrando Health Checker...\n");
  keep_running = false;
}

/* Evalua un target ejecutando su prueba de monitoreo correspondiente */
static void evaluate_target(TargetNode *target, size_t index) {
  printf("  [%zu] Target IP: %s (Weight: %d, Country: %s)\n", index,
         target->ip_address, target->weight,
         target->country_code[0] ? target->country_code : "N/A");

  if (!target->config || !target->config->is_enabled) {
    printf("      └─ Sin monitoreo activo o deshabilitado\n");
    return;
  }

  if (target->config->protocol == PROTO_TCP) {
    printf("      └─ [TCP Check] Conectando a %s:%d (Timeout: %dms, Retries: "
           "%d)...\n",
           target->ip_address, target->config->port, target->config->timeout_ms,
           target->config->retries);

    TcpCheckResult res =
        tcp_check_perform(target->ip_address, target->config->port,
                          target->config->timeout_ms, target->config->retries);

    target->is_healthy = res.is_healthy;

    if (res.is_healthy) {
      printf("         └─ Estado: HEALTHY (RTT: %.3f ms, Intentos: %d)\n",
             res.rtt_ms, res.attempts_made);
    } else {
      printf("         └─ Estado: UNHEALTHY (Fallo tras %d intentos. Motivo: "
             "%s)\n",
             res.attempts_made, res.error_message);
    }
  } else if (target->config->protocol == PROTO_HTTP) {
    printf("      └─ [HTTP Check] Protocolo HTTP configurado en puerto %d "
           "(Evaluacion en T-28)\n",
           target->config->port);
  }
}

int main(void) {
  /* Registro de senales de apagado */
  signal(SIGINT, handle_signal);
  signal(SIGTERM, handle_signal);

  /* Lectura de variables de entorno requeridas */
  const char *supabase_url = getenv("SUPABASE_URL");
  const char *supabase_key = getenv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabase_key) {
    supabase_key = getenv("SUPABASE_ANON_KEY");
  }

  if (!supabase_url || !supabase_key) {
    fprintf(stderr, "[FATAL] Variables de entorno faltantes: SUPABASE_URL y "
                    "SUPABASE_SERVICE_ROLE_KEY o SUPABASE_ANON_KEY\n");
    return EXIT_FAILURE;
  }

  int sync_interval = 30;
  const char *interval_env = getenv("SYNC_INTERVAL_SECONDS");
  if (interval_env) {
    int parsed_interval = atoi(interval_env);
    if (parsed_interval > 0) {
      sync_interval = parsed_interval;
    }
  }

  SupabaseConfig config = {.url = supabase_url,
                           .service_role_key = supabase_key};

  printf("=====================================================\n");
  printf("   HEALTH CHECKER - MOTOR TCP Y LECTURA (GNU C)      \n");
  printf("=====================================================\n");
  printf("[CONFIG] Supabase URL: %s\n", config.url);
  printf("[CONFIG] Intervalo de sincronizacion: %d segundos\n\n",
         sync_interval);

  /* Ciclo principal de sondeo y monitoreo */
  while (keep_running) {
    printf("[SYNC] Consultando targets activos desde Supabase...\n");
    TargetNode *targets = supabase_fetch_active_targets(&config);

    if (targets) {
      size_t count = target_list_count(targets);
      printf("[OK] Se cargaron %zu target(s) activo(s). Iniciando "
             "evaluacion:\n",
             count);

      size_t idx = 1;
      TargetNode *curr = targets;
      while (curr != NULL) {
        evaluate_target(curr, idx++);
        curr = curr->next;
      }

      /* Liberacion de la lista en memoria */
      target_list_free(targets);
      targets = NULL;
    } else {
      printf("[WARN] No se obtuvieron targets activos o la base de datos esta "
             "vacia.\n");
    }

    printf("\n[SLEEP] Esperando %d segundos para el siguiente ciclo...\n\n",
           sync_interval);

    /* Pausa escalonada para responder inmediatamente a Ctrl+C */
    for (int i = 0; i < sync_interval && keep_running; i++) {
      sleep(1);
    }
  }

  printf("[EXIT] Health Checker detenido con exito. Memoria liberada.\n");
  return EXIT_SUCCESS;
}
