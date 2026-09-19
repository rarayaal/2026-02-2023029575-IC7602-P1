#include "supabase_client.h"
#include "cJSON.h"
#include <curl/curl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

/* Bufer para almacenar la respuesta HTTP en memoria */
typedef struct {
  char *data;
  size_t size;
} MemoryChunk;

/* Callback de libcurl para recibir datos de red */
static size_t write_callback(void *contents, size_t size, size_t nmemb,
                             void *userp) {
  size_t total_size = size * nmemb;
  MemoryChunk *mem = (MemoryChunk *)userp;

  char *ptr = (char *)realloc(mem->data, mem->size + total_size + 1);
  if (!ptr) {
    fprintf(stderr, "[ERROR] Memoria insuficiente para respuesta HTTP\n");
    return 0;
  }

  mem->data = ptr;
  memcpy(&(mem->data[mem->size]), contents, total_size);
  mem->size += total_size;
  mem->data[mem->size] = '\0';

  return total_size;
}

/* Extrae los parametros de health check del JSON */
static HealthCheckConfig *parse_health_check_config(const cJSON *hc_item) {
  if (!hc_item || cJSON_IsNull(hc_item)) {
    return NULL;
  }

  HealthCheckConfig *config =
      (HealthCheckConfig *)calloc(1, sizeof(HealthCheckConfig));
  if (!config) {
    return NULL;
  }

  cJSON *id = cJSON_GetObjectItemCaseSensitive(hc_item, "id");
  if (cJSON_IsString(id) && (id->valuestring != NULL)) {
    strncpy(config->id, id->valuestring, sizeof(config->id) - 1);
  }

  cJSON *protocol = cJSON_GetObjectItemCaseSensitive(hc_item, "protocol");
  if (cJSON_IsString(protocol) && (protocol->valuestring != NULL)) {
    if (strcasecmp(protocol->valuestring, "HTTP") == 0) {
      config->protocol = PROTO_HTTP;
    } else {
      config->protocol = PROTO_TCP;
    }
  }

  cJSON *port = cJSON_GetObjectItemCaseSensitive(hc_item, "port");
  config->port = cJSON_IsNumber(port) ? port->valueint : 80;

  cJSON *path = cJSON_GetObjectItemCaseSensitive(hc_item, "path");
  if (cJSON_IsString(path) && (path->valuestring != NULL)) {
    config->path = strdup(path->valuestring);
  } else {
    config->path = strdup("/");
  }

  cJSON *statuses =
      cJSON_GetObjectItemCaseSensitive(hc_item, "expected_statuses");
  if (cJSON_IsArray(statuses)) {
    int count = cJSON_GetArraySize(statuses);
    if (count > 0) {
      config->expected_statuses = (int *)calloc((size_t)count, sizeof(int));
      if (config->expected_statuses) {
        config->expected_statuses_count = (size_t)count;
        int idx = 0;
        cJSON *status_elem = NULL;
        cJSON_ArrayForEach(status_elem, statuses) {
          if (cJSON_IsNumber(status_elem)) {
            config->expected_statuses[idx++] = status_elem->valueint;
          }
        }
      }
    }
  }

  cJSON *auth_user =
      cJSON_GetObjectItemCaseSensitive(hc_item, "basic_auth_user");
  if (cJSON_IsString(auth_user) && (auth_user->valuestring != NULL)) {
    config->basic_auth_user = strdup(auth_user->valuestring);
  }

  cJSON *auth_pass =
      cJSON_GetObjectItemCaseSensitive(hc_item, "basic_auth_pass");
  if (cJSON_IsString(auth_pass) && (auth_pass->valuestring != NULL)) {
    config->basic_auth_pass = strdup(auth_pass->valuestring);
  }

  cJSON *timeout = cJSON_GetObjectItemCaseSensitive(hc_item, "timeout_ms");
  config->timeout_ms = cJSON_IsNumber(timeout) ? timeout->valueint : 5000;

  cJSON *retries = cJSON_GetObjectItemCaseSensitive(hc_item, "retries");
  config->retries = cJSON_IsNumber(retries) ? retries->valueint : 3;

  cJSON *interval =
      cJSON_GetObjectItemCaseSensitive(hc_item, "interval_seconds");
  config->interval_seconds = cJSON_IsNumber(interval) ? interval->valueint : 30;

  cJSON *enabled = cJSON_GetObjectItemCaseSensitive(hc_item, "is_enabled");
  config->is_enabled = cJSON_IsBool(enabled) ? cJSON_IsTrue(enabled) : true;

  return config;
}

