import React, { useState, useEffect, useMemo } from 'react';
import { dnsService } from '../services/dnsService';
import CreateRecordModal from '../components/CreateRecordModal';

function DnsRecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchRecords = async () => {
    try {
      const data = await dnsService.getRecords();
      setRecords(data);
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
      const matchesSearch = record.domain.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || record.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
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
            placeholder="Buscar por dominio..."
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
              filteredRecords.map((record) => (
                <tr key={record.id}>
                  <td className="font-mono text-muted">{record.id}</td>
                  <td className="font-semibold">{record.domain}</td>
                  <td>
                    <span className={`type-badge ${record.type}`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="main-info-cell">{record.mainInfo}</td>
                  <td>
                    <span className={`status-badge ${record.status}`}>
                      <span className="status-dot-sm"></span>
                      {record.status}
                    </span>
                  </td>
                  <td className="text-muted">{record.healthCheck}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon view" title="Ver detalle (Visual)">
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
              ))
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

      {/* Modal de Confirmación de Eliminación */}
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>IP / Información: {deletingRecord.mainInfo}</p>
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



