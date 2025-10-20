import React from 'react';
import './Header.css';

function Header({ onImport, onExport }) {
  return (
    <header className="site-header">
      <div className="header-content">
        <h1>Bet365 Stats Tracker 📊</h1>
      </div>
      <div className="header-actions">
        <button onClick={onImport} className="btn-secondary">Importa CSV</button>
        <button onClick={onExport} className="btn-secondary">Esporta CSV</button>
      </div>
    </header>
  );
}

export default Header;

