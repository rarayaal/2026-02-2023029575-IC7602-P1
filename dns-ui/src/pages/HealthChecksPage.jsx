import React, { useState, useEffect, useMemo } from 'react';
import { healthCheckService } from '../services/healthCheckService';
import HealthCheckModal from '../components/HealthCheckModal';

function HealthChecksPage() {
  const [checks, setChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCheck, setEditingCheck] = useState(null);
  const [deletingCheck, setDeletingCheck] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchChecks = async () => {
    try {
      const data = await healthCheckService.getHealthChecks();
      setChecks(data);
    } catch (err) {
      console.error('Error cargando Health Checks:', err);
      setFeedback({ type: 'error', text: 'Error cargando los Health Checks' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecks();
  }, []);

  const handleCheckCreated = async (newCheckData) => {
    const created = await healthCheckService.createHealthCheck(newCheckData);
    await fetchChecks();
    setIsModalOpen(false);
    setFeedback({
      type: 'success',
      text: `Health Check (${created.name} - ${created.id}) creado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleCheckUpdated = async (id, updatedData) => {
    const updated = await healthCheckService.updateHealthCheck(id, updatedData);
    await fetchChecks();
    setEditingCheck(null);
    setFeedback({
      type: 'success',
      text: `Health Check (${updated.name} - ${updated.id}) actualizado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleCheckDeleted = async (checkToDelete) => {
    if (!checkToDelete || !checkToDelete.id) return;
    setIsDeleting(true);
    try {
      const success = await healthCheckService.deleteHealthCheck(checkToDelete.id);
      if (success) {
        await fetchChecks();
        setFeedback({
          type: 'success',
          text: `Health Check (${checkToDelete.name} - ${checkToDelete.id}) eliminado exitosamente.`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `No se pudo eliminar el Health Check con ID ${checkToDelete.id}.`,
        });
      }
    } catch (err) {
      console.error('Error al eliminar el Health Check:', err);
      setFeedback({
        type: 'error',
        text: `Error al eliminar el check: ${err.message || err}`,
      });
    } finally {
      setIsDeleting(false);
      setDeletingCheck(null);
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    }
  };

  const filteredChecks = useMemo(() => {
    return checks.filter((check) => {
      const matchesSearch =
        check.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
        check.associatedRecord.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || check.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || check.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [checks, searchTerm, typeFilter, statusFilter]);

  return (
    <div className="records-page-container">
      <header className="page-header">
        <div>
          <h2 className="page-title">Monitoreo de Health Checks</h2>
          <p className="page-subtitle">Configuración y estado en tiempo real de las pruebas TCP y HTTP</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ Agregar Health Check
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
            placeholder="Buscar por nombre, objetivo o registro..."
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
            <option value="HTTP">HTTP / HTTPS</option>
            <option value="TCP">TCP Port Check</option>
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

      {/* Tabla de Health Checks */}
      <div className="table-responsive">
        <table className="records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del Check</th>
              <th>Tipo</th>
              <th>Objetivo / Endpoint</th>
              <th>Intervalo / Timeout</th>
              <th>Estado</th>
              <th>Registro Asociado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="empty-table-cell">
                  Cargando Health Checks desde el servicio mock...
                </td>
              </tr>
            ) : filteredChecks.length > 0 ? (
              filteredChecks.map((check) => (
                <tr key={check.id}>
                  <td className="font-mono text-muted">{check.id}</td>
                  <td className="font-semibold">{check.name}</td>
                  <td>
                    <span className={`type-badge ${check.type === 'HTTP' ? 'single' : 'multi'}`}>
                      {check.type}
                    </span>
                  </td>
                  <td className="main-info-cell font-mono">{check.target}</td>
                  <td className="text-muted">{check.intervalSec}s / {check.timeoutSec}s</td>
                  <td>
                    <span className={`status-badge ${check.status}`}>
                      <span className="status-dot-sm"></span>
                      {check.status}
                    </span>
                  </td>
                  <td className="text-muted">{check.associatedRecord}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon view" title="Ver detalle (Visual)">
                        👁️
                      </button>
                      <button
                        className="btn-icon edit"
                        title="Editar Check"
                        onClick={() => setEditingCheck(check)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon delete"
                        title="Eliminar Check"
                        onClick={() => setDeletingCheck(check)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty-table-cell">
                  No se encontraron Health Checks con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación / Edición */}
      <HealthCheckModal
        isOpen={isModalOpen || Boolean(editingCheck)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCheck(null);
        }}
        onCheckCreated={handleCheckCreated}
        onCheckUpdated={handleCheckUpdated}
        initialData={editingCheck}
      />

      {/* Modal de Confirmación de Eliminación */}
      {deletingCheck && (
        <div className="modal-overlay" onClick={() => setDeletingCheck(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Confirmar Eliminación</h3>
              <button className="modal-close-btn" onClick={() => setDeletingCheck(null)}>
                ✕
              </button>
            </div>

            <div style={{ margin: '1rem 0', lineHeight: 1.6 }}>
              <p>¿Está seguro de que desea eliminar el siguiente Health Check?</p>
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.75rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>Nombre: {deletingCheck.name}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {deletingCheck.id} | Tipo: {deletingCheck.type}</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Objetivo: {deletingCheck.target}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: '0.75rem' }}>
                Esta acción eliminará el monitoreo local y no se puede deshacer.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingCheck(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleCheckDeleted(deletingCheck)}
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
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Check'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HealthChecksPage;
