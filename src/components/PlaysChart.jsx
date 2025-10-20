import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import './PlaysChart.css';

// Riceve i dati processati e il colore del trend come props
function PlaysChart({ data, trendColor }) {
  if (!data || data.length === 0) {
    return (
      <div className="plays-chart-container empty">
        <p>Nessun dato da visualizzare. Aggiungi qualche giocata per vedere il grafico.</p>
      </div>
    );
  }

  // Formatta il valore per il tooltip
  const formatTooltip = (value) => `${value.toFixed(2)} €`;
  // Formatta la data per l'asse X
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
  };


  return (
    <div className="plays-chart-container">
        <h3>Andamento Saldo</h3>
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="data" tickFormatter={formatDate} />
                <YAxis tickFormatter={(value) => `${value}€`} />
                <Tooltip
                    formatter={formatTooltip}
                    labelStyle={{ color: '#333' }}
                    itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Line
                    type="monotone"
                    dataKey="saldo"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                    name="Saldo Reale"
                />
                <Line
                    type="monotone"
                    dataKey="trend"
                    stroke={trendColor}
                    strokeWidth={2}
                    strokeDasharray="5 5" // Linea tratteggiata
                    dot={false}
                    name="Andamento Futuro (Trend)"
                />
            </LineChart>
        </ResponsiveContainer>
    </div>
  );
}

export default PlaysChart;

