import React from 'react';
import { NavLink } from 'react-router-dom';

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-logo">🌐</span>
        <span className="brand-title">DNS Admin Panel</span>
      </div>
      <div className="navbar-links">
        <NavLink 
          to="/" 
          end 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink 
          to="/records" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">📋</span>
          <span className="nav-label">Registros DNS</span>
        </NavLink>

        <NavLink 
          to="/health-checks" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">❤️</span>
          <span className="nav-label">Health Checks</span>
        </NavLink>

        <NavLink 
          to="/ip-country" 
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-icon">🌍</span>
          <span className="nav-label">IP-to-Country</span>
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
