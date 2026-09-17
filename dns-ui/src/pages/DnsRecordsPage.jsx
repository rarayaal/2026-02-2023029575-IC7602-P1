import React, { useState, useEffect, useMemo } from 'react';
import { dnsService } from '../services/dnsService';
import { healthCheckService } from '../services/healthCheckService';
import CreateRecordModal from '../components/CreateRecordModal';

// Función auxiliar para construir mainInfo dinámicamente según el contrato oficial
export const getMainInfo = (record) => {
  const targets = Array.isArray(record?.targets) ? record.targets : [];
  if (targets.length === 0) return 'Sin targets configurados';

  switch (record.type) {
    case 'single':
      return targets[0]?.ip || 'N/A';
    case 'multi': {
      const ips = targets.map((t) => t.ip).filter(Boolean);
      return `${ips.length} IPs (${ips.join(', ')})`;
    }
    case 'weight':
      return targets
        .map((t) => `${t.ip} (${t.weight ?? 0}%)`)
        .join(' | ');
    case 'round-trip':
      return targets
        .map((t) => (t.avgRttMs !== undefined ? `${t.ip} (Lat: ${t.avgRttMs}ms)` : t.ip))
        .join(' | ');
    case 'geo':
      return targets
        .map((t) => `${t.country || 'GLOBAL'}: ${t.ip}`)
        .join(' | ');
    default:
      return targets.map((t) => t.ip).join(', ');
  }
};

// Función auxiliar para calcular el estado global del registro desde los targets del Health Checker
export const getOverallStatus = (record) => {
  const targets = Array.isArray(record?.targets) ? record.targets : [];
  if (targets.length === 0) return 'unknown';

  const statuses = targets.map((t) => t.status || 'unknown');
  if (statuses.some((s) => s === 'unhealthy')) return 'unhealthy';
  if (statuses.some((s) => s === 'healthy')) return 'healthy';
  return 'unknown';
};

// Función auxiliar para construir el texto de presentación de Health Check dinámicamente
export const getHealthCheckInfo = (record, healthChecksList = []) => {
  const targets = Array.isArray(record?.targets) ? record.targets : [];
  const targetIds = targets.map((t) => t.id).filter(Boolean);
  const healthCheckIds = targets.map((t) => t.healthCheckId).filter(Boolean);

  const match = healthChecksList.find(
    (hc) =>
      healthCheckIds.includes(hc.id) ||
      targetIds.includes(hc.targetId) ||
      (hc.associatedRecord &&
        (hc.associatedRecord.includes(record.domain) || hc.associatedRecord.includes(record.id)))
  );

  if (match) {
    if (match.target) return match.target;
    if (match.protocol === 'TCP') return `TCP:${match.port}`;
    if (match.protocol === 'HTTP') return `HTTP GET ${match.path || '/'}:${match.port}`;
  }
  return 'Ninguno';
};

