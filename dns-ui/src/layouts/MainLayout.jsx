import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

function MainLayout() {
  return (
    <div className="layout-container">
      <header className="header">
        <Navbar />
      </header>

      <main className="main-content">
        <Outlet />
      </main>

      <footer className="footer">
        <p>DNS UI — Sistema de Gestión DNS | IC7602</p>
      </footer>
    </div>
  );
}

export default MainLayout;
