import { dnsService } from './dnsService';

// Capa de servicio Health Checks conectada al DNS API Java (T-35)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const healthCheckService = {
  /**
   * Obtiene la lista completa de Health Checks desde el DNS API Java
   */
  async getHealthChecks() {
    const response = await fetch(`${API_BASE_URL}/api/health-checks`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron obtener los Health Checks`);
    }
    const data = await response.json();
    return data.map((item) => ({
      ...item,
      name: item.name || `Check ${item.protocol} (${item.port})`,
      type: item.protocol,
      target: item.target || `${item.protocol} ${item.path || item.port}`,
      status: item.status || (item.isEnabled ? 'healthy' : 'unknown'),
      host: item.host || item.targetId,
      ip: item.ip || item.targetId,
    }));
  },

  /**
   * Obtiene un Health Check por su ID
   */
  async getHealthCheckById(id) {
    const response = await fetch(`${API_BASE_URL}/api/health-checks/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Error ${response.status}: No se pudo obtener el Health Check`);
    }
    const item = await response.json();
    return {
      ...item,
      name: item.name || `Check ${item.protocol} (${item.port})`,
      type: item.protocol,
      target: item.target || `${item.protocol} ${item.path || item.port}`,
      status: item.status || (item.isEnabled ? 'healthy' : 'unknown'),
      host: item.host || item.targetId,
      ip: item.ip || item.targetId,
    };
  },

  /**
   * Crea un nuevo Health Check en el API Java
   */
  async createHealthCheck(newCheckData) {
    let rawTarget = (newCheckData.targetId || newCheckData.host || newCheckData.ip || '').trim();
    let resolvedTargetId = rawTarget;

    const isUuid = (str) =>
      typeof str === 'string' &&
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(str);

    if (!isUuid(resolvedTargetId)) {
      try {
        const records = await dnsService.getRecords();
        for (const r of records) {
          if (Array.isArray(r.targets)) {
            const found = r.targets.find((t) => t.ip === rawTarget || t.id === rawTarget);
            if (found && found.id) {
              resolvedTargetId = found.id;
              break;
            }
          }
        }
      } catch (e) {
        console.warn('No se pudo resolver el UUID de la IP target:', e);
      }
    }

    if (!isUuid(resolvedTargetId)) {
      throw new Error(
        `No se encontró ninguna IP registrada en los Registros DNS que coincida con '${rawTarget}'. En Supabase un Health Check debe vincularse a una IP de un Registro DNS existente. Primero crea el Registro DNS con esa IP.`
      );
    }

    const payload = {
      targetId: resolvedTargetId,
      protocol: newCheckData.protocol || newCheckData.type,
      port: Number(newCheckData.port),
      path: newCheckData.path || '/',
      expectedStatuses: newCheckData.expectedStatuses || [200],
      basicAuth: newCheckData.basicAuth || null,
      timeoutMs: Number(newCheckData.timeoutMs || 5000),
      retries: Number(newCheckData.retries !== undefined ? newCheckData.retries : 3),
      intervalSeconds: Number(newCheckData.intervalSeconds || 30),
      isEnabled: newCheckData.isEnabled !== undefined ? Boolean(newCheckData.isEnabled) : true,
    };

    const response = await fetch(`${API_BASE_URL}/api/health-checks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo crear el Health Check`);
    }

    const created = await response.json();
    return {
      ...created,
      name: newCheckData.name || `Check ${created.protocol} (${created.port})`,
      type: created.protocol,
      target: newCheckData.target || `${created.protocol} ${created.port}`,
      status: created.status || (created.isEnabled ? 'healthy' : 'unknown'),
    };
  },

  /**
   * Actualiza un Health Check existente
   */
  async updateHealthCheck(id, updatedData) {
    const payload = {
      targetId: updatedData.targetId || updatedData.host || updatedData.ip,
      protocol: updatedData.protocol || updatedData.type,
      port: Number(updatedData.port),
      path: updatedData.path || '/',
      expectedStatuses: updatedData.expectedStatuses || [200],
      basicAuth: updatedData.basicAuth || null,
      timeoutMs: Number(updatedData.timeoutMs || 5000),
      retries: Number(updatedData.retries !== undefined ? updatedData.retries : 3),
      intervalSeconds: Number(updatedData.intervalSeconds || 30),
      isEnabled: updatedData.isEnabled !== undefined ? Boolean(updatedData.isEnabled) : true,
    };

    const response = await fetch(`${API_BASE_URL}/api/health-checks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo actualizar el Health Check`);
    }

    const updated = await response.json();
    return {
      ...updated,
      name: updatedData.name || `Check ${updated.protocol} (${updated.port})`,
      type: updated.protocol,
      target: updatedData.target || `${updated.protocol} ${updated.port}`,
      status: updated.status || (updated.isEnabled ? 'healthy' : 'unknown'),
    };
  },

  /**
   * Elimina un Health Check por ID
   */
  async deleteHealthCheck(id) {
    const response = await fetch(`${API_BASE_URL}/api/health-checks/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Error ${response.status}: No se pudo eliminar el Health Check`);
    }

    return true;
  },
};

