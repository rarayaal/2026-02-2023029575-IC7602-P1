import { MOCK_IP_COUNTRY_MAPPINGS } from '../mocks/ipCountryMappings';

// TODO: reemplazar implementación mock por llamada al API cuando esté disponible.

let mappingsState = [...MOCK_IP_COUNTRY_MAPPINGS];

export const ipCountryService = {
  /**
   * Obtiene la lista completa de mapeos IP-to-Country
   */
  async getMappings() {
    return Promise.resolve([...mappingsState]);
  },

  /**
   * Obtiene un mapeo por su ID
   */
  async getMappingById(id) {
    const mapping = mappingsState.find((m) => m.id === id);
    return Promise.resolve(mapping ? { ...mapping } : null);
  },

  /**
   * Crea un nuevo mapeo IP-to-Country en el estado local
   */
  async createMapping(newMappingData) {
    const existingIds = mappingsState.map((m) => {
      const match = m.id && m.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNumber = maxId + 1;
    const newId = `IPC-${String(nextNumber).padStart(3, '0')}`;

    const createdMapping = {
      id: newId,
      ...newMappingData,
    };
    mappingsState.push(createdMapping);
    return Promise.resolve({ ...createdMapping });
  },

  /**
   * Actualiza un mapeo IP-to-Country existente
   */
  async updateMapping(id, updatedData) {
    const index = mappingsState.findIndex((m) => m.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Mapeo con ID ${id} no encontrado`));
    }
    mappingsState[index] = {
      ...mappingsState[index],
      ...updatedData,
    };
    return Promise.resolve({ ...mappingsState[index] });
  },

  /**
   * Elimina un mapeo por ID
   */
  async deleteMapping(id) {
    const initialLength = mappingsState.length;
    mappingsState = mappingsState.filter((m) => m.id !== id);
    const success = mappingsState.length < initialLength;
    return Promise.resolve(success);
  },
};
