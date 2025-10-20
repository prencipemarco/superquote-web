import React from 'react';
import PlayItem from './PlayItem';
import './PlaysList.css';

function PlaysList({ plays, onEdit, onDelete }) {
  if (plays.length === 0) {
    return <p className="no-plays-message">Nessuna giocata da mostrare. Aggiungine una!</p>
  }
  
  return (
    <div className="plays-list-container">
      <div className="plays-list-header">
        <div>Data</div>
        <div>Risultato</div>
        <div>Quota</div>
        <div>Importo</div>
        <div>Vincita</div>
        <div>Esito</div>
        <div>Azioni</div>
      </div>
      <div className="plays-list-body">
        {plays.map(play => (
          <PlayItem 
            key={play.id} 
            play={play} 
            onEdit={onEdit} 
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

export default PlaysList;
