import React, { useState, useEffect, useMemo } from 'react';
import { ipCountryService } from '../services/ipCountryService';
import IpCountryModal from '../components/IpCountryModal';

function IpCountryPage() {
  const [mappings, setMappings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState(null);
  const [deletingMapping, setDeletingMapping] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchMappings = async () => {
    try {
      const data = await ipCountryService.getMappings();
      setMappings(data);
    } catch (err) {
      console.error('Error cargando mapeos IP-Country:', err);
      setFeedback({ type: 'error', text: 'Error cargando los mapeos IP-Country' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMappings();
  }, []);

  const handleMappingCreated = async (newMappingData) => {
    const created = await ipCountryService.createMapping(newMappingData);
    await fetchMappings();
    setIsModalOpen(false);
    setFeedback({
      type: 'success',
      text: `Mapeo IP-Country (${created.countryName} - ${created.id}) creado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleMappingUpdated = async (id, updatedData) => {
    const updated = await ipCountryService.updateMapping(id, updatedData);
    await fetchMappings();
    setEditingMapping(null);
    setFeedback({
      type: 'success',
      text: `Mapeo IP-Country (${updated.countryName} - ${updated.id}) actualizado exitosamente.`,
    });
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
  };

  const handleMappingDeleted = async (mappingToDelete) => {
    if (!mappingToDelete || !mappingToDelete.id) return;
    setIsDeleting(true);
    try {
      const success = await ipCountryService.deleteMapping(mappingToDelete.id);
      if (success) {
        await fetchMappings();
        setFeedback({
          type: 'success',
          text: `Mapeo IP-Country (${mappingToDelete.countryName} - ${mappingToDelete.id}) eliminado exitosamente.`,
        });
      } else {
        setFeedback({
          type: 'error',
          text: `No se pudo eliminar el mapeo con ID ${mappingToDelete.id}.`,
        });
      }
    } catch (err) {
      console.error('Error al eliminar el mapeo IP-Country:', err);
      setFeedback({
        type: 'error',
        text: `Error al eliminar el mapeo: ${err.message || err}`,
      });
    } finally {
      setIsDeleting(false);
      setDeletingMapping(null);
      setTimeout(() => {
        setFeedback(null);
      }, 4000);
    }
  };

  const filteredMappings = useMemo(() => {
    return mappings.filter((m) => {
      const search = searchTerm.toLowerCase();
      return (
        m.countryName.toLowerCase().includes(search) ||
        m.countryCode.toLowerCase().includes(search) ||
        m.ipRange.toLowerCase().includes(search) ||
        m.description.toLowerCase().includes(search)
      );
    });
  }, [mappings, searchTerm]);

  return (
    <div className="records-page-container">
      <header className="page-header">
        <div>
          <h2 className="page-title">IP-to-Country Mapping</h2>
          <p className="page-subtitle">Administración del mapeo de rangos IP y subredes CIDR a países</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          ➕ Agregar Rango IP
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
            placeholder="Buscar por país, código ISO o rango IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Tabla de Mapeos IP-to-Country */}
      <div className="table-responsive">
        <table className="records-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Rango IP / Subred CIDR</th>
              <th>Código ISO</th>
              <th>País Asignado</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  Cargando mapeos IP-Country desde el servicio mock...
                </td>
              </tr>
            ) : filteredMappings.length > 0 ? (
              filteredMappings.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono text-muted">{m.id}</td>
                  <td className="font-mono font-semibold">{m.ipRange}</td>
                  <td>
                    <span className="type-badge geo">{m.countryCode}</span>
                  </td>
                  <td className="font-semibold">{m.countryName}</td>
                  <td className="text-muted main-info-cell">{m.description}</td>
                  <td>
                    <div className="actions-cell">
                      <button className="btn-icon view" title="Ver detalle (Visual)">
                        👁️
                      </button>
                      <button
                        className="btn-icon edit"
                        title="Editar Mapeo"
                        onClick={() => setEditingMapping(m)}
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon delete"
                        title="Eliminar Mapeo"
                        onClick={() => setDeletingMapping(m)}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty-table-cell">
                  No se encontraron mapeos IP-Country con los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Creación / Edición */}
      <IpCountryModal
        isOpen={isModalOpen || Boolean(editingMapping)}
        onClose={() => {
          setIsModalOpen(false);
          setEditingMapping(null);
        }}
        onMappingCreated={handleMappingCreated}
        onMappingUpdated={handleMappingUpdated}
        initialData={editingMapping}
      />

      {/* Modal de Confirmación de Eliminación */}
      {deletingMapping && (
        <div className="modal-overlay" onClick={() => setDeletingMapping(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⚠️ Confirmar Eliminación</h3>
              <button className="modal-close-btn" onClick={() => setDeletingMapping(null)}>
                ✕
              </button>
            </div>

            <div style={{ margin: '1rem 0', lineHeight: 1.6 }}>
              <p>¿Está seguro de que desea eliminar el siguiente mapeo IP-to-Country?</p>
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '0.5rem', marginTop: '0.75rem' }}>
                <p style={{ fontWeight: 600, color: 'var(--text-main)' }}>País: {deletingMapping.countryName} ({deletingMapping.countryCode})</p>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {deletingMapping.id} | Rango: {deletingMapping.ipRange}</p>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#f87171', marginTop: '0.75rem' }}>
                Esta acción eliminará la asociación local y no se puede deshacer.
              </p>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeletingMapping(null)}
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleMappingDeleted(deletingMapping)}
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
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar Mapeo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IpCountryPage;
