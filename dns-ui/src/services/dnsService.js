// Capa de servicio DNS conectada al DNS API Java (T-33 / T-34)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const dnsService = {
  /**
   * Obtiene la lista completa de registros DNS desde el DNS API Java
   */
  async getRecords(domain = '', type = '') {
    let url = `${API_BASE_URL}/api/records`;
    const params = new URLSearchParams();
    if (domain) params.append('domain', domain);
    if (type && type !== 'all') params.append('type', type);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron obtener los registros DNS`);
    }
    return await response.json();
  },

  /**
   * Obtiene un registro DNS por su ID
   */
  async getRecordById(id) {
    const response = await fetch(`${API_BASE_URL}/api/records/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Error ${response.status}: No se pudo obtener el registro DNS`);
    }
    return await response.json();
  },

  /**
   * Crea un nuevo registro DNS enviando el payload según el contrato
   */
  async createRecord(newRecordData) {
    const payload = {
      domain: newRecordData.domain ? newRecordData.domain.trim().toLowerCase() : '',
      type: newRecordData.type,
      ttl: Number(newRecordData.ttl || 300),
      isActive: newRecordData.isActive !== undefined ? Boolean(newRecordData.isActive) : true,
      targets: (newRecordData.targets || []).map((t) => ({
        ip: t.ip ? t.ip.trim() : '',
        weight: t.weight ? Number(t.weight) : undefined,
        country: t.country ? t.country.trim().toUpperCase() : undefined,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/api/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo crear el registro DNS`);
    }

    return await response.json();
  },

  /**
   * Actualiza un registro DNS existente
   */
  async updateRecord(id, updatedData) {
    const payload = {
      domain: updatedData.domain ? updatedData.domain.trim().toLowerCase() : '',
      type: updatedData.type,
      ttl: updatedData.ttl !== undefined ? Number(updatedData.ttl) : 300,
      isActive: updatedData.isActive !== undefined ? Boolean(updatedData.isActive) : true,
      targets: (updatedData.targets || []).map((t) => ({
        id: t.id,
        ip: t.ip ? t.ip.trim() : '',
        weight: t.weight ? Number(t.weight) : undefined,
        country: t.country ? t.country.trim().toUpperCase() : undefined,
      })),
    };

    const response = await fetch(`${API_BASE_URL}/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo actualizar el registro DNS`);
    }

    return await response.json();
  },

  /**
   * Elimina un registro DNS por ID
   */
  async deleteRecord(id) {
    const response = await fetch(`${API_BASE_URL}/api/records/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Error ${response.status}: No se pudo eliminar el registro DNS`);
    }

    return true;
  },
};

