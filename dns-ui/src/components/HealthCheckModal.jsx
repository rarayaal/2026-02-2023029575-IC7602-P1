import React, { useState, useEffect } from 'react';

function HealthCheckModal({
  isOpen,
  onClose,
  onCheckCreated,
  onCheckUpdated,
  initialData = null,
}) {
  const isEditMode = Boolean(initialData && initialData.id);

  const [name, setName] = useState('');
  const [type, setType] = useState('HTTP');
  const [port, setPort] = useState(8080);
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/health');
  const [intervalSec, setIntervalSec] = useState(30);
  const [timeoutSec, setTimeoutSec] = useState(5);
  const [associatedRecord, setAssociatedRecord] = useState('');
  const [status, setStatus] = useState('healthy');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setType('HTTP');
    setPort(8080);
    setMethod('GET');
    setPath('/health');
    setIntervalSec(30);
    setTimeoutSec(5);
    setAssociatedRecord('');
    setStatus('healthy');
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        setType(initialData.type || 'HTTP');
        setPort(initialData.port || 80);
        setMethod(initialData.method || 'GET');
        setPath(initialData.path || '/health');
        setIntervalSec(initialData.intervalSec || 30);
        setTimeoutSec(initialData.timeoutSec || 5);
        setAssociatedRecord(initialData.associatedRecord || '');
        setStatus(initialData.status || 'healthy');
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

    if (!name.trim()) {
      setError('El nombre del Health Check es obligatorio.');
      return;
    }

    if (!port || Number(port) <= 0 || Number(port) > 65535) {
      setError('El puerto debe ser un número entero entre 1 y 65535.');
      return;
    }

    if (type === 'HTTP' && !path.trim()) {
      setError('La ruta o endpoint para HTTP es obligatoria (ej. /health).');
      return;
    }

    if (!intervalSec || Number(intervalSec) <= 0) {
      setError('El intervalo debe ser un número positivo en segundos.');
      return;
    }

    if (!timeoutSec || Number(timeoutSec) <= 0) {
      setError('El timeout debe ser un número positivo en segundos.');
      return;
    }

    const computedTarget =
      type === 'TCP'
        ? `TCP:${port}`
        : `HTTP ${method} ${path.trim().startsWith('/') ? path.trim() : '/' + path.trim()}:${port}`;

    const checkData = {
      name: name.trim(),
      type,
      port: Number(port),
      method: type === 'HTTP' ? method : undefined,
      path: type === 'HTTP' ? (path.trim().startsWith('/') ? path.trim() : '/' + path.trim()) : undefined,
      target: computedTarget,
      intervalSec: Number(intervalSec),
      timeoutSec: Number(timeoutSec),
      associatedRecord: associatedRecord.trim() || 'Ninguno',
      status,
    };

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        await onCheckUpdated(initialData.id, checkData);
      } else {
        await onCheckCreated(checkData);
      }
      resetForm();
    } catch (err) {
      setError(
        (isEditMode ? 'Error al actualizar el Health Check: ' : 'Error al crear el Health Check: ') +
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
              ? `✏️ Editar Health Check (${initialData.id})`
              : '➕ Agregar Nuevo Health Check'}
          </h3>
          <button className="modal-close-btn" onClick={handleClose}>
            ✕
          </button>
        </div>

        {error && <div className="form-alert error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Nombre del Check *</label>
            <input
              type="text"
              placeholder="ej. Check API Endpoint"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Tipo de Monitoreo *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="form-select"
              >
                <option value="HTTP">HTTP / HTTPS</option>
                <option value="TCP">TCP Port Check</option>
              </select>
            </div>

            <div className="form-group width-120">
              <label className="form-label">Puerto *</label>
              <input
                type="number"
                min="1"
                max="65535"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {type === 'HTTP' && (
            <div className="form-row">
              <div className="form-group width-120">
                <label className="form-label">Método</label>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="HEAD">HEAD</option>
                </select>
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Ruta / Endpoint *</label>
                <input
                  type="text"
                  placeholder="ej. /health o /status"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group flex-1">
              <label className="form-label">Intervalo (segundos) *</label>
              <input
                type="number"
                min="1"
                value={intervalSec}
                onChange={(e) => setIntervalSec(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group flex-1">
              <label className="form-label">Timeout (segundos) *</label>
              <input
                type="number"
                min="1"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Registro DNS Asociado (Opcional)</label>
            <input
              type="text"
              placeholder="ej. api.company.com (DNS-001)"
              value={associatedRecord}
              onChange={(e) => setAssociatedRecord(e.target.value)}
              className="form-input"
            />
          </div>

          {isEditMode && (
            <div className="form-group">
              <label className="form-label">Estado de la Prueba</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="form-select"
              >
                <option value="healthy">Healthy (Saludable)</option>
                <option value="unhealthy">Unhealthy (Fallo)</option>
                <option value="unknown">Unknown (Desconocido)</option>
              </select>
            </div>
          )}

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
                : 'Guardar Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HealthCheckModal;
