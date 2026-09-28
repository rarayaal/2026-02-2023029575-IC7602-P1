# T-34: Validación CRUD completo de registros DNS

## Arquitectura

```
DnsRecordsPage.jsx
       ↓
 dnsService.js
       ↓
mocks/dnsRecords.js
```

> **IMPORTANTE:** NO se utiliza ninguna API, `fetch`, `axios`, endpoints HTTP ni conexión a backend externo. Todo el sistema opera al 100% sobre la capa de abstracción de datos MOCK local en memoria.

---

## Crear

Se validó la interfaz funcional y la creación exitosa de los cinco tipos de registros DNS soportados:

- **Single**: Registro con dirección IP única fija (ej. `192.168.1.50`).
- **Multi**: Registro con múltiples direcciones IP balanceadas por round-robin (ej. `10.0.0.1, 10.0.0.2`).
- **Weight**: Registro con balanceo de carga asignado por porcentaje de peso/intensidad (ej. `172.16.0.1 (70%) | 172.16.0.2 (30%)`).
- **Round-Trip**: Registro con selección dinámica basada en ubicación y menor latencia en ms (ej. `198.51.100.4 (Lat: 12ms)`).
- **Geo**: Registro mapeado por ubicación geográfica de país e IP asignada (ej. `US: 203.0.113.10 | CR: 203.0.113.20`).

**Verificaciones de Creación:**
- Renderizado correcto del modal y campos dinámicos específicos por tipo.
- Validaciones de campos obligatorios previas al envío.
- Guardado asíncrono invocando `dnsService.createRecord(newRecordData)`.
- Actualización inmediata de la tabla en pantalla sin necesidad de recargar la página.
- Banners de notificación de éxito y manejo de errores.

---

## Editar

Se validó la funcionalidad de edición para todos los registros existentes y de los cinco tipos soportados (`Single`, `Multi`, `Weight`, `Round-Trip`, `Geo`):

- **Carga de Datos**: Al hacer clic en el botón de edición, el modal carga automáticamente todos los datos actuales del registro seleccionado (`domain`, `type`, `ttl`, `healthCheck`, e información específica del tipo).
- **Modificación**: Se permite editar cualquier campo común o específico, así como cambiar el tipo de registro o agregar/eliminar filas dinámicas.
- **Guardado**: Los cambios se procesan mediante `dnsService.updateRecord(id, updatedData)`.
- **Actualización Visual**: La tabla refleja de inmediato los datos modificados.

---

## Eliminar

Se validó el flujo completo de eliminación de registros DNS desde la tabla:

- **Confirmación previa**: Al presionar el botón de eliminar, se despliega una ventana emergente de confirmación.
- **Identificación del registro**: El modal de confirmación muestra explícitamente el **Dominio**, **ID**, **Tipo** e **IP/Información principal** del registro a eliminar.
- **Cancelación**: Al cancelar, el modal se cierra y no se modifica ningún dato en el sistema.
- **Eliminación**: Al confirmar, se invoca `dnsService.deleteRecord(id)`. El registro se elimina del estado mock local.
- **Actualización e Interfaz**: La tabla se refresca de inmediato, el registro eliminado desaparece de la vista y se despliega una notificación de éxito (`Registro DNS (...) eliminado exitosamente`).

---

## Validaciones

Se verificaron los mecanismos de validación de integridad de datos:

- **Campos obligatorios**: Verificación de presencia de nombre de dominio y TTL válido (número positivo).
- **Formatos por Tipo**:
  - `Single`: Requiere una IP válida.
  - `Multi`: Requiere al menos una dirección IP.
  - `Weight`: Requiere al menos una fila con IP y Peso % positivo.
  - `Round-Trip`: Requiere al menos una fila con IP, Ubicación y Latencia.
  - `Geo`: Requiere al menos una fila con País e IP.
- **Prevención de inconsistencias**: Mensajes de alerta claros e interactivos cuando se intentan ingresar datos incompletos.

---

## Pruebas

Comandos ejecutados para la verificación:

```bash
npm run build
npm run dev
```

**Resultado de las Pruebas:**
- **Compilación exitosa**: `npm run build` genera el bundle de producción en `dist/` en 1.39s sin errores ni advertencias.
- **Ejecución en desarrollo**: `npm run dev` funciona continuamente en `http://localhost:3000/`.
- **CRUD 100% Funcional**: Secuencia completa de Visualizar $\rightarrow$ Crear $\rightarrow$ Editar $\rightarrow$ Eliminar verificada y operativa sobre datos MOCK.
