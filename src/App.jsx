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
  const [totalPlaysCount, setTotalPlaysCount] = useState(0); 
  const [editingPlay, setEditingPlay] = useState(null);
  const [filters, setFilters] = useState({ count: 'all', month: 'all', esito: 'all' });
  
  const [lineChartData, setLineChartData] = useState([]);
  const [trendColor, setTrendColor] = useState('#888');
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);
  
  const formSectionRef = useRef(null);

  // --- Funzione Core Aggiornata ---
  const processDataForCharts = useCallback((currentPlays) => {
    if (currentPlays.length === 0) {
      setLineChartData([]);
      setPieChartData([]);
      setBarChartData([]);
      return;
    }
    
    // 1. Calcola il saldo cumulativo
    const sortedPlays = [...currentPlays].sort((a, b) => new Date(a.data) - new Date(b.data));
    let cumulativeBalance = 0;
    const balanceData = sortedPlays.map(play => {
      cumulativeBalance += (play.vincita - play.importo);
      return { data: play.data, saldo: cumulativeBalance };
    });
    
    // 2. --- NUOVA LOGICA: MEDIA MOBILE (Moving Average) ---
    // Questo crea una linea di trend più reattiva
    const smaPeriod = 5; // Periodo della media mobile (ultime 5 giocate)
    const smaData = [];

    for (let i = 0; i < balanceData.length; i++) {
        if (i < smaPeriod - 1) {
            // Non ci sono abbastanza dati per la media, metti null
            smaData.push(null);
        } else {
            // Calcola la media degli ultimi 'smaPeriod' punti di saldo
            let sum = 0;
            for (let j = 0; j < smaPeriod; j++) {
                sum += balanceData[i - j].saldo;
            }
            smaData.push(sum / smaPeriod);
        }
    }

    // 3. Imposta il colore del trend in base alla direzione della media mobile
    let currentTrendColor = 'var(--text-color-light)'; // Grigio di default
    if (smaData.length >= 2) {
        // Prende gli ultimi due punti validi della media mobile
        const validSmaPoints = smaData.filter(p => p !== null);
        if (validSmaPoints.length >= 2) {
          const lastSma = validSmaPoints[validSmaPoints.length - 1];
          const secondLastSma = validSmaPoints[validSmaPoints.length - 2];
          
          if (lastSma > secondLastSma) {
              currentTrendColor = 'var(--win-color)'; // Trend positivo
          } else if (lastSma < secondLastSma) {
              currentTrendColor = 'var(--loss-color)'; // Trend negativo
          }
        }
    }
    setTrendColor(currentTrendColor);
    
    // 4. Combina i dati per il grafico
    const combinedData = balanceData.map((d, index) => ({
      ...d,
      trend: smaData[index], // 'trend' ora è la Media Mobile
    }));
    
    setLineChartData(combinedData);

    // --- Grafici a torta e barre (invariati) ---
    const outcomes = currentPlays.reduce((acc, play) => {
      acc[play.esito] = (acc[play.esito] || 0) + 1;
      return acc;
    }, {});
    const pieData = Object.keys(outcomes).map(key => ({
      name: key,
      value: outcomes[key],
    }));
    setPieChartData(pieData);

    const monthlyData = currentPlays.reduce((acc, play) => {
      const month = new Date(play.data).toLocaleString('it-IT', { month: 'short', year: '2-digit' });
      if (!acc[month]) {
        acc[month] = { name: month, importo: 0, vincita: 0, date: new Date(play.data) };
      }
      acc[month].importo += play.importo;
      acc[month].vincita += play.vincita;
      return acc;
    }, {});
    
    const barData = Object.values(monthlyData).sort((a,b) => a.date - b.date).map(({name, importo, vincita}) => ({name, importo, vincita}));
    setBarChartData(barData);
  }, []);
  
  // --- Il resto delle funzioni (getPlays, handleAddPlay, ecc.) è invariato ---
  const getTotalPlaysCount = useCallback(async () => {
    const { count, error } = await supabase
      .from('plays')
      .select('*', { count: 'exact', head: true });
    if (!error) setTotalPlaysCount(count || 0);
  }, []);
  const getPlays = useCallback(async () => {
    let query = supabase.from('plays').select('*');
    if (filters.esito !== 'all') { query = query.eq('esito', filters.esito); }
    if (filters.month !== 'all') {
      const [year, month] = filters.month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('data', startDate).lte('data', endDate);
    }
    query = query.order('data', { ascending: false });
    if (filters.count !== 'all') { query = query.limit(parseInt(filters.count)); }
    const { data, error } = await query;
    if (error) console.error("Errore nel caricamento:", error);
    else { setPlays(data); processDataForCharts(data); }
  }, [filters, processDataForCharts]);

  useEffect(() => {
    getPlays();
    getTotalPlaysCount();
  }, [getPlays, getTotalPlaysCount]);

  const handleArchiveAndClear = async () => { 
    const confirmation = window.confirm(
      "ATTENZIONE: Stai per scaricare TUTTE le giocate e cancellarle PERMANENTEMENTE dal database.\n\nQuesta azione non può essere annullata.\n\nSei assolutamente sicuro di voler procedere?"
    );

    if (!confirmation) {
      alert("Azione annullata.");
      return;
    }

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
    
    const { error: deleteError } = await supabase
        .from('plays')
        .delete()
        .neq('id', -1); 

    if (deleteError) {
        alert("Errore durante la pulizia del database. I dati sono stati scaricati ma non eliminati. Contatta il supporto.");
    } else {
        alert("Archiviazione completata con successo! Il database è stato svuotato.");
        getPlays();
        getTotalPlaysCount();
    }
  };
  
  const handleAddPlay = async (play) => { 
    const { error } = await supabase.from('plays').insert([play]); 
    if (!error) {
      getPlays(); 
      getTotalPlaysCount(); 
    }
  };

  const handleUpdatePlay = async (play) => { 
    const { error } = await supabase.from('plays').update(play).eq('id', play.id); 
    if (!error) { 
      setEditingPlay(null); 
      getPlays(); 
    } 
  };

  const handleDeletePlay = async (id) => { 
    if (window.confirm("Sei sicuro?")) { 
      const { error } = await supabase.from('plays').delete().eq('id', id); 
      if (!error) {
        getPlays(); 
        getTotalPlaysCount();
      }
    }
  };

  const handleImportPlays = () => { 
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';

    input.onchange = e => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const csvContent = event.target.result;
        
        try {
          const lines = csvContent.split('\n').filter(line => line.trim() !== '');
          if (lines.length <= 1) {
            alert('Il file CSV è vuoto o contiene solo le intestazioni.');
            return;
          }

          const playsToInsert = lines.slice(1).map(line => {
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g).map(v => v.replace(/"/g, ''));
            const play = {
              data: values[1],
              risultato: values[2],
              quota: parseFloat(values[3]),
              importo: parseFloat(values[4]),
              vincita: parseFloat(values[5]),
              esito: values[6],
            };
            if (!play.data || isNaN(play.quota) || isNaN(play.importo)) {
              throw new Error(`Riga non valida: ${line}`);
            }
            return play;
          });

          const { error } = await supabase.from('plays').insert(playsToInsert);

          if (error) {
            console.error("Errore Supabase:", error);
            alert("Errore durante l'importazione dei dati. Controlla la console per i dettagli.");
          } else {
            alert(`${playsToInsert.length} giocate importate con successo!`);
            getPlays();
            getTotalPlaysCount();
          }
        } catch (err) {
          console.error("Errore Parsing:", err);
          alert("Errore durante la lettura del file CSV. Assicurati che sia formattato correttamente e che i numeri siano validi.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };
  const handleFilterChange = useCallback((newFilters) => { setFilters(prev => ({...prev, ...newFilters})); }, []);
  
  const handleEditClick = (play) => { 
    setEditingPlay(play); 
    formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
  };

  const handleCancelEdit = () => {
    setEditingPlay(null);
  };

  return (
    <div className="app-container">
      <Header 
        onImport={handleImportPlays} 
        onArchive={handleArchiveAndClear}
      />
      <main>
        <section className="dashboard-section">
          <StatsDashboard 
            plays={plays}
            totalPlaysCount={totalPlaysCount}
          />
          <PlaysChart data={lineChartData} trendColor={trendColor} />
          <div className="charts-grid">
            <OutcomePieChart data={pieChartData} />
            <MonthlyBarChart data={barChartData} />
          </div>
        </section>
        
        <section ref={formSectionRef} className="form-section">
            <AddPlayForm 
                onAddPlay={handleAddPlay}
                onUpdatePlay={handleUpdatePlay}
                editingPlay={editingPlay}
                setEditingPlay={setEditingPlay} 
            />
        </section>

        <section className="list-section">
          <Filters onFilterChange={handleFilterChange} />
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

