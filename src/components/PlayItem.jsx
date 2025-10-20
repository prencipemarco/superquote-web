import React, { useState, useRef } from 'react';
import './PlayItem.css';

// Icone per le azioni
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const ESITO_COLORS = {
  'Vinta': 'var(--win-color)',
  'Persa': 'var(--loss-color)',
  'In attesa': 'var(--pending-color)',
};

function PlayItem({ play, onEdit, onDelete }) {
  const { data, risultato, quota, importo, vincita, esito } = play;
  
  const [isSwiped, setIsSwiped] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const itemRef = useRef(null);

  const profitto = vincita - importo;
  const formattedDate = new Date(data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const esitoColor = ESITO_COLORS[esito] || 'var(--border-color)';
  const profittoClass = profitto > 0 ? 'profitto-positivo' : profitto < 0 ? 'profitto-negativo' : '';

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
    itemRef.current.style.transition = 'none'; // Rimuove la transizione durante lo swipe
  };

  const handleTouchMove = (e) => {
    const currentX = e.targetTouches[0].clientX;
    const diff = currentX - touchStartX.current;
    if (diff < 0 && Math.abs(diff) < 150) { // Limita lo swipe verso sinistra
        itemRef.current.style.transform = `translateX(${diff}px)`;
    }
  };

  const handleTouchEnd = () => {
    itemRef.current.style.transition = 'transform 0.3s ease'; // Ri-applica la transizione
    const diff = touchStartX.current - itemRef.current.getBoundingClientRect().left;

    if (diff > 50) { // Threshold per attivare lo swipe
      setIsSwiped(true);
      itemRef.current.style.transform = 'translateX(-140px)';
    } else {
      setIsSwiped(false);
      itemRef.current.style.transform = 'translateX(0px)';
    }
  };
  
  // Resetta lo swipe se si clicca sulla card
  const handleCardClick = () => {
    if (isSwiped) {
      setIsSwiped(false);
      itemRef.current.style.transform = 'translateX(0px)';
    }
  }

  return (
    <div className="play-item-wrapper">
        <div className="play-actions-swipe">
            <button onClick={() => onEdit(play)} className="action-swipe-button edit">
                <EditIcon /> Modifica
            </button>
            <button onClick={() => onDelete(play.id)} className="action-swipe-button delete">
                <DeleteIcon /> Elimina
            </button>
        </div>
        
        <div 
          ref={itemRef}
          className={`play-item ${isSwiped ? 'swiped' : ''}`}
          style={{ borderLeft: `5px solid ${esitoColor}` }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardClick}
        >
            <div className="play-item-main">
                <span className="play-risultato">{risultato}</span>
                <span className={`play-profitto ${profittoClass}`}>
                    {profitto >= 0 ? '+' : ''}{profitto.toFixed(2)}€
                </span>
            </div>

            <div className="play-item-details">
                <div><span>Importo</span><strong>{importo.toFixed(2)}€</strong></div>
                <div><span>Quota</span><strong>x{quota.toFixed(2)}</strong></div>
                <div><span>Vincita</span><strong>{vincita.toFixed(2)}€</strong></div>
            </div>
            
            <div className="play-item-footer">
                <span className="play-date">{formattedDate}</span>
                <span className={`esito-badge esito-${esito.toLowerCase().replace(' ', '-')}`}>{esito}</span>
            </div>
      </div>
    </div>
  );
}

export default PlayItem;
