'use client';

import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MonthlyTrendData } from '@/types/database';

interface ProfitTrendChartProps {
  data: MonthlyTrendData[];
  currency?: string;
}

export const ProfitTrendChart: React.FC<ProfitTrendChartProps> = ({
  data,
  currency = '₱',
}) => {
  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="neonVoltGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4ff00" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#d4ff00" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="month"
            stroke="#54647d"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'rgba(255, 255, 255, 0.08)' }}
            fontFamily="var(--font-mono)"
          />
          <YAxis
            stroke="#54647d"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            fontFamily="var(--font-mono)"
            tickFormatter={(val) => `${currency}${(val / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0c1018',
              border: '1px solid rgba(212, 255, 0, 0.3)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            }}
            formatter={(value: any) => [`${currency}${Number(value).toLocaleString()}`, 'Net Margin']}
            labelStyle={{ color: '#8b9bb4', fontWeight: 700 }}
          />
          <Area
            type="monotone"
            dataKey="profit"
            name="Net Profit"
            stroke="#d4ff00"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#neonVoltGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