/* Transforma el JSON de Supabase en una lista enlazada */
static TargetNode *parse_targets_json(const char *json_string) {
  cJSON *root = cJSON_Parse(json_string);
  if (!root) {
    const char *error_ptr = cJSON_GetErrorPtr();
    if (error_ptr != NULL) {
      fprintf(stderr, "[ERROR] Falla al parsear JSON cerca de: %s\n",
              error_ptr);
    }
    return NULL;
  }

  if (!cJSON_IsArray(root)) {
    fprintf(stderr,
            "[ERROR] Respuesta de Supabase no contiene un arreglo JSON\n");
    cJSON_Delete(root);
    return NULL;
  }

  TargetNode *head = NULL;
  TargetNode *tail = NULL;
  cJSON *elem = NULL;

  cJSON_ArrayForEach(elem, root) {
    TargetNode *node = target_node_create();
    if (!node) {
      continue;
    }

    cJSON *id = cJSON_GetObjectItemCaseSensitive(elem, "id");
    if (cJSON_IsString(id) && (id->valuestring != NULL)) {
      strncpy(node->id, id->valuestring, sizeof(node->id) - 1);
    }

    cJSON *record_id = cJSON_GetObjectItemCaseSensitive(elem, "record_id");
    if (cJSON_IsString(record_id) && (record_id->valuestring != NULL)) {
      strncpy(node->record_id, record_id->valuestring,
              sizeof(node->record_id) - 1);
    }

    cJSON *ip = cJSON_GetObjectItemCaseSensitive(elem, "ip_address");
    if (cJSON_IsString(ip) && (ip->valuestring != NULL)) {
      strncpy(node->ip_address, ip->valuestring, sizeof(node->ip_address) - 1);
    }

    cJSON *weight = cJSON_GetObjectItemCaseSensitive(elem, "weight");
    node->weight = cJSON_IsNumber(weight) ? weight->valueint : 1;

    cJSON *country = cJSON_GetObjectItemCaseSensitive(elem, "country_code");
    if (cJSON_IsString(country) && (country->valuestring != NULL)) {
      strncpy(node->country_code, country->valuestring,
              sizeof(node->country_code) - 1);
    }

    cJSON *healthy = cJSON_GetObjectItemCaseSensitive(elem, "is_healthy");
    node->is_healthy = cJSON_IsBool(healthy) ? cJSON_IsTrue(healthy) : true;

    cJSON *active = cJSON_GetObjectItemCaseSensitive(elem, "is_active");
    node->is_active = cJSON_IsBool(active) ? cJSON_IsTrue(active) : true;

    cJSON *hc_item =
        cJSON_GetObjectItemCaseSensitive(elem, "health_check_configs");
    if (cJSON_IsArray(hc_item) && cJSON_GetArraySize(hc_item) > 0) {
      node->config = parse_health_check_config(cJSON_GetArrayItem(hc_item, 0));
    } else if (cJSON_IsObject(hc_item)) {
      node->config = parse_health_check_config(hc_item);
    }

    /* Insertar al final de la lista enlazada */
    if (!head) {
      head = node;
      tail = node;
    } else {
      tail->next = node;
      tail = node;
    }
  }

  cJSON_Delete(root);
  return head;
}

/* Realiza peticion HTTPS a Supabase y procesa los targets */
TargetNode *supabase_fetch_active_targets(const SupabaseConfig *config) {
  if (!config || !config->url || !config->service_role_key) {
    fprintf(stderr, "[ERROR] Configuracion de Supabase incompleta\n");
    return NULL;
  }

  CURL *curl = curl_easy_init();
  if (!curl) {
    fprintf(stderr, "[ERROR] No se pudo inicializar libcurl\n");
    return NULL;
  }

  /* Construccion de URL con join relacional PostgREST */
  char full_url[1024];
  snprintf(
      full_url, sizeof(full_url),
      "%s/rest/v1/"
      "dns_record_targets?select=*,health_check_configs(*)&is_active=eq.true",
      config->url);

  MemoryChunk chunk;
  chunk.data = (char *)malloc(1);
  chunk.size = 0;

  /* Cabeceras de autenticacion */
  struct curl_slist *headers = NULL;
  char apikey_hdr[512];
  char auth_hdr[512];
  snprintf(apikey_hdr, sizeof(apikey_hdr), "apikey: %s",
           config->service_role_key);
  snprintf(auth_hdr, sizeof(auth_hdr), "Authorization: Bearer %s",
           config->service_role_key);

  headers = curl_slist_append(headers, apikey_hdr);
  headers = curl_slist_append(headers, auth_hdr);
  headers = curl_slist_append(headers, "Accept: application/json");

  curl_easy_setopt(curl, CURLOPT_URL, full_url);
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
  curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)&chunk);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);
  curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);

  CURLcode res = curl_easy_perform(curl);
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

  TargetNode *targets = NULL;
  if (res != CURLE_OK) {
    fprintf(stderr, "[ERROR] libcurl fallo al conectar: %s\n",
            curl_easy_strerror(res));
  } else if (http_code != 200) {
    fprintf(stderr, "[ERROR] Supabase respondio con HTTP %ld: %s\n", http_code,
            chunk.data ? chunk.data : "");
  } else {
    targets = parse_targets_json(chunk.data);
  }

  /* Liberacion de recursos */
  free(chunk.data);
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  return targets;
}

