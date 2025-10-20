import React from 'react';
import './PlayItem.css';

// Icone per le azioni
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

function PlayItem({ play, onEdit, onDelete }) {
  const { data, risultato, quota, importo, vincita, esito } = play;

  // Calcolo del profitto
  const profitto = vincita - importo;
  
  // Formattazione data
  const formattedDate = new Date(data).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  // Classi dinamiche per i colori
  const esitoClass = `esito-badge esito-${esito.toLowerCase().replace(' ', '-')}`;
  const profittoClass = profitto > 0 ? 'profitto-positivo' : profitto < 0 ? 'profitto-negativo' : '';

  return (
    <div className="play-item">
      <div data-label="Data">{formattedDate}</div>
      <div data-label="Risultato">{risultato}</div>
      <div data-label="Quota">x{quota.toFixed(2)}</div>
      <div data-label="Importo">{importo.toFixed(2)}€</div>
      <div data-label="Vincita">{vincita.toFixed(2)}€</div>
      <div data-label="Profitto" className={profittoClass}>
        {profitto > 0 ? '+' : ''}{profitto.toFixed(2)}€
      </div>
      <div data-label="Esito" className="esito-cell">
        <span className={esitoClass}>{esito}</span>
      </div>
      <div data-label="Azioni" className="play-actions">
        <button onClick={() => onEdit(play)} className="action-button edit"><EditIcon /></button>
        <button onClick={() => onDelete(play.id)} className="action-button delete"><DeleteIcon /></button>
      </div>
    </div>
  );
}

export default PlayItem;

