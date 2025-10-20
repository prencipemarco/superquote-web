import React, { useState } from 'react';
import Header from './components/Header.jsx';
import StatsDashboard from './components/StatsDashboard';
import PlaysChart from './components/PlaysChart';
import Filters from './components/Filters';
import PlaysList from './components/PlaysList';
import AddPlayForm from './components/AddPlayForm';
import './index.css'; // Stili globali

// Dati di esempio (verranno da Supabase)
const MOCK_PLAYS = [
  { id: 1, data: '2025-10-20', risultato: 'Inter - Milan 1', quota: 2.5, importo: 10, vincita: 25, esito: 'Vinta' },
  { id: 2, data: '2025-10-18', risultato: 'Juventus - Roma X', quota: 3.1, importo: 5, vincita: 0, esito: 'Persa' },
  { id: 3, data: '2025-10-15', risultato: 'Napoli - Lazio Over 2.5', quota: 1.8, importo: 20, vincita: 36, esito: 'Vinta' },
  { id: 4, data: '2025-10-12', risultato: 'Atalanta - Fiorentina GG', quota: 1.65, importo: 15, vincita: 0, esito: 'Persa' },
  { id: 5, data: '2025-10-10', risultato: 'Bologna - Torino 1X', quota: 1.4, importo: 25, vincita: 35, esito: 'Vinta' },
];


function App() {
  const [plays, setPlays] = useState(MOCK_PLAYS);
  const [editingPlay, setEditingPlay] = useState(null); // Oggetto giocata da modificare

  // Funzioni CRUD (per ora simulate)
  const handleAddPlay = (play) => {
    // In futuro, qui chiameremo Supabase
    const newPlay = { ...play, id: Date.now() }; // ID temporaneo
    setPlays([newPlay, ...plays]);
    console.log("Aggiunta nuova giocata:", newPlay);
  };

  const handleUpdatePlay = (updatedPlay) => {
    // In futuro, qui chiameremo Supabase
    setPlays(plays.map(p => p.id === updatedPlay.id ? updatedPlay : p));
    setEditingPlay(null); // Chiude il form di modifica
    console.log("Giocata aggiornata:", updatedPlay);
  };

  const handleDeletePlay = (id) => {
    // In futuro, qui chiameremo Supabase
    if (window.confirm("Sei sicuro di voler eliminare questa giocata?")) {
        setPlays(plays.filter(p => p.id !== id));
        console.log("Giocata eliminata con ID:", id);
    }
  };
  
  const handleEditClick = (play) => {
    setEditingPlay(play);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scrolla in cima per mostrare il form
  };

  // Funzione per esportare le giocate in JSON
  const handleExportPlays = () => {
    if (plays.length === 0) {
      console.warn("Nessuna giocata da esportare.");
      return;
    }
    const dataStr = JSON.stringify(plays, null, 2); // Il 2 serve per indentare il JSON e renderlo leggibile
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = 'giocate.json';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url); // Pulisce la memoria
    console.log("Dati esportati con successo.");
  };

  // Funzione per importare le giocate da JSON
  const handleImportPlays = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = event => {
        try {
          const importedPlays = JSON.parse(event.target.result);
          // Semplice validazione: controlla se è un array
          if (Array.isArray(importedPlays)) {
            // NOTA: Questa azione sovrascrive tutte le giocate attuali.
            setPlays(importedPlays);
            console.log("Dati importati con successo:", importedPlays);
          } else {
            console.error("Errore: Il file JSON non contiene un array di giocate valido.");
          }
        } catch (error) {
          console.error("Errore durante il parsing del file JSON:", error);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };


  return (
    <div className="app-container">
      <Header onImport={handleImportPlays} onExport={handleExportPlays} />
      <main>
        <section className="dashboard-section">
          <StatsDashboard plays={plays} />
          <PlaysChart plays={plays} />
        </section>
        
        <section className="form-section">
            <AddPlayForm 
                onAddPlay={handleAddPlay}
                onUpdatePlay={handleUpdatePlay}
                editingPlay={editingPlay}
                setEditingPlay={setEditingPlay}
            />
        </section>

        <section className="list-section">
          <Filters />
          <PlaysList 
            plays={plays} 
            onEdit={handleEditClick} 
            onDelete={handleDeletePlay} 
          />
        </section>
      </main>
    </div>
  );
}

export default App;

