import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { FinancialMetrics, CurrencyConfig } from '../types';

interface AnalysisChartProps {
  metrics: FinancialMetrics;
  currency: CurrencyConfig;
  isDarkMode?: boolean;
}

const AnalysisChart: React.FC<AnalysisChartProps> = ({ metrics, currency, isDarkMode = false }) => {
  const data = [
    { name: 'Revenue', amount: metrics.annualRevenue, color: '#10b981' }, // Green
    { name: 'Expenses', amount: metrics.annualExpenses, color: '#f59e0b' }, // Amber
    { name: 'Net Profit', amount: metrics.netProfit, color: '#3b82f6' }, // Blue
  ];

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      maximumFractionDigits: 0,
      notation: 'compact' 
    }).format(val);
  };

  const textColor = isDarkMode ? '#cbd5e1' : '#64748b';
  const gridColor = isDarkMode ? '#334155' : '#e2e8f0';
  const tooltipBg = isDarkMode ? '#1e293b' : '#ffffff';
  const tooltipText = isDarkMode ? '#f8fafc' : '#1e293b';

  return (
    <div className="h-64 w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: textColor, fontSize: 12 }} 
            tickFormatter={formatMoney}
          />
          <Tooltip 
            cursor={{ fill: 'transparent' }}
            formatter={(value: number) => [formatMoney(value), 'Amount']}
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              backgroundColor: tooltipBg,
              color: tooltipText
            }}
            itemStyle={{ color: tooltipText }}
          />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AnalysisChart;