import React from 'react';
import './Header.css';

function Header({ onImport, onExport }) {
  return (
    <header className="site-header">
      <div className="header-content">
        <h1>Amici Stats Tracker 📊</h1>
        <p>Monitora le tue giocate e analizza i risultati</p>
      </div>
      <div className="header-actions">
        <button onClick={onImport} className="btn-secondary">Importa CSV</button>
        <button onClick={onExport} className="btn-secondary">Esporta CSV</button>
      </div>
    </header>
  );
}

export default Header;

