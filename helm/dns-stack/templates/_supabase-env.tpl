{{/*
Bloque de variables de entorno con las credenciales de Supabase.
Lo comparten el DNS API y los Health Checkers, asi no se repite en cada plantilla.
*/}}
{{- define "dns-stack.supabaseEnv" -}}
- name: SUPABASE_URL
  valueFrom:
    secretKeyRef:
      name: {{ .Values.supabase.existingSecret | default (printf "%s-supabase" (include "dns-stack.fullname" .)) }}
      key: SUPABASE_URL
- name: SUPABASE_SERVICE_ROLE_KEY
  valueFrom:
    secretKeyRef:
      name: {{ .Values.supabase.existingSecret | default (printf "%s-supabase" (include "dns-stack.fullname" .)) }}
      key: SUPABASE_SERVICE_ROLE_KEY
{{- end -}}
