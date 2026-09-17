import { MOCK_HEALTH_CHECKS } from '../mocks/healthChecks';

// TODO: reemplazar implementación mock por llamada al API cuando esté disponible.

let healthChecksState = [...MOCK_HEALTH_CHECKS];

export const healthCheckService = {
  /**
   * Obtiene la lista completa de Health Checks
   */
  async getHealthChecks() {
    return Promise.resolve([...healthChecksState]);
  },

  /**
   * Obtiene un Health Check por su ID
   */
  async getHealthCheckById(id) {
    const check = healthChecksState.find((c) => c.id === id);
    return Promise.resolve(check ? { ...check } : null);
  },

  /**
   * Crea un nuevo Health Check en el estado local
   */
  async createHealthCheck(newCheckData) {
    const existingIds = healthChecksState.map((c) => {
      const match = c.id && c.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNumber = maxId + 1;
    const newId = `HC-${String(nextNumber).padStart(3, '0')}`;

    const createdCheck = {
      id: newId,
      status: 'healthy',
      ...newCheckData,
    };
    healthChecksState.push(createdCheck);
    return Promise.resolve({ ...createdCheck });
  },

  /**
   * Actualiza un Health Check existente
   */
  async updateHealthCheck(id, updatedData) {
    const index = healthChecksState.findIndex((c) => c.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Health Check con ID ${id} no encontrado`));
    }
    healthChecksState[index] = {
      ...healthChecksState[index],
      ...updatedData,
    };
    return Promise.resolve({ ...healthChecksState[index] });
  },

  /**
   * Elimina un Health Check por ID
   */
  async deleteHealthCheck(id) {
    const initialLength = healthChecksState.length;
    healthChecksState = healthChecksState.filter((c) => c.id !== id);
    const success = healthChecksState.length < initialLength;
    return Promise.resolve(success);
  },
};
