import React from 'react';
import './StatsDashboard.css';

function StatsDashboard({ plays }) {
  // Calcoli per le statistiche
  const totalPlays = plays.length;
  const wonPlays = plays.filter(p => p.esito === 'Vinta').length;
  const lostPlays = plays.filter(p => p.esito === 'Persa').length;
  const winRate = totalPlays > 0 ? ((wonPlays / (wonPlays + lostPlays)) * 100).toFixed(1) : 0;
  
  const totalInvested = plays.reduce((acc, p) => acc + p.importo, 0);
  const totalWon = plays.reduce((acc, p) => acc + p.vincita, 0);
  const netProfit = totalWon - totalInvested;

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <h4>Giocate Totali</h4>
        <p>{totalPlays}</p>
      </div>
      <div className="stat-card">
        <h4>Vinte / Perse</h4>
        <p><span className="text-win">{wonPlays}</span> / <span className="text-loss">{lostPlays}</span></p>
      </div>
      <div className="stat-card">
        <h4>Win Rate</h4>
        <p>{winRate}%</p>
      </div>
      <div className="stat-card">
        <h4>Profitto Netto</h4>
        <p className={netProfit >= 0 ? 'text-win' : 'text-loss'}>
          {netProfit.toFixed(2)}€
        </p>
      </div>
    </div>
  );
}

export default StatsDashboard;
