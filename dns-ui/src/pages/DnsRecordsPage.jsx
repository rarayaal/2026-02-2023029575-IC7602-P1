import React, { useState, useMemo } from 'react';

// Datos estáticos/simulados para la vista de registros (Commit 4)
const INITIAL_RECORDS = [
  {
    id: 'DNS-001',
    domain: 'api.company.com',
    type: 'single',
    mainInfo: '192.168.1.50',
    status: 'healthy',
    healthCheck: 'HTTP GET /health:8080',
  },
  {
    id: 'DNS-002',
    domain: 'cdn.company.com',
    type: 'multi',
    mainInfo: '3 IPs (10.0.0.1, 10.0.0.2, 10.0.0.3)',
    status: 'healthy',
    healthCheck: 'TCP:443',
  },
  {
    id: 'DNS-003',
    domain: 'app.company.com',
    type: 'weight',
    mainInfo: '172.16.0.1 (70%) | 172.16.0.2 (30%)',
    status: 'unhealthy',
    healthCheck: 'HTTP GET /status:3000',
  },
  {
    id: 'DNS-004',
    domain: 'edge.company.com',
    type: 'round-trip',
    mainInfo: '198.51.100.4 (Lat: 12ms)',
    status: 'healthy',
    healthCheck: 'TCP:80',
  },
  {
    id: 'DNS-005',
    domain: 'portal.company.com',
    type: 'geo',
    mainInfo: 'US: 203.0.113.10 | CR: 203.0.113.20',
    status: 'healthy',
    healthCheck: 'HTTP GET /ping:80',
  },
  {
    id: 'DNS-006',
    domain: 'test.company.com',
    type: 'single',
    mainInfo: '192.168.1.99',
    status: 'unknown',
    healthCheck: 'Ninguno',
  },
];

function DnsRecordsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredRecords = useMemo(() => {
    return INITIAL_RECORDS.filter((record) => {
      const matchesSearch = record.domain.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || record.type === typeFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchTerm, typeFilter, statusFilter]);

  return (
    <div className="records-page-container">
      <header className="page-header">
        <div>
          <h2 className="page-title">Gestión de Registros DNS</h2>
          <p className="page-subtitle">Listado completo de registros y su estado de resolución</p>
        </div>
      </header>

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
            {filteredRecords.length > 0 ? (
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
    </div>
  );
}

export default DnsRecordsPage;
