import React from 'react';

function DashboardPage() {
  // Datos estáticos/simulados para el Dashboard (Commit 3)
  const stats = {
    totalRecords: 24,
    byType: {
      single: 8,
      multi: 5,
      weight: 4,
      roundTrip: 4,
      geo: 3,
    },
    healthChecks: {
      active: 18,
      healthy: 15,
      unhealthy: 3,
      unknown: 0,
    },
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2 className="page-title">Dashboard General</h2>
          <p className="page-subtitle">Resumen estadístico y estado del servicio de resolución DNS</p>
        </div>
        <div className="system-status-pill">
          <span className="status-dot green"></span>
          <span>Sistema Operativo</span>
        </div>
      </header>

      {/* Tarjetas Principales de Resumen */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">🌐</div>
          <div className="stat-info">
            <span className="stat-label">Total Registros DNS</span>
            <span className="stat-value">{stats.totalRecords}</span>
          </div>
        </div>

        <div className="stat-card success">
          <div className="stat-icon">💚</div>
          <div className="stat-info">
            <span className="stat-label">Registros Healthy</span>
            <span className="stat-value">{stats.healthChecks.healthy}</span>
          </div>
        </div>

        <div className="stat-card danger">
          <div className="stat-icon">🔴</div>
          <div className="stat-info">
            <span className="stat-label">Registros Unhealthy</span>
            <span className="stat-value">{stats.healthChecks.unhealthy}</span>
          </div>
        </div>

        <div className="stat-card info">
          <div className="stat-icon">⚡</div>
          <div className="stat-info">
            <span className="stat-label">Health Checks Activos</span>
            <span className="stat-value">{stats.healthChecks.active}</span>
          </div>
        </div>
      </div>

      {/* Desglose por Tipo de Registro DNS */}
      <div className="dashboard-section">
        <h3 className="section-title">Distribución por Tipo de Registro</h3>
        <div className="types-grid">
          <div className="type-card">
            <div className="type-header">
              <span className="type-badge single">Single</span>
              <span className="type-count">{stats.byType.single}</span>
            </div>
            <p className="type-desc">IP única fija asignada</p>
          </div>

          <div className="type-card">
            <div className="type-header">
              <span className="type-badge multi">Multi</span>
              <span className="type-count">{stats.byType.multi}</span>
            </div>
            <p className="type-desc">Múltiples IPs en round-robin</p>
          </div>

          <div className="type-card">
            <div className="type-header">
              <span className="type-badge weight">Weight</span>
              <span className="type-count">{stats.byType.weight}</span>
            </div>
            <p className="type-desc">Balanceo de carga por peso</p>
          </div>

          <div className="type-card">
            <div className="type-header">
              <span className="type-badge round-trip">Round-Trip</span>
              <span className="type-count">{stats.byType.roundTrip}</span>
            </div>
            <p className="type-desc">Selección por menor latencia</p>
          </div>

          <div className="type-card">
            <div className="type-header">
              <span className="type-badge geo">Geo</span>
              <span className="type-count">{stats.byType.geo}</span>
            </div>
            <p className="type-desc">Resolución por ubicación geográfica</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
