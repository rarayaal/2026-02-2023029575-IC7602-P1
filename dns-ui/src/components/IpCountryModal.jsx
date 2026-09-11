import React, { useState, useEffect } from 'react';

function IpCountryModal({
  isOpen,
  onClose,
  onMappingCreated,
  onMappingUpdated,
  initialData = null,
}) {
  const isEditMode = Boolean(initialData && initialData.id);

  const [ipRange, setIpRange] = useState('');
  const [countryCode, setCountryCode] = useState('CR');
  const [countryName, setCountryName] = useState('Costa Rica');
  const [description, setDescription] = useState('');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setIpRange('');
    setCountryCode('CR');
    setCountryName('Costa Rica');
    setDescription('');
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setIpRange(initialData.ipRange || '');
        setCountryCode(initialData.countryCode || 'CR');
        setCountryName(initialData.countryName || '');
        setDescription(initialData.description || '');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!ipRange.trim()) {
      setError('El rango IP o notación CIDR es obligatorio.');
      return;
    }

    if (!countryCode.trim() || countryCode.trim().length < 2 || countryCode.trim().length > 3) {
      setError('El código de país debe ser de 2 o 3 letras (ej. CR, US, ES).');
      return;
    }

    if (!countryName.trim()) {
      setError('El nombre del país es obligatorio.');
      return;
    }

    const mappingData = {
      ipRange: ipRange.trim(),
      countryCode: countryCode.trim().toUpperCase(),
      countryName: countryName.trim(),
      description: description.trim() || 'Sin descripción',
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await onMappingUpdated(initialData.id, mappingData);
      } else {
        await onMappingCreated(mappingData);
      }
      resetForm();
    } catch (err) {
      setError(
        (isEditMode ? 'Error al actualizar el mapeo: ' : 'Error al crear el mapeo: ') +
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
              ? `✏️ Editar Mapeo IP-Country (${initialData.id})`
              : '➕ Agregar Nuevo Mapeo IP-to-Country'}
          </h3>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {error && <div className="form-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Rango IP / Notación CIDR *</label>
            <input
              type="text"
              placeholder="ej. 203.0.113.0/24 o 192.168.1.1 - 192.168.1.254"
              value={ipRange}
              onChange={(e) => setIpRange(e.target.value)}
              className="form-input"
            />
            <span className="form-hint">Puede especificar subred en notación CIDR o rango explícito.</span>
          </div>

          <div className="form-row">
            <div className="form-group width-120">
              <label className="form-label">Código (ISO) *</label>
              <input
                type="text"
                maxLength={3}
                placeholder="ej. CR"
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="form-input uppercase"
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Nombre del País *</label>
              <input
                type="text"
                placeholder="ej. Costa Rica"
                value={countryName}
                onChange={(e) => setCountryName(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción / Observaciones (Opcional)</label>
            <input
              type="text"
              placeholder="ej. Rango asignado a proveedores locales de LatAm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-input"
            />
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
                : 'Guardar Mapeo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default IpCountryModal;
