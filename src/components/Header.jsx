import React from 'react';
import './Header.css';

// Icone SVG
const BetIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="M12 16.5a4.5 4.5 0 100-9 4.5 4.5 0 000 9z" /><path d="M12 8.25V12l2.25 1.125" /></svg>;
const SheetsIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>;
const ImportIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>;
const ArchiveIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>;


function Header({ onImport, onArchive }) {
  const googleSheetLink = "https://docs.google.com/spreadsheets/d/1lW2M9NrvoaDfkWo2jjkuqk1a0KuHxfEmKmVTKda1rlo/edit?usp=sharing";

  return (
    <header className="app-header">
      <div className="header-title">
        <h1>Stats Tracker</h1>
      </div>
      <div className="header-actions">
        <a href="https://www.bet365.it" target="_blank" rel="noopener noreferrer" className="header-button bet-link">
          <BetIcon /> <span>Vai a Bet365</span>
        </a>
        <a href={googleSheetLink} target="_blank" rel="noopener noreferrer" className="header-button google-sheets-link">
          <SheetsIcon /> <span>Apri Archivio</span>
        </a>
        <button onClick={onImport} className="header-button">
          <ImportIcon /> <span>Importa CSV</span>
        </button>
        <button onClick={onArchive} className="header-button archive-button">
          <ArchiveIcon /> <span>Archivia e Svuota</span>
        </button>
      </div>
    </header>
  );
}

export default Header;