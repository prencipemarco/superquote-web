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
import WinRateByOddsChart from './components/WinRateByOddsChart';
import WinProbabilityEstimator from './components/WinProbabilityEstimator';
import PasswordProtection from './components/PasswordProtection';
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
  const [winRateChartData, setWinRateChartData] = useState([]);

  const formSectionRef = useRef(null);

  // --- Funzione Core Aggiornata ---
  const processDataForCharts = useCallback((currentPlays) => {
    if (currentPlays.length === 0) {
      setLineChartData([]);
      setPieChartData([]);
      setBarChartData([]);
      setWinRateChartData([]);
      return;
    }

    // 1. Calcola il saldo cumulativo
    const sortedPlays = [...currentPlays].sort((a, b) => new Date(a.data) - new Date(b.data));
    let cumulativeBalance = 0;
    const balanceData = sortedPlays.map(play => {
      cumulativeBalance += (play.vincita - play.importo);
      return { data: play.data, saldo: cumulativeBalance };
    });

    // 2. --- NUOVA LOGICA: MEDIA MOBILE ESPONENZIALE (EMA) ---
    // Dà più peso ai dati recenti, rendendo il trend più reattivo.
    const emaPeriod = 5; // Periodo per il calcolo del moltiplicatore
    const smoothing = 2; // Fattore di smorzamento standard
    const multiplier = smoothing / (1 + emaPeriod);

    const emaData = [];
    let previousEma = null;

    for (let i = 0; i < balanceData.length; i++) {
      if (i < emaPeriod - 1 || previousEma === null) {
        // Inizia la EMA con una semplice media mobile (SMA) per il primo valore
        if (i === emaPeriod - 1) {
          let sum = 0;
          for (let j = 0; j < emaPeriod; j++) {
            sum += balanceData[i - j].saldo;
          }
          previousEma = sum / emaPeriod;
          emaData.push(previousEma);
        } else {
          emaData.push(null); // Non ci sono ancora abbastanza dati
        }
      } else {
        // Calcola la EMA
        // EMA = (ValoreCorrente * moltiplicatore) + (EMAPrecedente * (1 - moltiplicatore))
        const currentEma = (balanceData[i].saldo * multiplier) + (previousEma * (1 - multiplier));
        emaData.push(currentEma);
        previousEma = currentEma; // Aggiorna la EMA precedente per il prossimo ciclo
      }
    }


    // 3. Imposta il colore del trend in base alla direzione della EMA
    let currentTrendColor = 'var(--text-color-light)'; // Grigio di default
    if (emaData.length >= 2) {
      // Prende gli ultimi due punti validi della media mobile
      const validEmaPoints = emaData.filter(p => p !== null);
      if (validEmaPoints.length >= 2) {
        const lastEma = validEmaPoints[validEmaPoints.length - 1];
        const secondLastEma = validEmaPoints[validEmaPoints.length - 2];

        if (lastEma > secondLastEma) {
          currentTrendColor = 'var(--win-color)'; // Trend positivo
        } else if (lastEma < secondLastEma) {
          currentTrendColor = 'var(--loss-color)'; // Trend negativo
        }
      }
    }
    setTrendColor(currentTrendColor);

    // 4. Combina i dati per il grafico
    const combinedData = balanceData.map((d, index) => ({
      ...d,
      trend: emaData[index], // 'trend' ora è la EMA
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

    const barData = Object.values(monthlyData).sort((a, b) => a.date - b.date).map(({ name, importo, vincita }) => ({ name, importo, vincita }));
    setBarChartData(barData);

    // --- NUOVO: Win Rate per Range di Quota ---
    const ranges = [
      { min: 1.00, max: 1.49, label: "1.00-1.49" },
      { min: 1.50, max: 1.99, label: "1.50-1.99" },
      { min: 2.00, max: 2.49, label: "2.00-2.49" },
      { min: 2.50, max: 2.99, label: "2.50-2.99" },
      { min: 3.00, max: 9999, label: "3.00+" },
    ];

    const rangeStats = ranges.map(range => {
      const playsInRange = currentPlays.filter(p => p.quota >= range.min && p.quota <= range.max);
      const total = playsInRange.length;
      const wins = playsInRange.filter(p => p.esito === 'Vinta').length;
      const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0;

      return {
        range: range.label,
        winRate: winRate,
        total: total,
        wins: wins
      };
    }).filter(stat => stat.total > 0); // Mostra solo i range con giocate effettive

    setWinRateChartData(rangeStats);
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

  const handleDownloadData = async () => {
    const { data: allPlays, error: fetchError } = await supabase
      .from('plays')
      .select('*')
      .order('data', { ascending: true });

    if (fetchError || !allPlays) {
      alert("Errore nel caricamento dei dati per il download. Riprova.");
      return;
    }

    if (allPlays.length === 0) {
      alert("Nessuna giocata da scaricare.");
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
    link.setAttribute("download", `export_giocate_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
  };

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

  const handleResetData = async () => {
    const confirmation = window.confirm(
      "ATTENZIONE: Stai per CANCELLARE TUTTE le giocate dal database SENZA scaricarle.\n\nQuesta azione è IRREVERSIBILE.\n\nSei sicuro di voler resettare tutto?"
    );

    if (confirmation) {
      const { error } = await supabase
        .from('plays')
        .delete()
        .neq('id', -1);

      if (error) {
        alert("Errore durante il reset del database.");
      } else {
        alert("Database resettato correttemente.");
        getPlays();
        getTotalPlaysCount();
      }
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
  const handleFilterChange = useCallback((newFilters) => { setFilters(prev => ({ ...prev, ...newFilters })); }, []);

  const handleEditClick = (play) => {
    setEditingPlay(play);
    formSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingPlay(null);
  };

  return (
    <PasswordProtection>
      <div className="app-container">
        <Header
          onImport={handleImportPlays}
          onArchive={handleArchiveAndClear}
          onDownload={handleDownloadData}
          onReset={handleResetData}
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
            <WinRateByOddsChart data={winRateChartData} />
          </section>

          <section ref={formSectionRef} className="form-section">
            <WinProbabilityEstimator />
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
    </PasswordProtection>
  );
}

export default App;

