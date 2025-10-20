import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import PlaysChart from './components/PlaysChart';
import Filters from './components/Filters';
import PlaysList from './components/PlaysList';
import AddPlayForm from './components/AddPlayForm';
import OutcomePieChart from './components/OutcomePieChart';
import MonthlyBarChart from './components/MonthlyBarChart';
import './index.css';

function App() {
  const [plays, setPlays] = useState([]);
  const [editingPlay, setEditingPlay] = useState(null);
  const [filters, setFilters] = useState({ count: 'all', month: 'all', esito: 'all' });
  
  const [lineChartData, setLineChartData] = useState([]);
  const [trendColor, setTrendColor] = useState('#888');
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  
  const formSectionRef = useRef(null);

  // ... logica dei grafici e getPlays invariata ...
  const processDataForCharts = useCallback((currentPlays) => { /* ... */ }, []);
  const getPlays = useCallback(async () => { /* ... */ }, [filters, processDataForCharts]);
  useEffect(() => { getPlays(); }, [getPlays]);

  // --- FUNZIONE DI ARCHIVIAZIONE E CANCELLAZIONE ---
  const handleArchiveAndClear = async () => {
    // 1. Avviso di sicurezza con doppia conferma
    const confirmation = window.confirm(
      "ATTENZIONE: Stai per scaricare TUTTE le giocate e cancellarle PERMANENTEMENTE dal database.\n\nQuesta azione non può essere annullata.\n\nSei assolutamente sicuro di voler procedere?"
    );

    if (!confirmation) {
      alert("Azione annullata.");
      return;
    }

    // 2. Carica TUTTE le giocate dal database, ignorando i filtri
    const { data: allPlays, error: fetchError } = await supabase
      .from('plays')
      .select('*')
      .order('data', { ascending: true });

    if (fetchError || !allPlays) {
      alert("Errore nel caricamento dei dati per l'archivio. Riprova.");
      return;
    }

    if (allPlays.length === 0) {
      alert("Nessuna giocata da archiviare.");
      return;
    }

    // 3. Genera e scarica il file CSV
    const headers = ["ID", "Data", "Risultato", "Quota", "Importo", "Vincita", "Esito"];
    const csvContent = [
      headers.join(','),
      ...allPlays.map(p => `${p.id},${p.data},"${p.risultato}",${p.quota},${p.importo},${p.vincita},${p.esito}`)
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `archivio_giocate_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    
    // 4. Se il download va a buon fine, CANCELLA TUTTI i dati
    const { error: deleteError } = await supabase
        .from('plays')
        .delete()
        .neq('id', -1); // Condizione per cancellare tutte le righe

    if (deleteError) {
        alert("Errore durante la pulizia del database. I dati sono stati scaricati ma non eliminati. Contatta il supporto.");
    } else {
        alert("Archiviazione completata con successo! Il database è stato svuotato.");
        // 5. Aggiorna l'interfaccia
        getPlays();
    }
  };


  const handleFilterChange = useCallback((newFilters) => { /* ... */ }, []);
  const handleAddPlay = async (play) => { /* ... */ };
  const handleUpdatePlay = async (play) => { /* ... */ };
  const handleDeletePlay = async (id) => { /* ... */ };
  const handleEditClick = (play) => { /* ... */ };
  const handleImportPlays = () => { /* ... */ };


  return (
    <div className="app-container">
      <Header 
        onImport={handleImportPlays} 
        onArchive={handleArchiveAndClear} // Passa la nuova funzione
      />
      <main>
        {/* ... resto del JSX ... */}
      </main>
    </div>
  );
}

export default App;

