import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabaseClient';
import Header from './components/Header';
import StatsDashboard from './components/StatsDashboard';
import PlaysChart from './components/PlaysChart';
import Filters from './components/Filters';
import PlaysList from './components/PlaysList';
import AddPlayForm from './components/AddPlayForm';
import './index.css';

function App() {
  const [plays, setPlays] = useState([]);
  const [editingPlay, setEditingPlay] = useState(null);
  const [filters, setFilters] = useState({ count: 'all', month: 'all' });
  const [chartData, setChartData] = useState([]);
  const [trendColor, setTrendColor] = useState('#888');

  // --- Funzioni di calcolo per il grafico ---

  // Calcola la regressione lineare per trovare il trend
  const calculateLinearRegression = (data) => {
    const n = data.length;
    if (n < 2) return { slope: 0, intercept: data.length > 0 ? data[0].y : 0 };

    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
    data.forEach(point => {
        sumX += point.x;
        sumY += point.y;
        sumXY += point.x * point.y;
        sumXX += point.x * point.x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };
  
  // Prepara i dati per essere usati dal grafico
  const processDataForChart = useCallback((currentPlays) => {
    if (currentPlays.length === 0) {
      setChartData([]);
      return;
    }

    // Ordina le giocate dalla più vecchia alla più recente per calcolare il saldo
    const sortedPlays = [...currentPlays].sort((a, b) => new Date(a.data) - new Date(b.data));

    let cumulativeBalance = 0;
    const balanceData = sortedPlays.map(play => {
      const profit = play.vincita - play.importo;
      cumulativeBalance += profit;
      return { data: play.data, saldo: cumulativeBalance };
    });

    // Prepara i dati per la regressione lineare (x=indice, y=saldo)
    const regressionPoints = balanceData.map((d, index) => ({ x: index, y: d.saldo }));
    const { slope, intercept } = calculateLinearRegression(regressionPoints);
    
    setTrendColor(slope >= 0 ? '#4caf50' : '#f44336'); // Verde se sale, rosso se scende

    // Estende il trend nel futuro per la predizione (es. 5 punti futuri)
    const lastPlayDate = new Date(sortedPlays[sortedPlays.length - 1].data);
    const futurePoints = [];
    for (let i = 1; i <= 5; i++) {
        const futureDate = new Date(lastPlayDate);
        futureDate.setDate(lastPlayDate.getDate() + i * 3); // Aggiunge qualche giorno per punto
        futurePoints.push({
            data: futureDate.toISOString().split('T')[0],
            saldo: null, // Saldo reale è nullo nel futuro
            trend: slope * (regressionPoints.length - 1 + i) + intercept,
        });
    }

    const combinedData = balanceData.map((d, index) => ({
      ...d,
      trend: slope * index + intercept,
    })).concat(futurePoints);

    setChartData(combinedData);
  }, []);


  // --- Funzioni CRUD e di Fetching ---
  
  const getPlays = useCallback(async () => {
    let query = supabase.from('plays').select('*');

    // Applica filtro per mese
    if (filters.month !== 'all') {
      const [year, month] = filters.month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('data', startDate).lte('data', endDate);
    }

    // Ordina sempre per data per la visualizzazione della lista (più recenti in alto)
    query = query.order('data', { ascending: false });

    // Applica filtro per numero di giocate
    if (filters.count !== 'all') {
      query = query.limit(parseInt(filters.count));
    }
    
    const { data, error } = await query;

    if (error) {
      console.error("Errore nel caricamento delle giocate:", error);
    } else {
      setPlays(data);
      processDataForChart(data); // Aggiorna i dati del grafico dopo il fetch
    }
  }, [filters, processDataForChart]);

  useEffect(() => {
    getPlays();
  }, [getPlays]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
  }, []);

  const handleAddPlay = async (play) => {
    const { id, ...playData } = play; 
    const { data, error } = await supabase.from('plays').insert([playData]).select();
    if (error) console.error("Errore nell'aggiunta:", error);
    else if (data) getPlays();
  };

  const handleUpdatePlay = async (updatedPlay) => {
    const { data, error } = await supabase.from('plays').update(updatedPlay).eq('id', updatedPlay.id).select();
    if (error) console.error("Errore nell'aggiornamento:", error);
    else if (data) {
      setEditingPlay(null);
      getPlays();
    }
  };

  const handleDeletePlay = async (id) => {
    if (window.confirm("Sei sicuro di voler eliminare questa giocata?")) {
      const { error } = await supabase.from('plays').delete().eq('id', id);
      if (error) console.error("Errore nell'eliminazione:", error);
      else getPlays();
    }
  };
  
  const handleEditClick = (play) => {
    setEditingPlay(play);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportPlays = () => {
    if (plays.length === 0) {
      alert("Nessuna giocata da esportare.");
      return;
    }
    const headers = ['id', 'data', 'risultato', 'quota', 'importo', 'vincita', 'esito'];
    const headerString = headers.join(',');
    const csvRows = plays.map(row => 
        headers.map(fieldName => `"${String(row[fieldName] ?? '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = [headerString, ...csvRows].join('\r\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'giocate.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        const csv = event.target.result;
        const lines = csv.split(/\r\n|\n/);
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const playsToInsert = lines.slice(1).map(line => {
          const data = line.split(',');
          return headers.reduce((obj, nextKey, index) => {
            if (nextKey === 'id' || !nextKey) return obj;
            let value = (data[index] || '').trim().replace(/"/g, '');
            if (['quota', 'importo', 'vincita'].includes(nextKey)) {
                value = parseFloat(value) || 0;
            }
            obj[nextKey] = value;
            return obj;
          }, {});
        }).filter(p => p.data);

        if(playsToInsert.length > 0 && window.confirm(`Stai per importare ${playsToInsert.length} giocate. Continuare?`)){
            const { error } = await supabase.from('plays').insert(playsToInsert);
            if(error) alert('Errore durante l\'importazione: ' + error.message);
            else {
                alert('Importazione completata con successo!');
                getPlays();
            }
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
          <PlaysChart data={chartData} trendColor={trendColor} />
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

