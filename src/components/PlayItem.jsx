import React, { useState, useRef } from 'react';
import './PlayItem.css';

// Icone per le azioni
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 S0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;

const ESITO_COLORS = {
  'Vinta': 'var(--win-color)',
  'Persa': 'var(--loss-color)',
  'In attesa': 'var(--pending-color)',
};

function PlayItem({ play, onEdit, onDelete }) {
  const { data, risultato, quota, importo, vincita, esito } = play;
  
  const [isSwiped, setIsSwiped] = useState(false);
  const touchStartCoords = useRef({ x: 0, y: 0 });
  const itemRef = useRef(null);

  const profitto = vincita - importo;
  const formattedDate = new Date(data).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  const esitoColor = ESITO_COLORS[esito] || 'var(--border-color)';
  const profittoClass = profitto > 0 ? 'profitto-positivo' : profitto < 0 ? 'profitto-negativo' : '';

  const handleTouchStart = (e) => {
    touchStartCoords.current = { x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY };
  };

  const handleTouchMove = (e) => {
    const currentX = e.targetTouches[0].clientX;
    const diffX = currentX - touchStartCoords.current.x;

    // Disabilita transizione durante il movimento per reattività
    itemRef.current.style.transition = 'none';

    // Movimento solo se si sta andando a sinistra da chiuso, o se si è già aperti
    if ((!isSwiped && diffX < 0) || (isSwiped && diffX < 140)) {
        const newX = isSwiped ? -140 + diffX : diffX;
        // Limita il movimento per non superare i limiti
        if (newX < 5 && newX > -150) {
            itemRef.current.style.transform = `translateX(${newX}px)`;
        }
    }
  };

  const handleTouchEnd = (e) => {
    const touchEndCoords = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    const deltaX = touchEndCoords.x - touchStartCoords.current.x;
    const deltaY = touchEndCoords.y - touchStartCoords.current.y;

    // --- FIX SENSIBILITÀ: se il movimento è più verticale che orizzontale, è uno scroll ---
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        // Ripristina la posizione se non era uno swipe valido
        itemRef.current.style.transition = 'transform 0.3s ease';
        itemRef.current.style.transform = isSwiped ? 'translateX(-140px)' : 'translateX(0px)';
        return;
    }

    itemRef.current.style.transition = 'transform 0.3s ease';
    const swipeThreshold = 60;

    // --- FIX SWIPE DESTRA: se si swippa a destra e la card è aperta, chiudila ---
    if (deltaX > swipeThreshold && isSwiped) {
        setIsSwiped(false);
        itemRef.current.style.transform = 'translateX(0px)';
    } else if (deltaX < -swipeThreshold && !isSwiped) {
        setIsSwiped(true);
        itemRef.current.style.transform = 'translateX(-140px)';
    } else {
        // Se non si supera la soglia, torna alla posizione di partenza
        itemRef.current.style.transform = isSwiped ? 'translateX(-140px)' : 'translateX(0px)';
    }
  };
  
  // --- FIX CLICK: il click chiude il menu solo se non è stato un drag ---
  const handleCardClick = (e) => {
    const deltaX = Math.abs(e.clientX - touchStartCoords.current.x);
    if (isSwiped && deltaX < 10) { // Considera click solo se il movimento è stato minimo
      setIsSwiped(false);
      itemRef.current.style.transform = 'translateX(0px)';
    }
  };

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
          style={{ '--border-color-dynamic': esitoColor }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleCardClick}
        >
            {/* Contenuto per la VISTA MOBILE A CARD */}
            <div className="mobile-card-content">
                {/* ... contenuto invariato ... */}
                 <div className="play-item-main">
                    <span className="play-risultato">{risultato}</span>
                    <span className={`play-profitto ${profittoClass}`}>{profitto >= 0 ? '+' : ''}{profitto.toFixed(2)}€</span>
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

            {/* Contenuto per la VISTA DESKTOP A TABELLA */}
            <div className="desktop-row-content">
                {/* ... contenuto invariato ... */}
                <div>{formattedDate}</div>
                <div>{risultato}</div>
                <div>x{quota.toFixed(2)}</div>
                <div>{importo.toFixed(2)}€</div>
                <div>{vincita.toFixed(2)}€</div>
                <div className={profittoClass}>{profitto >= 0 ? '+' : ''}{profitto.toFixed(2)}€</div>
                <div className="esito-cell"><span className={`esito-badge esito-${esito.toLowerCase().replace(' ', '-')}`}>{esito}</span></div>
                <div className="play-actions">
                    <button onClick={() => onEdit(play)} className="action-button edit"><EditIcon /></button>
                    <button onClick={() => onDelete(play.id)} className="action-button delete"><DeleteIcon /></button>
                </div>
            </div>
      </div>
    </div>
  );
}

export default PlayItem;

