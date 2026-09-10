import React, { useState } from 'react';

function CreateRecordModal({ isOpen, onClose, onRecordCreated }) {
  const [type, setType] = useState('single');
  const [domain, setDomain] = useState('');
  const [ttl, setTtl] = useState(300);
  const [healthCheck, setHealthCheck] = useState('');

  // Campos para Single
  const [singleIp, setSingleIp] = useState('');

  // Campos para Multi
  const [multiIps, setMultiIps] = useState('');

  // Campos para Weight
  const [weightItems, setWeightItems] = useState([
    { ip: '', weight: 70 },
    { ip: '', weight: 30 },
  ]);

  // Campos para Round-Trip
  const [roundTripItems, setRoundTripItems] = useState([
    { ip: '', location: 'us-east', latencyMs: 12 },
  ]);

  // Campos para Geo
  const [geoMappings, setGeoMappings] = useState([
    { country: 'US', ip: '' },
    { country: 'CR', ip: '' },
  ]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setType('single');
    setDomain('');
    setTtl(300);
    setHealthCheck('');
    setSingleIp('');
    setMultiIps('');
    setWeightItems([
      { ip: '', weight: 70 },
      { ip: '', weight: 30 },
    ]);
    setRoundTripItems([{ ip: '', location: 'us-east', latencyMs: 12 }]);
    setGeoMappings([
      { country: 'US', ip: '' },
      { country: 'CR', ip: '' },
    ]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Manipuladores de listas dinámicas
  const handleAddWeightItem = () => {
    setWeightItems([...weightItems, { ip: '', weight: 10 }]);
  };
  const handleRemoveWeightItem = (index) => {
    if (weightItems.length > 1) {
      setWeightItems(weightItems.filter((_, i) => i !== index));
    }
  };

  const handleAddRoundTripItem = () => {
    setRoundTripItems([...roundTripItems, { ip: '', location: '', latencyMs: 10 }]);
  };
  const handleRemoveRoundTripItem = (index) => {
    if (roundTripItems.length > 1) {
      setRoundTripItems(roundTripItems.filter((_, i) => i !== index));
    }
  };

  const handleAddGeoMapping = () => {
    setGeoMappings([...geoMappings, { country: '', ip: '' }]);
  };
  const handleRemoveGeoMapping = (index) => {
    if (geoMappings.length > 1) {
      setGeoMappings(geoMappings.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones comunes
    if (!domain.trim()) {
      setError('El nombre de dominio es obligatorio.');
      return;
    }
    if (!ttl || Number(ttl) <= 0) {
      setError('El valor TTL debe ser un número positivo.');
      return;
    }

    let value = {};
    let mainInfo = '';

    // Validaciones y estructuración por tipo
    if (type === 'single') {
      if (!singleIp.trim()) {
        setError('Debe ingresar una dirección IP para el registro Single.');
        return;
      }
      value = { ip: singleIp.trim() };
      mainInfo = singleIp.trim();
    } else if (type === 'multi') {
      const ips = multiIps
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
      if (ips.length === 0) {
        setError('Debe ingresar al menos una dirección IP (separadas por comas).');
        return;
      }
      value = { ips };
      mainInfo = `${ips.length} IPs (${ips.join(', ')})`;
    } else if (type === 'weight') {
      const validItems = weightItems.filter((item) => item.ip.trim());
      if (validItems.length === 0) {
        setError('Debe ingresar al menos un elemento IP/Peso válido.');
        return;
      }
      value = {
        items: validItems.map((item) => ({
          ip: item.ip.trim(),
          weight: Number(item.weight) || 0,
        })),
      };
      mainInfo = validItems
        .map((item) => `${item.ip.trim()} (${item.weight}%)`)
        .join(' | ');
    } else if (type === 'round-trip') {
      const validItems = roundTripItems.filter((item) => item.ip.trim());
      if (validItems.length === 0) {
        setError('Debe ingresar al menos una IP/servidor para Round-Trip.');
        return;
      }
      value = {
        items: validItems.map((item) => ({
          ip: item.ip.trim(),
          location: item.location.trim() || 'default',
          latencyMs: Number(item.latencyMs) || 0,
        })),
      };
      mainInfo = validItems
        .map((item) => `${item.ip.trim()} (Lat: ${item.latencyMs || 0}ms)`)
        .join(' | ');
    } else if (type === 'geo') {
      const validMappings = geoMappings.filter(
        (m) => m.country.trim() && m.ip.trim()
      );
      if (validMappings.length === 0) {
        setError('Debe ingresar al menos un mapeo País-IP válido.');
        return;
      }
      value = {
        mappings: validMappings.map((m) => ({
          country: m.country.trim().toUpperCase(),
          ip: m.ip.trim(),
        })),
      };
      mainInfo = validMappings
        .map((m) => `${m.country.trim().toUpperCase()}: ${m.ip.trim()}`)
        .join(' | ');
    }

    const newRecordData = {
      domain: domain.trim(),
      type,
      ttl: Number(ttl),
      value,
      mainInfo,
      status: 'healthy',
      healthCheck: healthCheck.trim() || 'Ninguno',
    };

    setIsSubmitting(true);
    try {
      await onRecordCreated(newRecordData);
      resetForm();
    } catch (err) {
      setError('Error al crear el registro: ' + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">➕ Agregar Nuevo Registro DNS</h3>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {error && <div className="form-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Tipo de Registro DNS *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="form-select"
            >
              <option value="single">Single (IP única)</option>
              <option value="multi">Multi (Round-robin IPs)</option>
              <option value="weight">Weight (Balanceo por peso)</option>
              <option value="round-trip">Round-Trip (Menor latencia)</option>
              <option value="geo">Geo (Ubicación geográfica)</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Nombre de Dominio *</label>
              <input
                type="text"
                placeholder="ej. api.empresa.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group width-120">
              <label className="form-label">TTL (seg) *</label>
              <input
                type="number"
                min="1"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Health Check (Opcional)</label>
            <input
              type="text"
              placeholder="ej. TCP:80 o HTTP GET /health:8080"
              value={healthCheck}
              onChange={(e) => setHealthCheck(e.target.value)}
              className="form-input"
            />
          </div>

          {/* Campos específicos por Tipo */}
          <div className="type-fields-section">
            <h4 className="fields-section-title">
              Configuración Específica: <span className="highlight">{type.toUpperCase()}</span>
            </h4>

            {type === 'single' && (
              <div className="form-group">
                <label className="form-label">Dirección IP *</label>
                <input
                  type="text"
                  placeholder="ej. 192.168.1.50"
                  value={singleIp}
                  onChange={(e) => setSingleIp(e.target.value)}
                  className="form-input"
                />
              </div>
            )}

            {type === 'multi' && (
              <div className="form-group">
                <label className="form-label">Lista de IPs (separadas por coma) *</label>
                <input
                  type="text"
                  placeholder="ej. 10.0.0.1, 10.0.0.2, 10.0.0.3"
                  value={multiIps}
                  onChange={(e) => setMultiIps(e.target.value)}
                  className="form-input"
                />
                <span className="form-hint">Ingrese varias direcciones IP divididas por comas.</span>
              </div>
            )}

            {type === 'weight' && (
              <div className="dynamic-list-group">
                <label className="form-label">Servidores e Intensidad / Peso *</label>
                {weightItems.map((item, index) => (
                  <div key={index} className="dynamic-row">
                    <input
                      type="text"
                      placeholder="IP ej. 172.16.0.1"
                      value={item.ip}
                      onChange={(e) => {
                        const newItems = [...weightItems];
                        newItems[index].ip = e.target.value;
                        setWeightItems(newItems);
                      }}
                      className="form-input flex-2"
                    />
                    <input
                      type="number"
                      placeholder="Peso %"
                      min="1"
                      max="100"
                      value={item.weight}
                      onChange={(e) => {
                        const newItems = [...weightItems];
                        newItems[index].weight = e.target.value;
                        setWeightItems(newItems);
                      }}
                      className="form-input flex-1"
                    />
                    {weightItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveWeightItem(index)}
                        className="btn-remove-row"
                        title="Eliminar fila"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddWeightItem}
                  className="btn-add-row"
                >
                  ➕ Agregar Servidor / Peso
                </button>
              </div>
            )}

            {type === 'round-trip' && (
              <div className="dynamic-list-group">
                <label className="form-label">Servidores, Ubicación y Latencia *</label>
                {roundTripItems.map((item, index) => (
                  <div key={index} className="dynamic-row">
                    <input
                      type="text"
                      placeholder="IP"
                      value={item.ip}
                      onChange={(e) => {
                        const newItems = [...roundTripItems];
                        newItems[index].ip = e.target.value;
                        setRoundTripItems(newItems);
                      }}
                      className="form-input flex-2"
                    />
                    <input
                      type="text"
                      placeholder="Ubicación (ej. us-east)"
                      value={item.location}
                      onChange={(e) => {
                        const newItems = [...roundTripItems];
                        newItems[index].location = e.target.value;
                        setRoundTripItems(newItems);
                      }}
                      className="form-input flex-2"
                    />
                    <input
                      type="number"
                      placeholder="Lat ms"
                      min="1"
                      value={item.latencyMs}
                      onChange={(e) => {
                        const newItems = [...roundTripItems];
                        newItems[index].latencyMs = e.target.value;
                        setRoundTripItems(newItems);
                      }}
                      className="form-input flex-1"
                    />
                    {roundTripItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoundTripItem(index)}
                        className="btn-remove-row"
                        title="Eliminar fila"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddRoundTripItem}
                  className="btn-add-row"
                >
                  ➕ Agregar Servidor / Latencia
                </button>
              </div>
            )}

            {type === 'geo' && (
              <div className="dynamic-list-group">
                <label className="form-label">Mapeos de País a Dirección IP *</label>
                {geoMappings.map((item, index) => (
                  <div key={index} className="dynamic-row">
                    <input
                      type="text"
                      placeholder="País (ej. US, CR, ES)"
                      value={item.country}
                      onChange={(e) => {
                        const newMappings = [...geoMappings];
                        newMappings[index].country = e.target.value;
                        setGeoMappings(newMappings);
                      }}
                      className="form-input flex-1"
                    />
                    <input
                      type="text"
                      placeholder="IP Asignada (ej. 203.0.113.10)"
                      value={item.ip}
                      onChange={(e) => {
                        const newMappings = [...geoMappings];
                        newMappings[index].ip = e.target.value;
                        setGeoMappings(newMappings);
                      }}
                      className="form-input flex-2"
                    />
                    {geoMappings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveGeoMapping(index)}
                        className="btn-remove-row"
                        title="Eliminar fila"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddGeoMapping}
                  className="btn-add-row"
                >
                  ➕ Agregar Mapeo País-IP
                </button>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRecordModal;
