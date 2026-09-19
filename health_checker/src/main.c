#include "http_checker.h"
#include "models.h"
#include "supabase_client.h"
#include "tcp_checker.h"
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static volatile bool keep_running = true;

/* Manejador de senales para terminacion controlada */
static void handle_signal(int sig) {
  (void)sig;
  printf(
      "\n[INFO] Senal de terminacion recibida. Cerrando Health Checker...\n");
  keep_running = false;
}

/* Evalua un target ejecutando su prueba de monitoreo correspondiente y reporta el resultado */
static void evaluate_target(TargetNode *target, size_t index,
                            const SupabaseConfig *config,
                            const char *instance_id) {
  printf("  [%zu] Target IP: %s (Weight: %d, Country: %s)\n", index,
         target->ip_address, target->weight,
         target->country_code[0] ? target->country_code : "N/A");

  if (!target->config || !target->config->is_enabled) {
    printf("      └─ Sin monitoreo activo o deshabilitado\n");
    return;
  }

  bool is_healthy = false;
  double rtt_ms = 0.0;
  long http_code = 0;
  const char *error_msg = NULL;

  if (target->config->protocol == PROTO_TCP) {
    printf("      └─ [TCP Check] Conectando a %s:%d (Timeout: %dms, Retries: "
           "%d)...\n",
           target->ip_address, target->config->port, target->config->timeout_ms,
           target->config->retries);

    TcpCheckResult res =
        tcp_check_perform(target->ip_address, target->config->port,
                          target->config->timeout_ms, target->config->retries);

    is_healthy = res.is_healthy;
    rtt_ms = res.rtt_ms;
    error_msg = res.error_message;

    if (res.is_healthy) {
      printf("         └─ Estado: HEALTHY (RTT: %.3f ms, Intentos: %d)\n",
             res.rtt_ms, res.attempts_made);
    } else {
      printf("         └─ Estado: UNHEALTHY (Fallo tras %d intentos. Motivo: "
             "%s)\n",
             res.attempts_made, res.error_message);
    }
  } else if (target->config->protocol == PROTO_HTTP) {
    printf("      └─ [HTTP Check] Solicitando http://%s:%d%s (Timeout: %dms, "
           "Retries: %d)...\n",
           target->ip_address, target->config->port,
           target->config->path ? target->config->path : "/",
           target->config->timeout_ms, target->config->retries);

    HttpCheckResult res = http_check_perform(
        target->ip_address, target->config->port, target->config->path,
        target->config->expected_statuses,
        target->config->expected_statuses_count,
        target->config->basic_auth_user, target->config->basic_auth_pass,
        target->config->timeout_ms, target->config->retries);

    is_healthy = res.is_healthy;
    rtt_ms = res.rtt_ms;
    http_code = res.http_status;
    error_msg = res.error_message;

    if (res.is_healthy) {
      printf("         └─ Estado: HEALTHY (HTTP Status: %ld, RTT: %.3f ms, "
             "Intentos: %d)\n",
             res.http_status, res.rtt_ms, res.attempts_made);
    } else {
      printf("         └─ Estado: UNHEALTHY (HTTP Status: %ld, Fallo tras %d "
             "intentos. Motivo: %s)\n",
             res.http_status, res.attempts_made, res.error_message);
    }
  }

  target->is_healthy = is_healthy;

  /* Reportar telemetria a Supabase para disparar el consenso */
  if (config && instance_id) {
    bool ok = supabase_post_check_result(config, instance_id, target->id,
                                         is_healthy, rtt_ms, http_code,
                                         error_msg);
    if (ok) {
      printf("         └─ [Consenso] Reporte enviado a Supabase exitosamente.\n");
    } else {
      printf("         └─ [Consenso] Advertencia: No se pudo enviar el reporte a Supabase.\n");
    }
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

  /* Configuracion de la instancia para consenso y ubicacion */
  const char *instance_id = getenv("INSTANCE_ID");
  if (!instance_id || strlen(instance_id) == 0) {
    instance_id = "hc-node-local";
  }

  const char *country_code = getenv("INSTANCE_COUNTRY");
  if (!country_code || strlen(country_code) == 0) {
    country_code = "CR";
  }

  const char *city = getenv("INSTANCE_CITY");
  if (!city || strlen(city) == 0) {
    city = "San Jose";
  }

  double latitude = 9.9281;
  const char *lat_env = getenv("INSTANCE_LAT");
  if (lat_env) {
    latitude = atof(lat_env);
  }

  double longitude = -84.0907;
  const char *lon_env = getenv("INSTANCE_LON");
  if (lon_env) {
    longitude = atof(lon_env);
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
  printf("   HEALTH CHECKER - MOTOR TCP, HTTP Y CONSENSO (C)   \n");
  printf("=====================================================\n");
  printf("[CONFIG] Supabase URL: %s\n", config.url);
  printf("[CONFIG] Instance ID: %s (%s, %s [%.4f, %.4f])\n", instance_id,
         city, country_code, latitude, longitude);
  printf("[CONFIG] Intervalo de sincronizacion: %d segundos\n\n",
         sync_interval);

  /* Ciclo principal de sondeo, monitoreo y consenso */
  while (keep_running) {
    /* Registro del latido de la instancia */
    printf("[HEARTBEAT] Registrando latido de la instancia en Supabase...\n");
    if (supabase_register_heartbeat(&config, instance_id, country_code, city,
                                    latitude, longitude)) {
      printf("[HEARTBEAT] Instancia confirmada como activa.\n");
    } else {
      printf("[WARN] No se pudo actualizar el latido de la instancia.\n");
    }

    printf("[SYNC] Consultando targets activos desde Supabase...\n");
    TargetNode *targets = supabase_fetch_active_targets(&config);

    if (targets) {
      size_t count = target_list_count(targets);
      printf("[OK] Se cargaron %zu target(s) activo(s). Iniciando "
             "evaluacion y emision de votos:\n",
             count);

      size_t idx = 1;
      TargetNode *curr = targets;
      while (curr != NULL) {
        evaluate_target(curr, idx++, &config, instance_id);
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
