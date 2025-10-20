import React, { useMemo } from 'react';
import './StatsDashboard.css';

function StatsDashboard({ plays }) {
  const stats = useMemo(() => {
    if (!plays || plays.length === 0) {
      return {
        totalPlays: 0,
        wins: 0,
        losses: 0,
        winRate: "0.0%",
        netProfit: "0.00€",
      };
    }

    let totalPlays = plays.length;
    let wins = 0;
    let losses = 0;
    let totalInvested = 0;
    let totalWon = 0;

    plays.forEach(play => {
      if (play.esito === 'Vinta') {
        wins++;
        totalWon += play.vincita;
      } else if (play.esito === 'Persa') {
        losses++;
      }
      totalInvested += play.importo;
    });

    const winRate = totalPlays > 0 ? ((wins / totalPlays) * 100).toFixed(1) + "%" : "0.0%";
    const netProfit = (totalWon - totalInvested).toFixed(2) + "€";

    return { totalPlays, wins, losses, winRate, netProfit };
  }, [plays]);

  // Determina la classe del profitto per il colore
  const profitClass = stats.netProfit.startsWith('-') ? 'loss' : 'win';

  return (
    <div className="stats-dashboard">
      <div className="stat-card">
        <span className="stat-label">Giocate Totali</span>
        <span className="stat-value">{stats.totalPlays}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Vinte / Perse</span>
        <span className="stat-value">{stats.wins} / {stats.losses}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Win Rate</span>
        <span className="stat-value">{stats.winRate}</span>
      </div>
      <div className="stat-card">
        <span className="stat-label">Profitto Netto</span>
        <span className={`stat-value ${profitClass}`}>{stats.netProfit}</span>
      </div>
    </div>
  );
}

export default StatsDashboard;

