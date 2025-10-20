import React from 'react';
import './Header.css';

// Aggiunte le icone come componenti SVG per flessibilità
const BetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
    <path d="M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" />
    <path d="M12 8.25V12l2.25 1.125" />
  </svg>
);

function Header({ onImport, onExport }) {
  return (
    <header className="app-header">
      <div className="header-title">
        <h1>Bet Stats Tracker</h1>
      </div>
      <div className="header-actions">
        <a 
          href="https://www.bet365.it" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="header-button bet-link"
        >
          <BetIcon />
          <span>Vai a Bet365</span>
        </a>
        <button onClick={onImport} className="header-button">Importa CSV</button>
        <button onClick={onExport} className="header-button">Esporta CSV</button>
      </div>
    </header>
  );
}

export default Header;