/* Registra o actualiza el latido (heartbeat) y ubicacion de la instancia actual */
bool supabase_register_heartbeat(const SupabaseConfig *config,
                                 const char *instance_id,
                                 const char *country_code,
                                 const char *city,
                                 double latitude,
                                 double longitude) {
  if (!config || !config->url || !config->service_role_key || !instance_id) {
    return false;
  }

  CURL *curl = curl_easy_init();
  if (!curl) {
    return false;
  }

  char full_url[1024];
  snprintf(full_url, sizeof(full_url), "%s/rest/v1/checker_instances",
           config->url);

  cJSON *root = cJSON_CreateObject();
  cJSON_AddStringToObject(root, "instance_id", instance_id);
  cJSON_AddStringToObject(root, "country_code",
                          country_code ? country_code : "CR");
  cJSON_AddStringToObject(root, "city", city ? city : "San Jose");
  cJSON_AddNumberToObject(root, "latitude", latitude);
  cJSON_AddNumberToObject(root, "longitude", longitude);
  cJSON_AddBoolToObject(root, "is_active", true);

  char *payload = cJSON_PrintUnformatted(root);
  cJSON_Delete(root);

  if (!payload) {
    curl_easy_cleanup(curl);
    return false;
  }

  struct curl_slist *headers = NULL;
  char apikey_hdr[512];
  char auth_hdr[512];
  snprintf(apikey_hdr, sizeof(apikey_hdr), "apikey: %s",
           config->service_role_key);
  snprintf(auth_hdr, sizeof(auth_hdr), "Authorization: Bearer %s",
           config->service_role_key);

  headers = curl_slist_append(headers, apikey_hdr);
  headers = curl_slist_append(headers, auth_hdr);
  headers = curl_slist_append(headers, "Content-Type: application/json");
  headers = curl_slist_append(headers, "Prefer: resolution=merge-duplicates");

  curl_easy_setopt(curl, CURLOPT_URL, full_url);
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

  CURLcode res = curl_easy_perform(curl);
  long http_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &http_code);

  free(payload);
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  return (res == CURLE_OK && (http_code == 200 || http_code == 201 || http_code == 204));
}

/* Envia una medicion de health check a Supabase para evaluar el consenso */
bool supabase_post_check_result(const SupabaseConfig *config,
                                const char *instance_id,
                                const char *target_id,
                                bool is_healthy,
                                double rtt_ms,
                                long http_code,
                                const char *error_message) {
  if (!config || !config->url || !config->service_role_key || !instance_id ||
      !target_id) {
    return false;
  }

  CURL *curl = curl_easy_init();
  if (!curl) {
    return false;
  }

  char full_url[1024];
  snprintf(full_url, sizeof(full_url), "%s/rest/v1/health_check_results",
           config->url);

  cJSON *root = cJSON_CreateObject();
  cJSON_AddStringToObject(root, "instance_id", instance_id);
  cJSON_AddStringToObject(root, "target_id", target_id);
  cJSON_AddStringToObject(root, "status", is_healthy ? "healthy" : "unhealthy");
  cJSON_AddNumberToObject(root, "rtt_ms", rtt_ms >= 0.0 ? rtt_ms : 0.0);
  if (http_code > 0) {
    cJSON_AddNumberToObject(root, "http_code", (double)http_code);
  }
  if (error_message && strlen(error_message) > 0) {
    cJSON_AddStringToObject(root, "error_message", error_message);
  }

  char *payload = cJSON_PrintUnformatted(root);
  cJSON_Delete(root);

  if (!payload) {
    curl_easy_cleanup(curl);
    return false;
  }

  struct curl_slist *headers = NULL;
  char apikey_hdr[512];
  char auth_hdr[512];
  snprintf(apikey_hdr, sizeof(apikey_hdr), "apikey: %s",
           config->service_role_key);
  snprintf(auth_hdr, sizeof(auth_hdr), "Authorization: Bearer %s",
           config->service_role_key);

  headers = curl_slist_append(headers, apikey_hdr);
  headers = curl_slist_append(headers, auth_hdr);
  headers = curl_slist_append(headers, "Content-Type: application/json");

  curl_easy_setopt(curl, CURLOPT_URL, full_url);
  curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
  curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload);
  curl_easy_setopt(curl, CURLOPT_TIMEOUT, 10L);

  CURLcode res = curl_easy_perform(curl);
  long resp_code = 0;
  curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp_code);

  free(payload);
  curl_slist_free_all(headers);
  curl_easy_cleanup(curl);

  return (res == CURLE_OK && (resp_code == 200 || resp_code == 201 || resp_code == 204));
}

