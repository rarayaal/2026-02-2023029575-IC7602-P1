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
  const [host, setHost] = useState('');
  const [port, setPort] = useState(8080);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [retries, setRetries] = useState(3);
  const [intervalSeconds, setIntervalSeconds] = useState(30);

  // Campos específicos HTTP
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/health');
  const [expectedStatusesStr, setExpectedStatusesStr] = useState('200, 204');
  const [useBasicAuth, setUseBasicAuth] = useState(false);
  const [basicAuthUsername, setBasicAuthUsername] = useState('');
  const [basicAuthPassword, setBasicAuthPassword] = useState('');

  const [associatedRecord, setAssociatedRecord] = useState('');
  const [status, setStatus] = useState('healthy');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setType('HTTP');
    setHost('');
    setPort(8080);
    setTimeoutMs(5000);
    setRetries(3);
    setIntervalSeconds(30);
    setMethod('GET');
    setPath('/health');
    setExpectedStatusesStr('200, 204');
    setUseBasicAuth(false);
    setBasicAuthUsername('');
    setBasicAuthPassword('');
    setAssociatedRecord('');
    setStatus('healthy');
    setError('');
  };

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name || '');
        const currentProto = initialData.protocol || initialData.type || 'HTTP';
        setType(currentProto);
        setHost(initialData.host || initialData.ip || '');
        setPort(initialData.port || (currentProto === 'TCP' ? 443 : 8080));
        setTimeoutMs(
          initialData.timeoutMs !== undefined
            ? initialData.timeoutMs
            : initialData.timeoutSec
            ? initialData.timeoutSec * 1000
            : 5000
        );
        setRetries(initialData.retries !== undefined ? initialData.retries : 3);
        setIntervalSeconds(
          initialData.intervalSeconds !== undefined
            ? initialData.intervalSeconds
            : initialData.intervalSec || 30
        );

        // HTTP prefill
        setMethod(initialData.method || 'GET');
        setPath(initialData.path || '/health');
        const statuses = Array.isArray(initialData.expectedStatuses)
          ? initialData.expectedStatuses.join(', ')
          : initialData.expectedStatuses
          ? String(initialData.expectedStatuses)
          : '200';
        setExpectedStatusesStr(statuses);

        if (initialData.basicAuth && typeof initialData.basicAuth === 'object') {
          setUseBasicAuth(true);
          setBasicAuthUsername(initialData.basicAuth.username || '');
          setBasicAuthPassword(initialData.basicAuth.password || '');
        } else {
          setUseBasicAuth(false);
          setBasicAuthUsername('');
          setBasicAuthPassword('');
        }

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

    if (!host.trim()) {
      setError('El Host / IP del servidor es obligatorio.');
      return;
    }

    if (!port || Number(port) <= 0 || Number(port) > 65535) {
      setError('El puerto debe ser un número entero entre 1 y 65535.');
      return;
    }

    if (!timeoutMs || Number(timeoutMs) <= 0) {
      setError('El timeout debe ser un número entero positivo en milisegundos (ej. 5000).');
      return;
    }

    if (retries === '' || Number(retries) < 0) {
      setError('Los reintentos (retries) deben ser un número entero mayor o igual a 0.');
      return;
    }

    if (!intervalSeconds || Number(intervalSeconds) <= 0) {
      setError('El intervalo debe ser un número entero positivo en segundos.');
      return;
    }

    let parsedExpectedStatuses = [200];
    if (type === 'HTTP') {
      if (!path.trim()) {
        setError('La ruta o endpoint para HTTP es obligatoria (ej. /health).');
        return;
      }

      const rawStatuses = expectedStatusesStr
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');

      parsedExpectedStatuses = rawStatuses.map(Number);

      if (
        rawStatuses.length === 0 ||
        parsedExpectedStatuses.some((code) => isNaN(code) || code < 100 || code > 599)
      ) {
        setError(
          'Los códigos esperados deben ser números de código HTTP válidos (100-599) separados por coma (ej. 200, 204).'
        );
        return;
      }

      if (useBasicAuth && !basicAuthUsername.trim()) {
        setError('El nombre de usuario para Basic Auth es obligatorio cuando la autenticación está activada.');
        return;
      }
    }

    const formattedPath = path.trim().startsWith('/') ? path.trim() : '/' + path.trim();
    const cleanHost = host.trim();
    const computedTarget =
      type === 'TCP'
        ? `TCP ${cleanHost}:${port}`
        : `HTTP ${method} ${cleanHost}:${port}${formattedPath}`;

    const checkData = {
      name: name.trim(),
      protocol: type,
      type: type,
      host: cleanHost,
      ip: cleanHost,
      port: Number(port),
      timeoutMs: Number(timeoutMs),
      retries: Number(retries),
      intervalSeconds: Number(intervalSeconds),
      method: type === 'HTTP' ? method : undefined,
      path: type === 'HTTP' ? formattedPath : undefined,
      expectedStatuses: type === 'HTTP' ? parsedExpectedStatuses : undefined,
      basicAuth:
        type === 'HTTP' && useBasicAuth
          ? {
              username: basicAuthUsername.trim(),
              password: basicAuthPassword || null,
            }
          : null,
      target: computedTarget,
      associatedRecord: associatedRecord.trim() || 'Ninguno',
      status,
      isEnabled: initialData && initialData.isEnabled !== undefined ? initialData.isEnabled : true,
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
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
                onChange={(e) => {
                  const newType = e.target.value;
                  setType(newType);
                  if (newType === 'TCP' && port === 8080) setPort(443);
                  if (newType === 'HTTP' && port === 443) setPort(8080);
                }}
                className="form-select"
              >
                <option value="HTTP">HTTP / HTTPS</option>
                <option value="TCP">TCP Port Check</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Host / IP *</label>
              <input
                type="text"
                placeholder="ej. 10.0.0.1 o api.company.com"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-row">
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

            <div className="form-group flex-1">
              <label className="form-label">Timeout (ms) *</label>
              <input
                type="number"
                min="1"
                placeholder="ej. 5000"
                value={timeoutMs}
                onChange={(e) => setTimeoutMs(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group width-120">
              <label className="form-label">Reintentos *</label>
              <input
                type="number"
                min="0"
                placeholder="ej. 3"
                value={retries}
                onChange={(e) => setRetries(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Intervalo (s) *</label>
              <input
                type="number"
                min="1"
                placeholder="ej. 30"
                value={intervalSeconds}
                onChange={(e) => setIntervalSeconds(e.target.value)}
                className="form-input"
              />
            </div>
          </div>

          {type === 'HTTP' && (
            <div className="type-fields-section">
              <div className="fields-section-title">
                ⚙️ Configuración Avanzada HTTP / Basic Auth
              </div>

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
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label className="form-label">Ruta / Path *</label>
                  <input
                    type="text"
                    placeholder="ej. /health o /status"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Códigos HTTP Esperados *</label>
                <input
                  type="text"
                  placeholder="ej. 200, 204"
                  value={expectedStatusesStr}
                  onChange={(e) => setExpectedStatusesStr(e.target.value)}
                  className="form-input"
                />
                <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.2rem', display: 'block' }}>
                  Lista de códigos aceptados separados por coma (ej. 200, 201, 204)
                </small>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>
                  <input
                    type="checkbox"
                    checked={useBasicAuth}
                    onChange={(e) => setUseBasicAuth(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  🔒 Activar Autenticación Basic Auth
                </label>
              </div>

              {useBasicAuth && (
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label className="form-label">Usuario (Username) *</label>
                    <input
                      type="text"
                      placeholder="ej. admin"
                      value={basicAuthUsername}
                      onChange={(e) => setBasicAuthUsername(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label className="form-label">Contraseña (Password)</label>
                    <input
                      type="password"
                      placeholder="ej. secreto (dejar vacío para null)"
                      value={basicAuthPassword}
                      onChange={(e) => setBasicAuthPassword(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

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
              <label className="form-label">Estado del Check</label>
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
