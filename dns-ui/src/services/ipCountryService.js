// Capa de servicio IP-to-Country conectada al DNS API Java (T-36)
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const ipCountryService = {
  /**
   * Obtiene la lista completa de mapeos IP-to-Country desde el DNS API Java
   */
  async getMappings() {
    const response = await fetch(`${API_BASE_URL}/api/ip-country`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: No se pudieron obtener los mapeos IP-to-Country`);
    }
    const data = await response.json();
    return data.map((item) => ({
      ...item,
      ipRange: item.ipRange || (item.ipStart === item.ipEnd ? item.ipStart : `${item.ipStart} - ${item.ipEnd}`),
      description: item.description || (item.city ? `Ciudad: ${item.city}` : 'Rango de subred asignado'),
    }));
  },

  /**
   * Obtiene un mapeo por su ID
   */
  async getMappingById(id) {
    const response = await fetch(`${API_BASE_URL}/api/ip-country/${id}`);
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Error ${response.status}: No se pudo obtener el mapeo IP-to-Country`);
    }
    const item = await response.json();
    return {
      ...item,
      ipRange: item.ipRange || (item.ipStart === item.ipEnd ? item.ipStart : `${item.ipStart} - ${item.ipEnd}`),
      description: item.description || (item.city ? `Ciudad: ${item.city}` : 'Rango de subred asignado'),
    };
  },

  /**
   * Crea un nuevo mapeo IP-to-Country enviando el payload al backend Java
   */
  async createMapping(newMappingData) {
    const payload = formatIpRangePayload(newMappingData);

    const response = await fetch(`${API_BASE_URL}/api/ip-country`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo crear el mapeo IP-to-Country`);
    }

    const created = await response.json();
    return {
      ...created,
      ipRange: created.ipRange || (created.ipStart === created.ipEnd ? created.ipStart : `${created.ipStart} - ${created.ipEnd}`),
      description: newMappingData.description || 'Rango de subred asignado',
    };
  },

  /**
   * Actualiza un mapeo IP-to-Country existente
   */
  async updateMapping(id, updatedData) {
    const payload = formatIpRangePayload(updatedData);

    const response = await fetch(`${API_BASE_URL}/api/ip-country/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Error ${response.status}: No se pudo actualizar el mapeo IP-to-Country`);
    }

    const updated = await response.json();
    return {
      ...updated,
      ipRange: updated.ipRange || (updated.ipStart === updated.ipEnd ? updated.ipStart : `${updated.ipStart} - ${updated.ipEnd}`),
      description: updatedData.description || 'Rango de subred asignado',
    };
  },

  /**
   * Elimina un mapeo por ID
   */
  async deleteMapping(id) {
    const response = await fetch(`${API_BASE_URL}/api/ip-country/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 204) {
      throw new Error(`Error ${response.status}: No se pudo eliminar el mapeo IP-to-Country`);
    }

    return true;
  },

  /**
   * Realiza una búsqueda geográfica por IP en el backend real Java
   */
  async lookupIp(ip) {
    const response = await fetch(`${API_BASE_URL}/api/ip-country/lookup?ip=${encodeURIComponent(ip)}`);
    if (!response.ok) {
      throw new Error(`Error ${response.status}: Error al realizar la búsqueda de IP`);
    }
    return await response.json();
  },
};

/**
 * Helper para estructurar los campos que acepta IpCountryController.java
 */
function formatIpRangePayload(data) {
  const rawRange = (data.ipRange || '').trim();
  const payload = {
    countryCode: data.countryCode ? data.countryCode.trim().toUpperCase() : '',
    countryName: data.countryName ? data.countryName.trim() : '',
    city: data.city || undefined,
    latitude: data.latitude !== undefined ? Number(data.latitude) : undefined,
    longitude: data.longitude !== undefined ? Number(data.longitude) : undefined,
  };

  if (rawRange.includes('/')) {
    payload.cidr = rawRange;
  } else if (rawRange.includes('-')) {
    const parts = rawRange.split('-').map((s) => s.trim());
    payload.ipStart = parts[0];
    payload.ipEnd = parts[1];
  } else {
    payload.ipStart = rawRange;
    payload.ipEnd = rawRange;
  }

  return payload;
}

