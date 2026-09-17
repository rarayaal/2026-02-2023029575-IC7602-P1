import React, { useState, useEffect } from 'react';
import { dnsService } from '../services/dnsService';

function DashboardPage() {
  const [stats, setStats] = useState({
    totalRecords: 0,
    byType: {
      single: 0,
      multi: 0,
      weight: 0,
      roundTrip: 0,
      geo: 0,
    },
    healthChecks: {
      active: 0,
      healthy: 0,
      unhealthy: 0,
      unknown: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const records = await dnsService.getRecords();
        const byType = { single: 0, multi: 0, weight: 0, 'round-trip': 0, geo: 0 };
        const healthChecks = { active: 0, healthy: 0, unhealthy: 0, unknown: 0 };

        records.forEach((r) => {
          if (byType[r.type] !== undefined) {
            byType[r.type]++;
          }

          const targets = Array.isArray(r.targets) ? r.targets : [];
          const hasUnhealthy = targets.some((t) => t.status === 'unhealthy');
          const hasHealthy = targets.some((t) => t.status === 'healthy');
          const status = hasUnhealthy ? 'unhealthy' : hasHealthy ? 'healthy' : 'unknown';

          if (status === 'healthy') healthChecks.healthy++;
          else if (status === 'unhealthy') healthChecks.unhealthy++;
          else healthChecks.unknown++;

          const hasActiveCheck = targets.some((t) => Boolean(t.healthCheckId));
          if (hasActiveCheck) {
            healthChecks.active++;
          }
        });

        setStats({
          totalRecords: records.length,
          byType: {
            single: byType.single,
            multi: byType.multi,
            weight: byType.weight,
            roundTrip: byType['round-trip'],
            geo: byType.geo,
          },
          healthChecks,
        });
      } catch (err) {
        console.error('Error cargando datos del dashboard desde dnsService:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
          <h2 className="page-title">Dashboard General</h2>
          <p className="page-subtitle">Resumen estadístico y estado del servicio de resolución DNS</p>
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