function DnsRecordsPage() {
  const [records, setRecords] = useState([]);
  const [healthChecks, setHealthChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchRecords = async () => {
    try {
      const [recordsData, hcData] = await Promise.all([
        dnsService.getRecords(),
        healthCheckService.getHealthChecks().catch(() => []),
      ]);
      setRecords(recordsData);
      setHealthChecks(hcData);
    } catch (err) {
      console.error('Error cargando registros DNS:', err);
      setFeedback({ type: 'error', text: 'Error cargando los registros DNS' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRecordCreated = async (newRecordData) => {
    const created = await dnsService.createRecord(newRecordData);
    await fetchRecords();
    setIsModalOpen(false);
    setFeedback({
      type: 'success',
      text: `Registro DNS (${created.domain} - ${created.id}) creado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleRecordUpdated = async (id, updatedData) => {
    const updated = await dnsService.updateRecord(id, updatedData);
    await fetchRecords();
    setEditingRecord(null);
    setFeedback({
      type: 'success',
      text: `Registro DNS (${updated.domain} - ${updated.id}) actualizado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleRecordDeleted = async (recordToDelete) => {
    if (!recordToDelete || !recordToDelete.id) return;
    setIsDeleting(true);
    try {
      const success = await dnsService.deleteRecord(recordToDelete.id);
      if (success) {
        await fetchRecords();
        setFeedback({
          type: 'success',
          text: `Registro DNS (${recordToDelete.domain} - ${recordToDelete.id}) eliminado exitosamente.`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `No se pudo eliminar el registro DNS con ID ${recordToDelete.id}.`,
        });
      }
    } catch (err) {
      console.error('Error al eliminar el registro DNS:', err);
      setFeedback({
        type: 'error',
        text: `Error al eliminar el registro: ${err.message || err}`,
      });
    } finally {
      setIsDeleting(false);
      setDeletingRecord(null);
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const mainInfoText = getMainInfo(record).toLowerCase();
      const matchesSearch =
        record.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
        mainInfoText.includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || record.type === typeFilter;
      const status = getOverallStatus(record);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [records, searchTerm, typeFilter, statusFilter]);

  return (
    <div className="records-page-container">
      <header className="page-header">
        <div>
          <h2 className="page-title">Gestión de Registros DNS</h2>
          <p className="page-subtitle">Listado completo de registros y su estado de resolución</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ Agregar registro
        </button>
      </header>

      {feedback && (
        <div className={`feedback-toast ${feedback.type}`}>
          <span>{feedback.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{feedback.text}</span>
          <button
            className="toast-close"
            onClick={() => setFeedback(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Buscar por dominio o IP/info..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filters-group">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los Tipos</option>
            <option value="single">Single</option>
            <option value="multi">Multi</option>
            <option value="weight">Weight</option>
            <option value="round-trip">Round-Trip</option>
            <option value="geo">Geo</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">Todos los Estados</option>
            <option value="healthy">Healthy</option>
            <option value="unhealthy">Unhealthy</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* Tabla de Registros */}
      <div className="table-responsive">
        <table className="records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Dominio</th>
              <th>Tipo</th>
              <th>IP / Información Principal</th>
              <th>Estado</th>
              <th>Health Check</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  Cargando registros DNS desde el servicio mock...
                </td>
              </tr>
            ) : filteredRecords.length > 0 ? (
              filteredRecords.map((record) => {
                const mainInfo = getMainInfo(record);
                const status = getOverallStatus(record);
                const healthCheckText = getHealthCheckInfo(record, healthChecks);

                return (
                  <tr key={record.id}>
                    <td className="font-mono text-muted">{record.id}</td>
                    <td className="font-semibold">{record.domain}</td>
                    <td>
                      <span className={`type-badge ${record.type}`}>
                        {record.type}
                      </span>
                    </td>
                    <td className="main-info-cell">{mainInfo}</td>
                    <td>
                      <span className={`status-badge ${status}`}>
                        <span className="status-dot-sm"></span>
                        {status}
                      </span>
                    </td>
                    <td className="text-muted">{healthCheckText}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="btn-icon view"
                          title="Ver detalle del registro"
                          onClick={() => setViewingRecord(record)}
                        >
                          👁️
                        </button>
                        <button
                          className="btn-icon edit"
                          title="Editar Registro"
                          onClick={() => setEditingRecord(record)}
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon delete"
                          title="Eliminar Registro"
                          onClick={() => setDeletingRecord(record)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-table-cell">
                  No se encontraron registros DNS con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación / Edición */}
      <CreateRecordModal
        isOpen={isModalOpen || Boolean(editingRecord)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingRecord(null);
        }}
        onRecordCreated={handleRecordCreated}
        onRecordUpdated={handleRecordUpdated}
        initialData={editingRecord}
      />

      {/* Modal de Visualización Detallada (Boton Ojo 👁️) */}
      {viewingRecord && (
        <div className="modal-overlay" onClick={() => setViewingRecord(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <h3 className="modal-title">👁️ Detalle del Registro DNS ({viewingRecord.id})</h3>
              <button className="modal-close-btn" onClick={() => setViewingRecord(null)}>
                ✕
              </button>
            </div>

            <div style={{ margin: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-dark)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Dominio:</span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--text-main)' }}>{viewingRecord.domain}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Tipo:</span>
                  <span className={`type-badge ${viewingRecord.type}`}>{viewingRecord.type}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>TTL (segundos):</span>
                  <span className="font-mono">{viewingRecord.ttl}s</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Estado Global:</span>
                  <span className={`status-badge ${getOverallStatus(viewingRecord)}`}>
                    <span className="status-dot-sm"></span>
                    {getOverallStatus(viewingRecord)}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-main)' }}>Targets Configurados ({viewingRecord.targets?.length || 0}):</h4>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
                  <table className="records-table" style={{ margin: 0, fontSize: '0.85rem' }}>
                    <thead>
                      <tr>
                        <th>Target ID</th>
                        <th>IP Target</th>
                        {viewingRecord.type === 'weight' && <th>Peso %</th>}
                        {viewingRecord.type === 'geo' && <th>País ISO</th>}
                        {viewingRecord.type === 'round-trip' && <th>Latencia (RTT)</th>}
                        <th>Estado Target</th>
                        <th>Health Check ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(viewingRecord.targets || []).map((t, idx) => (
                        <tr key={t.id || idx}>
                          <td className="font-mono text-muted">{t.id || `t-${idx+1}`}</td>
                          <td className="font-mono font-semibold">{t.ip}</td>
                          {viewingRecord.type === 'weight' && <td className="font-mono">{t.weight}%</td>}
                          {viewingRecord.type === 'geo' && <td><span className="type-badge geo">{t.country}</span></td>}
                          {viewingRecord.type === 'round-trip' && (
                            <td className="font-mono text-muted">
                              {t.avgRttMs !== undefined ? `${t.avgRttMs}ms (Min: ${t.minRttMs}ms)` : 'Sin mediciones'}
                            </td>
                          )}
                          <td>
                            <span className={`status-badge ${t.status || 'unknown'}`}>
                              <span className="status-dot-sm"></span>
                              {t.status || 'unknown'}
                            </span>
                          </td>
                          <td className="font-mono text-muted">{t.healthCheckId || 'Ninguno'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Payload JSON (Contrato DNS API):</h4>
                <pre style={{ background: '#090d16', padding: '0.75rem', borderRadius: '0.5rem', fontSize: '0.8rem', color: '#38bdf8', overflowX: 'auto', border: '1px solid var(--border-color)' }}>
                  {JSON.stringify(viewingRecord, null, 2)}
                </pre>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setViewingRecord(null)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Eliminación (T-34) */}
      {deletingRecord && (
        <div className="modal-overlay" onClick={() => setDeletingRecord(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Confirmar Eliminación</h3>
              <button className="modal-close-btn" onClick={() => setDeletingRecord(null)}>
                ✕
              </button>
            </div>

            <div style={{ margin: '1rem 0', lineHeight: 1.6 }}>
              <p>¿Está seguro de que desea eliminar el siguiente registro DNS?</p>
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.75rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Dominio: {deletingRecord.domain}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {deletingRecord.id} | Tipo: {deletingRecord.type}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>IP / Información: {getMainInfo(deletingRecord)}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: '0.75rem' }}>
                Esta acción eliminará el registro local y no se puede deshacer.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingRecord(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleRecordDeleted(deletingRecord)}
                disabled={isDeleting}
                style={{
                  background: 'var(--danger)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.65rem 1.25rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DnsRecordsPage;
