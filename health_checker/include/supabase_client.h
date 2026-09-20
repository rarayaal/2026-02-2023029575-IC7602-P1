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

#endif /* SUPABASE_CLIENT_H */
