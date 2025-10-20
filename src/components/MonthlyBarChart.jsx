import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from 'recharts';
import './MonthlyBarChart.css'; // Mantiene il riferimento al CSS

function MonthlyBarChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card empty">
        <p>Nessun dato per il grafico mensile.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3>Importi/Vincite Mensili</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis dataKey="name" stroke="var(--text-color-light)" />
          <YAxis stroke="var(--text-color-light)" tickFormatter={(value) => `${value}€`} />
          <Tooltip 
            cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            contentStyle={{ 
              backgroundColor: 'var(--card-bg-color)', 
              border: '1px solid var(--border-color)', 
              borderRadius: 'var(--border-radius-small)' 
            }}
            labelStyle={{ color: 'var(--text-color-light)' }}
            itemStyle={{ fontWeight: 'bold', color: 'var(--text-color)' }}
          />
          <Legend />
          <Bar dataKey="importo" name="Importo Scommesso" fill="var(--loss-color)" barSize={30} /> {/* barSize ridotto */}
          <Bar dataKey="vincita" name="Importo Vinto" fill="var(--win-color)" barSize={30} /> {/* barSize ridotto */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MonthlyBarChart;

