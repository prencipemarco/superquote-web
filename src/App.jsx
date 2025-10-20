import React, { useState, useEffect, useCallback } from 'react';
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
  
  // State per i dati dei grafici
  const [lineChartData, setLineChartData] = useState([]);
  const [trendColor, setTrendColor] = useState('#888');
  const [pieChartData, setPieChartData] = useState([]);
  const [barChartData, setBarChartData] = useState([]);

  // --- Funzioni di calcolo per i grafici ---
  const processDataForCharts = useCallback((currentPlays) => {
    if (currentPlays.length === 0) {
      setLineChartData([]);
      setPieChartData([]);
      setBarChartData([]);
      return;
    }

    // 1. Dati per Grafico a Linea (Andamento Saldo)
    const sortedPlays = [...currentPlays].sort((a, b) => new Date(a.data) - new Date(b.data));
    let cumulativeBalance = 0;
    const balanceData = sortedPlays.map(play => {
      cumulativeBalance += (play.vincita - play.importo);
      return { data: play.data, saldo: cumulativeBalance };
    });
    
    // Calcolo Regressione Lineare
    const regressionPoints = balanceData.map((d, index) => ({ x: index, y: d.saldo }));
    const n = regressionPoints.length;
    let slope = 0, intercept = 0;
    if (n >= 2) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      regressionPoints.forEach(p => { sumX += p.x; sumY += p.y; sumXY += p.x * p.y; sumXX += p.x * p.x; });
      slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      intercept = (sumY - slope * sumX) / n;
    }
    
    setTrendColor(slope >= 0 ? 'var(--win-color)' : 'var(--loss-color)');
    
    // Predizione: Estende il trend nel futuro per la predizione (es. 5 punti futuri)
    const lastPlayDate = sortedPlays.length > 0 ? new Date(sortedPlays[sortedPlays.length - 1].data) : new Date();
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

    setLineChartData(combinedData);

    // 2. Dati per Grafico a Torta (Esiti)
    const outcomes = currentPlays.reduce((acc, play) => {
      acc[play.esito] = (acc[play.esito] || 0) + 1;
      return acc;
    }, {});
    const pieData = Object.keys(outcomes).map(key => ({
      name: key,
      value: outcomes[key],
    }));
    setPieChartData(pieData);

    // 3. Dati per Grafico a Colonne (Mensile)
    const monthlyData = currentPlays.reduce((acc, play) => {
      const monthYear = new Date(play.data).toLocaleString('it-IT', { month: 'short', year: 'numeric' });
      if (!acc[monthYear]) {
        acc[monthYear] = { name: monthYear, importo: 0, vincita: 0, date: new Date(play.data) };
      }
      acc[monthYear].importo += play.importo;
      acc[monthYear].vincita += play.vincita;
      return acc;
    }, {});
    
    const barData = Object.values(monthlyData).sort((a,b) => a.date - b.date).map(({name, importo, vincita}) => ({name, importo, vincita}));
    setBarChartData(barData);

  }, []);

  const getPlays = useCallback(async () => {
    let query = supabase.from('plays').select('*');

    if (filters.esito !== 'all') {
      query = query.eq('esito', filters.esito);
    }
    if (filters.month !== 'all') {
      const [year, month] = filters.month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split('T')[0];
      query = query.gte('data', startDate).lte('data', endDate);
    }
    query = query.order('data', { ascending: false });
    if (filters.count !== 'all') {
      query = query.limit(parseInt(filters.count));
    }
    
    const { data, error } = await query;
    if (error) console.error("Errore nel caricamento:", error);
    else {
      setPlays(data);
      processDataForCharts(data);
    }
  }, [filters, processDataForCharts]);

  useEffect(() => {
    getPlays();
  }, [getPlays]);

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(prev => ({...prev, ...newFilters}));
  }, []);
  
  // Le altre funzioni (handleAddPlay, handleUpdatePlay, ecc.) rimangono invariate
  const handleAddPlay = async (play) => { 
    const { data, error } = await supabase.from('plays').insert([play]).select();
    if (!error) getPlays(); 
    else console.error("Errore nell'aggiunta:", error);
  };
  const handleUpdatePlay = async (play) => { 
    const { data, error } = await supabase.from('plays').update(play).eq('id', play.id).select();
    if (!error) { 
      setEditingPlay(null); 
      getPlays(); 
    } else console.error("Errore nell'aggiornamento:", error);
  };
  const handleDeletePlay = async (id) => { 
    if (window.confirm("Sei sicuro?")) { 
      const { error } = await supabase.from('plays').delete().eq('id', id); 
      if (!error) getPlays(); 
      else console.error("Errore nell'eliminazione:", error);
    }
  };
  const handleEditClick = (play) => { 
    setEditingPlay(play); 
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); 
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
          <PlaysChart data={lineChartData} trendColor={trendColor} />
          <div className="charts-grid"> {/* Nuovo wrapper per i due grafici */}
            <OutcomePieChart data={pieChartData} />
            <MonthlyBarChart data={barChartData} />
          </div>
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

