#include "models.h"
#include "supabase_client.h"
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

/* Imprime los atributos del target en consola */
static void print_target_info(const TargetNode *target, size_t index) {
  printf("  [%zu] IP: %s (Weight: %d, Country: %s, Healthy: %s)\n", index,
         target->ip_address, target->weight,
         target->country_code[0] ? target->country_code : "N/A",
         target->is_healthy ? "true" : "false");

  if (target->config) {
    printf("      └─ Health Check: Protocol=%s, Port=%d, Timeout=%dms, "
           "Retries=%d, Interval=%ds\n",
           target->config->protocol == PROTO_HTTP ? "HTTP" : "TCP",
           target->config->port, target->config->timeout_ms,
           target->config->retries, target->config->interval_seconds);

    if (target->config->protocol == PROTO_HTTP) {
      printf("         Path: %s, Auth: %s\n",
             target->config->path ? target->config->path : "/",
             target->config->basic_auth_user ? "Basic Auth configurado"
                                             : "Sin auth");
    }
  } else {
    printf("      Sin configuracion de health check asociada\n");
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
  printf("   HEALTH CHECKER - MOTOR DE LECTURA (GNU C)        \n");
  printf("=====================================================\n");
  printf("[CONFIG] Supabase URL: %s\n", config.url);
  printf("[CONFIG] Intervalo de sincronizacion: %d segundos\n\n",
         sync_interval);

  /* Ciclo principal de sondeo */
  while (keep_running) {
    printf("[SYNC] Consultando targets activos desde Supabase...\n");
    TargetNode *targets = supabase_fetch_active_targets(&config);

    if (targets) {
      size_t count = target_list_count(targets);
      printf("[OK] Se cargaron %zu target(s) activo(s) en memoria:\n", count);

      size_t idx = 1;
      TargetNode *curr = targets;
      while (curr != NULL) {
        print_target_info(curr, idx++);
        curr = curr->next;
      }

      /* Liberacion de la lista en memoria */
      target_list_free(targets);
      targets = NULL;
    } else {
      printf("[WARN] No se obtuvieron targets activos o la base de datos esta "
             "vacia.\n");
    }

    printf("[SLEEP] Esperando %d segundos para el siguiente ciclo...\n\n",
           sync_interval);

    /* Dormir en intervalos pequeños de 1s para responder de inmediato a Ctrl+C
     */
    for (int i = 0; i < sync_interval && keep_running; i++) {
      sleep(1);
    }
  }

  printf("[EXIT] Health Checker detenido con exito. Memoria liberada.\n");
  return EXIT_SUCCESS;
}
