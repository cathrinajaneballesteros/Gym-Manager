'use client';

import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { Expense } from '@/types/database';

interface CategoryExpenseChartProps {
  expenses: Expense[];
  currency?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Salaries: '#0284c7', // Sky Blue
  Rent: '#059669',     // Emerald
  Utilities: '#0891b2', // Teal
  Equipment: '#d97706', // Amber
  Marketing: '#7c3aed', // Purple
  Maintenance: '#ea580c', // Orange
  Supplies: '#14b8a6', // Mint
  Other: '#64748b',    // Slate
};

export const CategoryExpenseChart: React.FC<CategoryExpenseChartProps> = ({
  expenses,
  currency = '₱',
}) => {
  // Aggregate expenses by category
  const categoryMap = new Map<string, number>();
  let totalExpenses = 0;

  expenses.forEach((e) => {
    const amt = Number(e.amount);
    totalExpenses += amt;
    const prev = categoryMap.get(e.category) || 0;
    categoryMap.set(e.category, prev + amt);
  });

  const sortedCategories = Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalExpenses > 0 ? Math.round((value / totalExpenses) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value);

  if (sortedCategories.length === 0) {
    return (
      <div style={{ height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
        No categorized expenses recorded
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', width: '100%', minHeight: 250 }} className="expense-breakdown-wrapper">
      {/* Left: Donut Chart with Center Text */}
      <div style={{ position: 'relative', width: '180px', height: '220px', flexShrink: 0 }} className="donut-chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={sortedCategories}
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={3}
              dataKey="value"
            >
              {sortedCategories.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CATEGORY_COLORS[entry.name] || '#64748b'}
                  stroke="#ffffff"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
                color: '#0f172a',
              }}
              formatter={(value: any) => [`${currency}${Number(value).toLocaleString()}`, 'Spent']}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Donut Center Totals */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.15 }}>
            {currency}{totalExpenses >= 1000 ? `${(totalExpenses / 1000).toFixed(0)}k` : totalExpenses}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
            Total Expenses
          </div>
        </div>
      </div>

      {/* Right: Category Breakdown Legend List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '0.5rem' }}>
        {sortedCategories.slice(0, 6).map((item) => (
          <div
            key={item.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: CATEGORY_COLORS[item.name] || '#64748b',
                  flexShrink: 0,
                }}
              />
              <span style={{ color: '#334155', fontWeight: 500 }}>{item.name}</span>
            </div>
            <span style={{ color: '#0f172a', fontWeight: 600 }}>
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @media (max-width: 500px) {
          .expense-breakdown-wrapper {
            flex-direction: column !important;
            align-items: center !important;
          }
        }
      `}</style>
    </div>
  );
};
