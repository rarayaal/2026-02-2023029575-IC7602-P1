import { MOCK_DNS_RECORDS } from '../mocks/dnsRecords';

// Capa de abstracción del servicio DNS basada en datos MOCK (según contrato docs/contrato-dns-api.md)

let recordsState = JSON.parse(JSON.stringify(MOCK_DNS_RECORDS));

export const dnsService = {
  /**
   * Obtiene la lista completa de registros DNS
   */
  async getRecords() {
    return Promise.resolve(JSON.parse(JSON.stringify(recordsState)));
  },

  /**
   * Obtiene un registro DNS por su ID
   */
  async getRecordById(id) {
    const record = recordsState.find((r) => r.id === id);
    return Promise.resolve(record ? JSON.parse(JSON.stringify(record)) : null);
  },

  /**
   * Crea un nuevo registro DNS en el estado local según el contrato.
   * El payload no recibe 'id' ni 'status' de solo lectura.
   */
  async createRecord(newRecordData) {
    const existingIds = recordsState.map((r) => {
      const match = r.id && r.id.match(/\d+/);
      return match ? parseInt(match[0], 10) : 0;
    });
    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNumber = maxId + 1;
    const newId = `DNS-${String(nextNumber).padStart(3, '0')}`;

    // Asegurar que cada target tenga su ID local y estado inicial sin monitorear 'unknown' para lectura
    const formattedTargets = (newRecordData.targets || []).map((target, idx) => ({
      id: target.id || `t-${newId.toLowerCase()}-${idx + 1}`,
      status: target.status || 'unknown',
      healthCheckId: target.healthCheckId || null,
      ...target,
    }));

    const createdRecord = {
      id: newId,
      domain: newRecordData.domain,
      type: newRecordData.type,
      ttl: Number(newRecordData.ttl),
      isActive: newRecordData.isActive !== undefined ? newRecordData.isActive : true,
      targets: formattedTargets,
    };

    recordsState.push(createdRecord);
    return Promise.resolve(JSON.parse(JSON.stringify(createdRecord)));
  },

  /**
   * Actualiza un registro DNS existente
   */
  async updateRecord(id, updatedData) {
    const index = recordsState.findIndex((r) => r.id === id);
    if (index === -1) {
      return Promise.reject(new Error(`Registro con ID ${id} no encontrado`));
    }

    const currentRecord = recordsState[index];

    // Preservar estado e IDs de targets existentes si no se envían nuevos
    const updatedTargets = (updatedData.targets || []).map((target, idx) => {
      const existingTarget = (currentRecord.targets || [])[idx] || {};
      return {
        id: target.id || existingTarget.id || `t-${id.toLowerCase()}-${idx + 1}`,
        status: existingTarget.status || 'unknown',
        healthCheckId: existingTarget.healthCheckId || null,
        ...target,
      };
    });

    recordsState[index] = {
      ...currentRecord,
      domain: updatedData.domain !== undefined ? updatedData.domain : currentRecord.domain,
      type: updatedData.type !== undefined ? updatedData.type : currentRecord.type,
      ttl: updatedData.ttl !== undefined ? Number(updatedData.ttl) : currentRecord.ttl,
      isActive: updatedData.isActive !== undefined ? updatedData.isActive : currentRecord.isActive,
      targets: updatedTargets,
    };

    return Promise.resolve(JSON.parse(JSON.stringify(recordsState[index])));
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
