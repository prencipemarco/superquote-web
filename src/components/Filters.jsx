import React, { useState, useEffect } from 'react';
import './Filters.css';

function Filters({ onFilterChange }) {
  const [selectedCount, setSelectedCount] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedEsito, setSelectedEsito] = useState('all');

  useEffect(() => {
    onFilterChange({
      count: selectedCount,
      month: selectedMonth,
      esito: selectedEsito,
    });
  }, [selectedCount, selectedMonth, selectedEsito, onFilterChange]);

  const handleReset = () => {
    setSelectedCount('all');
    setSelectedMonth('all');
    setSelectedEsito('all');
  };

  const getMonthOptions = () => {
    const months = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const monthDate = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const monthValue = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = monthDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
      months.push({ value: monthValue, label: monthLabel });
    }
    return months;
  };

  return (
    <div className="filters-container">
      <div className="filter-group">
        <label htmlFor="plays-count">Mostra Giocate</label>
        <div className="select-wrapper">
          <select id="plays-count" value={selectedCount} onChange={(e) => setSelectedCount(e.target.value)}>
            <option value="all">Tutte</option>
            <option value="5">Ultime 5</option>
            <option value="10">Ultime 10</option>
            <option value="20">Ultime 20</option>
            <option value="50">Ultime 50</option>
          </select>
          <span className="select-icon">▼</span>
        </div>
      </div>
      <div className="filter-group">
        <label htmlFor="plays-month">Mese</label>
        <div className="select-wrapper">
          <select id="plays-month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
            <option value="all">Tutti i mesi</option>
            {getMonthOptions().map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>
          <span className="select-icon">▼</span>
        </div>
      </div>
      <div className="filter-group">
        <label htmlFor="plays-esito">Esito</label>
        <div className="select-wrapper">
          <select id="plays-esito" value={selectedEsito} onChange={(e) => setSelectedEsito(e.target.value)}>
            <option value="all">Tutti gli esiti</option>
            <option value="Vinta">Vinte</option>
            <option value="Persa">Perse</option>
            <option value="In attesa">In attesa</option>
          </select>
          <span className="select-icon">▼</span>
        </div>
      </div>
      <div className="filter-actions">
        <button onClick={handleReset} className="reset-button">Azzera Filtri</button>
      </div>
    </div>
  );
}

export default Filters;

