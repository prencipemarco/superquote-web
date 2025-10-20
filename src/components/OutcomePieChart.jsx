import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import './OutcomePieChart.css';

const COLORS = {
  'Vinta': '#4caf50',
  'Persa': '#f44336',
  'In attesa': '#ff9800',
};

function OutcomePieChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="chart-card empty">
        <p>Nessun dato per il grafico a torta.</p>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <h3>Riepilogo Esiti</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'var(--card-bg-color)', 
              border: '1px solid var(--border-color)'
            }}
          />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OutcomePieChart;
