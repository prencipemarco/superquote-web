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
    
    const combinedData = balanceData.map((d, index) => ({
      ...d,
      trend: slope * index + intercept,
    }));
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
  const handleAddPlay = async (play) => { const { error } = await supabase.from('plays').insert([play]); if (!error) getPlays(); };
  const handleUpdatePlay = async (play) => { const { error } = await supabase.from('plays').update(play).eq('id', play.id); if (!error) { setEditingPlay(null); getPlays(); } };
  const handleDeletePlay = async (id) => { if (window.confirm("Sei sicuro?")) { const { error } = await supabase.from('plays').delete().eq('id', id); if (!error) getPlays(); }};
  const handleEditClick = (play) => { setEditingPlay(play); window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); };
  const handleExportPlays = () => { /* ... logica invariata ... */ };
  const handleImportPlays = () => { /* ... logica invariata ... */ };


  return (
    <div className="app-container">
      <Header onImport={handleImportPlays} onExport={handleExportPlays} />
      <main>
        <section className="dashboard-section">
          <StatsDashboard plays={plays} />
          <PlaysChart data={lineChartData} trendColor={trendColor} />
          <div className="charts-grid">
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

