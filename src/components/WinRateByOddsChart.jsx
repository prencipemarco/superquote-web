import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import './WinRateByOddsChart.css';

function WinRateByOddsChart({ data }) {
    if (!data || data.length === 0) {
        return <div className="no-data">Nessun dato per il grafico Win Rate/Quote</div>;
    }

    return (
        <div className="chart-container">
            <h3>Win Rate per Range di Quota</h3>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="range"
                            stroke="var(--text-color-light)"
                            tick={{ fill: 'var(--text-color-light)', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        />
                        <YAxis
                            stroke="var(--text-color-light)"
                            tick={{ fill: 'var(--text-color-light)', fontSize: 12 }}
                            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                            unit="%"
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: 'var(--card-bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                            itemStyle={{ color: 'var(--text-color)' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="winRate" name="Win Rate (%)" radius={[4, 4, 0, 0]} barSize={60}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.winRate >= 50 ? 'var(--win-color)' : (entry.winRate >= 30 ? 'var(--secondary-color)' : 'var(--loss-color)')} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export default WinRateByOddsChart;
