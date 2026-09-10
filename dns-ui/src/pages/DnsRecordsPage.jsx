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
    // Ocultar mensaje automáticamente a los 4 segundos
    setTimeout(() => {
      setFeedback(null);
    }, 4000);
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
                      <button className="btn-icon edit" title="Editar (Visual)">
                        ✏️
                      </button>
                      <button className="btn-icon delete" title="Eliminar (Visual)">
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

      {/* Modal de Creación */}
      <CreateRecordModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRecordCreated={handleRecordCreated}
      />
    </div>
  );
}

export default DnsRecordsPage;

