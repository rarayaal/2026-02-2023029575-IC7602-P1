#ifndef SUPABASE_CLIENT_H
#define SUPABASE_CLIENT_H

#include "models.h"

/* Parametros de conexion hacia Supabase */
typedef struct {
  const char *url;
  const char *service_role_key; /*Supabase Anon Key*/
} SupabaseConfig;

/* Consulta targets activos y configuraciones asociadas desde Supabase PostgREST
 */
TargetNode *supabase_fetch_active_targets(const SupabaseConfig *config);

/* Registra o actualiza el latido (heartbeat) y ubicacion de la instancia actual */
bool supabase_register_heartbeat(const SupabaseConfig *config,
                                 const char *instance_id,
                                 const char *country_code,
                                 const char *city,
                                 double latitude,
                                 double longitude);

/* Envia una medicion de health check a Supabase para evaluar el consenso */
bool supabase_post_check_result(const SupabaseConfig *config,
                                const char *instance_id,
                                const char *target_id,
                                bool is_healthy,
                                double rtt_ms,
                                long http_code,
                                const char *error_message);

#endif /* SUPABASE_CLIENT_H */
