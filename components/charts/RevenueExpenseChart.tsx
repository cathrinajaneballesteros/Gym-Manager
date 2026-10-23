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
import { formatCompactAmount } from '@/lib/ui/format';
import { getTodayKey } from '@/lib/ui/date';

interface RevenueExpenseChartProps {
  data: MonthlyTrendData[];
  currency?: string;
}

const REVENUE_COLOR = '#0284c7';
// Red like the expense cards and calendar, so money going out reads the same everywhere.
const EXPENSE_COLOR = '#ef4444';

const Dot: React.FC<{ color: string }> = ({ color }) => (
  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
);

// Names every value and adds the profit, which is what the chart is really asking.
const TrendTooltip: React.FC<{ point?: MonthlyTrendData; label?: string; currency: string }> = ({ point, label, currency }) => {
  if (!point) return null;
  const money = (n: number) => `${currency}${Math.abs(n).toLocaleString()}`;
  const rows = [
    { name: 'Revenue', value: money(point.revenue), color: REVENUE_COLOR, valueColor: '#0f172a' },
    { name: 'Expenses', value: money(point.expenses), color: EXPENSE_COLOR, valueColor: '#0f172a' },
    {
      name: 'Profit',
      value: `${point.profit > 0 ? '+' : point.profit < 0 ? '-' : ''}${money(point.profit)}`,
      color: point.profit < 0 ? EXPENSE_COLOR : '#059669',
      valueColor: point.profit < 0 ? EXPENSE_COLOR : '#059669',
    },
  ];
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
        padding: '0.55rem 0.75rem',
        minWidth: '150px',
      }}
    >
      <div style={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
      {rows.map((row) => (
        <div key={row.name} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '1px 0' }}>
          <Dot color={row.color} />
          <span style={{ color: '#475569', flex: 1 }}>{row.name}</span>
          <strong style={{ color: row.valueColor }}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
};

// Month label under the chart. This month's "(so far)" goes on a second, smaller line, so all six months fit on a phone.
const MonthTick = ({ x = 0, y = 0, payload }: { x?: number; y?: number; payload?: { value?: string } }) => {
  const [month, note] = String(payload?.value ?? '').split(' (');
  return (
    <g transform={`translate(${x},${y})`}>
      <text dy={12} textAnchor="middle" fill="#94a3b8" fontSize={11}>
        {month}
      </text>
      {note && (
        <text dy={24} textAnchor="middle" fill="#94a3b8" fontSize={9}>
          ({note}
        </text>
      )}
    </g>
  );
};

export const RevenueExpenseChart: React.FC<RevenueExpenseChartProps> = ({
  data,
  currency = '₱',
}) => {
  // This month isn't over yet, so say so instead of letting it look like a drop.
  const thisMonthKey = getTodayKey().slice(0, 7);
  const chartData = data.map((d) => (d.monthKey === thisMonthKey ? { ...d, month: `${d.month} (so far)` } : d));

  return (
    <div style={{ width: '100%' }}>
      {/* Chart Legend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.25rem', marginBottom: '0.75rem', fontSize: '0.8rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Dot color={REVENUE_COLOR} />
          <span style={{ color: '#475569', fontWeight: 500 }}>Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Dot color={EXPENSE_COLOR} />
          <span style={{ color: '#475569', fontWeight: 500 }}>Expenses</span>
        </div>
      </div>

      {/* Own height below the legend, so the month labels don't run into the card's edge. */}
      <div style={{ width: '100%', height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          {/* Extra right margin so the last month's "(so far)" isn't cut off at the edge. */}
          <AreaChart data={chartData} margin={{ top: 5, right: 22, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={REVENUE_COLOR} stopOpacity={0.15} />
                <stop offset="95%" stopColor={REVENUE_COLOR} stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.08} />
                <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#f1f5f9' }}
              interval={0}
              height={36}
              tick={<MonthTick />}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => formatCompactAmount(val, currency)}
            />
            <Tooltip
              content={({ payload, label }) => (
                <TrendTooltip
                  point={payload?.[0]?.payload as MonthlyTrendData | undefined}
                  label={label == null ? undefined : String(label)}
                  currency={currency}
                />
              )}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              name="Revenue"
              stroke={REVENUE_COLOR}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              name="Expenses"
              stroke={EXPENSE_COLOR}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorExpenses)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
