import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div className="page-container not-found">
      <h2 className="error-code">404</h2>
      <h3 className="page-title">Página no encontrada</h3>
      <p className="page-subtitle">La ruta especificada no existe en el sistema.</p>
      <Link to="/" className="btn-primary">
        Volver al Dashboard
      </Link>
    </div>
  );
}

export default NotFoundPage;
