import { MOCK_DNS_RECORDS } from '../mocks/dnsRecords';

// TODO: reemplazar implementación mock por llamada al DNS API cuando esté disponible.

let recordsState = [...MOCK_DNS_RECORDS];

export const dnsService = {
  /**
   * Obtiene la lista completa de registros DNS
   */
  async getRecords() {
    return Promise.resolve([...recordsState]);
  },

  /**
   * Obtiene un registro DNS por su ID
   */
  async getRecordById(id) {
    const record = recordsState.find((r) => r.id === id);
    return Promise.resolve(record ? { ...record } : null);
  },

  /**
   * Crea un nuevo registro DNS en el estado local
   */
  async createRecord(newRecordData) {
    const newId = `DNS-${String(recordsState.length + 1).padStart(3, '0')}`;
    const createdRecord = {
      id: newId,
      status: 'healthy',
      healthCheck: 'Ninguno',
      ...newRecordData,
    };
    recordsState.push(createdRecord);
    return Promise.resolve({ ...createdRecord });
  },

  /**
   * Actualiza un registro DNS existente
   */
  async updateRecord(id, updatedData) {
    const index = recordsState.findIndex((r) => r.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Registro con ID ${id} no encontrado`));
    }
    recordsState[index] = {
      ...recordsState[index],
      ...updatedData,
    };
    return Promise.resolve({ ...recordsState[index] });
  },

  /**
   * Elimina un registro DNS por ID
   */
  async deleteRecord(id) {
    const initialLength = recordsState.length;
    recordsState = recordsState.filter((r) => r.id !== id);
    const success = recordsState.length < initialLength;
    return Promise.resolve(success);
  },
};
