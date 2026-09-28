import React, { useState, useEffect } from 'react';

function CreateRecordModal({
  isOpen,
  onClose,
  onRecordCreated,
  onRecordUpdated,
  initialData = null,
}) {
  const isEditMode = Boolean(initialData && initialData.id);

  const [type, setType] = useState('single');
  const [domain, setDomain] = useState('');
  const [ttl, setTtl] = useState(300);

  // Campos para Single
  const [singleIp, setSingleIp] = useState('');

  // Campos para Multi
  const [multiIps, setMultiIps] = useState('');

  // Campos para Weight
  const [weightItems, setWeightItems] = useState([
    { ip: '', weight: 70 },
    { ip: '', weight: 30 },
  ]);

  // Campos para Round-Trip (En creación/edición solo se ingresan las IPs de destino)
  const [roundTripItems, setRoundTripItems] = useState([
    { ip: '' },
  ]);

  // Campos para Geo (País IP)
  const [geoMappings, setGeoMappings] = useState([
    { country: 'US', ip: '' },
    { country: 'CR', ip: '' },
  ]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setType('single');
    setDomain('');
    setTtl(300);
    setSingleIp('');
    setMultiIps('');
    setWeightItems([
      { ip: '', weight: 70 },
      { ip: '', weight: 30 },
    ]);
    setRoundTripItems([{ ip: '' }]);
    setGeoMappings([
      { country: 'US', ip: '' },
      { country: 'CR', ip: '' },
    ]);
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        // Cargar datos existentes para Modo Edición usando targets según contrato
        setType(initialData.type || 'single');
        setDomain(initialData.domain || '');
        setTtl(initialData.ttl || 300);

        const targets = Array.isArray(initialData.targets) ? initialData.targets : [];

        if (initialData.type === 'single') {
          setSingleIp(targets[0]?.ip || '');
        } else if (initialData.type === 'multi') {
          setMultiIps(targets.map((t) => t.ip).filter(Boolean).join(', '));
        } else if (initialData.type === 'weight') {
          setWeightItems(
            targets.length > 0
              ? targets.map((t) => ({
                  ip: t.ip || '',
                  weight: t.weight !== undefined ? t.weight : 50,
                }))
              : [{ ip: '', weight: 70 }, { ip: '', weight: 30 }]
          );
        } else if (initialData.type === 'round-trip') {
          setRoundTripItems(
            targets.length > 0
              ? targets.map((t) => ({
                  ip: t.ip || '',
                }))
              : [{ ip: '' }]
          );
        } else if (initialData.type === 'geo') {
          setGeoMappings(
            targets.length > 0
              ? targets.map((t) => ({ country: t.country || '', ip: t.ip || '' }))
              : [
                  { country: 'US', ip: '' },
                  { country: 'CR', ip: '' },
                ]
          );
        }
        setError('');
      } else {
        resetForm();
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

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
    setRoundTripItems([...roundTripItems, { ip: '' }]);
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

    if (!domain.trim()) {
      setError('El nombre de dominio es obligatorio.');
      return;
    }
    if (!ttl || Number(ttl) <= 0) {
      setError('El valor TTL debe ser un número positivo.');
      return;
    }

    let targets = [];

    if (type === 'single') {
      if (!singleIp.trim()) {
        setError('Debe ingresar una dirección IP para el registro Single.');
        return;
      }
      targets = [{ ip: singleIp.trim() }];
    } else if (type === 'multi') {
      const ips = multiIps
        .split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip.length > 0);
      if (ips.length === 0) {
        setError('Debe ingresar al menos una dirección IP (separadas por comas).');
        return;
      }
      targets = ips.map((ip) => ({ ip }));
    } else if (type === 'weight') {
      const validItems = weightItems.filter((item) => item.ip.trim());
      if (validItems.length === 0) {
        setError('Debe ingresar al menos una IP con su peso correspondiente.');
        return;
      }
      targets = validItems.map((item) => ({
        ip: item.ip.trim(),
        weight: Number(item.weight) || 0,
      }));
    } else if (type === 'round-trip') {
      const validItems = roundTripItems.filter((item) => item.ip.trim());
      if (validItems.length === 0) {
        setError('Debe ingresar al menos una IP para Round-Trip.');
        return;
      }
      // Nota: En round-trip no se envían ni declaran métricas de latencia al crear/editar
      targets = validItems.map((item) => ({
        ip: item.ip.trim(),
      }));
    } else if (type === 'geo') {
      const validMappings = geoMappings.filter(
        (m) => m.country.trim() && m.ip.trim()
      );
      if (validMappings.length === 0) {
        setError('Debe ingresar al menos un mapeo País-IP válido.');
        return;
      }
      targets = validMappings.map((m) => ({
        ip: m.ip.trim(),
        country: m.country.trim().toUpperCase(),
      }));
    }

    // Payload de envío al contrato: domain, type, ttl, targets (SIN id, status, mainInfo ni healthCheck)
    const recordData = {
      domain: domain.trim(),
      type,
      ttl: Number(ttl),
      targets,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await onRecordUpdated(initialData.id, recordData);
      } else {
        await onRecordCreated(recordData);
      }
      resetForm();
    } catch (err) {
      setError(
        (isEditMode ? 'Error al actualizar el registro: ' : 'Error al crear el registro: ') +
          (err.message || err)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {isEditMode
              ? `Editar Registro DNS (${initialData.id})`
              : 'Agregar Nuevo Registro DNS'}
          </h3>
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

          {/* Campos específicos por Tipo (configuración de targets) */}
          <div className="type-fields-section">
            <h4 className="fields-section-title">
              Configuración de Targets: <span className="highlight">{type.toUpperCase()}</span>
            </h4>

            {type === 'single' && (
              <div className="form-group">
                <label className="form-label">Dirección IP de Target *</label>
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
                <label className="form-label">Lista de IPs Target (separadas por coma) *</label>
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
                <label className="form-label">Targets IP y Peso (%) *</label>
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
                      placeholder="Peso"
                      min="1"
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
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddWeightItem}
                  className="btn-add-row"
                >
                  Agregar Target / Peso
                </button>
              </div>
            )}

            {type === 'round-trip' && (
              <div className="dynamic-list-group">
                <label className="form-label">Direcciones IP Target *</label>
                {roundTripItems.map((item, index) => (
                  <div key={index} className="dynamic-row">
                    <input
                      type="text"
                      placeholder="IP ej. 198.51.100.4"
                      value={item.ip}
                      onChange={(e) => {
                        const newItems = [...roundTripItems];
                        newItems[index].ip = e.target.value;
                        setRoundTripItems(newItems);
                      }}
                      className="form-input flex-2"
                    />
                    {roundTripItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRoundTripItem(index)}
                        className="btn-remove-row"
                        title="Eliminar fila"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddRoundTripItem}
                  className="btn-add-row"
                >
                  Agregar Target IP
                </button>
                <span className="form-hint" style={{ marginTop: '0.5rem', display: 'block' }}>
                  Las mediciones de RTT (latencia en ms) son calculadas automáticamente por los Health Checkers.
                </span>
              </div>
            )}

            {type === 'geo' && (
              <div className="dynamic-list-group">
                <label className="form-label">Targets por Ubicación Geográfica (País - IP) *</label>
                {geoMappings.map((item, index) => (
                  <div key={index} className="dynamic-row">
                    <input
                      type="text"
                      placeholder="País ISO (ej. US, CR)"
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
                        Eliminar
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={handleAddGeoMapping}
                  className="btn-add-row"
                >
                  Agregar Target País-IP
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
              {isSubmitting
                ? 'Guardando...'
                : isEditMode
                ? 'Guardar Cambios'
                : 'Guardar Registro'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateRecordModal;
