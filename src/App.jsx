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

  const processDataForCharts = useCallback((currentPlays) => {
    if (currentPlays.length === 0) {
      setLineChartData([]);
      setPieChartData([]);
      setBarChartData([]);
      return;
    }
    const sortedPlays = [...currentPlays].sort((a, b) => new Date(a.data) - new Date(b.data));
    let cumulativeBalance = 0;
    const balanceData = sortedPlays.map(play => {
      cumulativeBalance += (play.vincita - play.importo);
      return { data: play.data, saldo: cumulativeBalance };
    });
    
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
    
    const combinedData = balanceData.map((d, index) => ({
      ...d,
      trend: slope * index + intercept,
    }));
    setLineChartData(combinedData);

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

  useEffect(() => { getPlays(); }, [getPlays]);

  // --- FUNZIONE DI IMPORTAZIONE CORRETTA ---
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
            // Validazione base
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

  const handleArchiveAndClear = async () => {
    // ... logica archiviazione invariata ...
  };
  
  const handleFilterChange = useCallback((newFilters) => { setFilters(prev => ({...prev, ...newFilters})); }, []);
  const handleAddPlay = async (play) => { const { error } = await supabase.from('plays').insert([play]); if (!error) getPlays(); };
  const handleUpdatePlay = async (play) => { const { error } = await supabase.from('plays').update(play).eq('id', play.id); if (!error) { setEditingPlay(null); getPlays(); } };
  const handleDeletePlay = async (id) => { if (window.confirm("Sei sicuro?")) { const { error } = await supabase.from('plays').delete().eq('id', id); if (!error) getPlays(); }};
  const handleEditClick = (play) => { setEditingPlay(play); formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="app-container">
      <Header 
        onImport={handleImportPlays} 
        onArchive={handleArchiveAndClear}
      />
      <main>
        <section className="dashboard-section">
          <StatsDashboard plays={plays} />
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

