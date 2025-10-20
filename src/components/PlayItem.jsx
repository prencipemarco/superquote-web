import React from 'react';
import './PlayItem.css';

function PlayItem({ play, onEdit, onDelete }) {

  const getStatusClass = (esito) => {
    switch (esito) {
      case 'Vinta':
        return 'status-won';
      case 'Persa':
        return 'status-lost';
      case 'Rimborsata':
        return 'status-refunded';
      default:
        return 'status-pending';
    }
  };

  return (
    <div className="play-item">
      <div className="play-data-cell" data-label="Data">{new Date(play.data).toLocaleDateString('it-IT')}</div>
      <div className="play-data-cell" data-label="Risultato">{play.risultato}</div>
      <div className="play-data-cell" data-label="Quota">{play.quota.toFixed(2)}</div>
      <div className="play-data-cell" data-label="Importo">€{play.importo.toFixed(2)}</div>
      <div className="play-data-cell" data-label="Vincita">€{play.vincita.toFixed(2)}</div>
      <div className="play-data-cell" data-label="Esito">
        <span className={`status-badge ${getStatusClass(play.esito)}`}>{play.esito}</span>
      </div>
      <div className="play-actions">
        <button onClick={() => onEdit(play)} className="action-btn edit-btn">Modifica</button>
        <button onClick={() => onDelete(play.id)} className="action-btn delete-btn">Elimina</button>
      </div>
    </div>
  );
}

export default PlayItem;
