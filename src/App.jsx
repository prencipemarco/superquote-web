import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient'; // Importiamo il nostro client
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import PlaysChart from './components/PlaysChart';
import Filters from './components/Filters';
import PlaysList from './components/PlaysList';
import AddPlayForm from './components/AddPlayForm';
import './index.css';

function App() {
  const [plays, setPlays] = useState([]); // Iniziamo con un array vuoto
  const [editingPlay, setEditingPlay] = useState(null);

  // useEffect per caricare i dati all'avvio dell'app
  useEffect(() => {
    getPlays();
  }, []);

  // Funzione per leggere tutte le giocate da Supabase
  async function getPlays() {
    const { data, error } = await supabase
      .from('plays')
      .select('*')
      .order('data', { ascending: false }); // Ordina per data, dalla più recente

    if (error) {
      console.error("Errore nel caricamento delle giocate:", error);
    } else {
      setPlays(data);
    }
  }

  // --- Funzioni CRUD aggiornate per Supabase ---

  const handleAddPlay = async (play) => {
    // Rimuoviamo l'ID temporaneo, Supabase lo genererà
    const { id, ...playData } = play; 

    const { data, error } = await supabase
      .from('plays')
      .insert([playData])
      .select(); // .select() ci restituisce la riga appena inserita

    if (error) {
      console.error("Errore nell'aggiunta della giocata:", error);
    } else if (data) {
      setPlays([data[0], ...plays]); // Aggiungiamo la nuova giocata in cima alla lista
      console.log("Aggiunta nuova giocata:", data[0]);
    }
  };

  const handleUpdatePlay = async (updatedPlay) => {
    const { data, error } = await supabase
      .from('plays')
      .update(updatedPlay)
      .eq('id', updatedPlay.id)
      .select();

    if (error) {
      console.error("Errore nell'aggiornamento della giocata:", error);
    } else if (data) {
      setPlays(plays.map(p => p.id === updatedPlay.id ? data[0] : p));
      setEditingPlay(null);
      console.log("Giocata aggiornata:", data[0]);
    }
  };

  const handleDeletePlay = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa giocata?")) {
      const { error } = await supabase
        .from('plays')
        .delete()
        .eq('id', id);

      if (error) {
        console.error("Errore nell'eliminazione della giocata:", error);
      } else {
        setPlays(plays.filter(p => p.id !== id));
        console.log("Giocata eliminata con ID:", id);
      }
    }
  };
  
  const handleEditClick = (play) => {
    setEditingPlay(play);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- Funzioni Import/Export ---

  const handleExportPlays = () => {
    if (plays.length === 0) {
      console.warn("Nessuna giocata da esportare.");
      alert("Nessuna giocata da esportare.");
      return;
    }

    const headers = ['id', 'data', 'risultato', 'quota', 'importo', 'vincita', 'esito'];
    const headerString = headers.join(',');
    
    const csvRows = plays.map(row => 
        headers.map(fieldName => {
            let cell = row[fieldName] === null || row[fieldName] === undefined ? '' : row[fieldName].toString();
            if (cell.search(/("|,|\n)/g) >= 0) {
                cell = `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
        }).join(',')
    );

    const csvContent = [headerString, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.href = url;
    linkElement.download = 'giocate.csv';
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
    console.log("Dati esportati in CSV con successo.");
  };

  const handleImportPlays = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
            const csvText = event.target.result;
            const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');

            if (lines.length < 2) throw new Error("Il file CSV è vuoto o ha solo l'header.");
            
            const headers = lines[0].trim().split(',').map(h => h.trim());
            const playsToInsert = lines.slice(1).map(line => {
                const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                const playObject = headers.reduce((obj, header, index) => {
                    if (header === 'id') return obj; // Ignora l'ID dal CSV
                    
                    let value = values[index] ? values[index].trim() : '';
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1).replace(/""/g, '"');
                    if (['quota', 'importo', 'vincita'].includes(header)) value = parseFloat(value) || 0;
                    
                    obj[header] = value;
                    return obj;
                }, {});
                return playObject;
            });

            if (window.confirm(`Stai per importare ${playsToInsert.length} giocate. Questa azione non può essere annullata. Continuare?`)) {
                const { error } = await supabase.from('plays').insert(playsToInsert);
                if (error) throw error;
                
                console.log("Dati importati con successo su Supabase.");
                alert("Giocate importate con successo!");
                getPlays(); // Ricarica i dati per aggiornare l'UI
            }

        } catch (error) {
          console.error("Errore durante l'importazione del CSV:", error);
          alert(`Errore durante l'importazione: ${error.message}`);
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