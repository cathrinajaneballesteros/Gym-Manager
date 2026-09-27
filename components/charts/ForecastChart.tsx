'use client';

import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { RevenueForecastPoint } from '@/types/ai';

interface ForecastChartProps {
  data: RevenueForecastPoint[];
  currency?: string;
}

export const ForecastChart: React.FC<ForecastChartProps> = ({
  data,
  currency = '₱',
}) => {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 15, left: -5, bottom: 0 }}>
          <defs>
            <linearGradient id="cyberForecastArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.28} />
              <stop offset="95%" stopColor="#00f0ff" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
          <XAxis
            dataKey="period"
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
              border: '1px solid rgba(0, 240, 255, 0.35)',
              borderRadius: '6px',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
            }}
            formatter={(value: any, name: any) => [
              `${currency}${Number(value).toLocaleString()}`,
              name === 'projectedRevenue' ? 'Projected Velocity' : name,
            ]}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}
          />
          <Area
            type="monotone"
            dataKey="upperConfidence"
            name="Confidence Spread"
            stroke="transparent"
            fill="url(#cyberForecastArea)"
          />
          <Line
            type="monotone"
            dataKey="projectedRevenue"
            name="AI Projection Trajectory"
            stroke="#00f0ff"
            strokeWidth={3}
            dot={{ r: 4, fill: '#00f0ff', stroke: '#080a0f', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
