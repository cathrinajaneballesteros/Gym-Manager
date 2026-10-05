'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  ArrowDownRight,
  ArrowUpRight,
  TrendingDown,
  History,
  Layers,
  BarChart3,
  Download,
  CalendarDays,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { Expense, UserProfile } from '@/types/database';
import { CategoryExpenseChart } from '@/components/charts/CategoryExpenseChart';
import { ExpenseModal } from './ExpenseModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showConfirm, showToast } from '@/lib/ui/swal';
import { getCurrentMonthRangeLabel } from '@/lib/ui/date';
import { escapeHtml } from '@/lib/ui/escape';

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [timeframeFilter, setTimeframeFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'records' | 'historical'>('records');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const pageSize = 8;

  const refreshData = () => {
    setExpenses(DBService.getExpenses());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    refreshData();
  }, []);

  const currency = profile?.currency || '₱';

  const historyMonths = useMemo(() => {
    return DBService.getExpenseHistoryMonths();
  }, [expenses]);

  const historicalSummary = useMemo(() => {
    return DBService.getHistoricalExpenseSummary();
  }, [expenses]);

  const now = new Date();
  const currentY = now.getFullYear();
  const currentM = now.getMonth();
  const thisMonthKey = `${currentY}-${String(currentM + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(currentY, currentM - 1, 1);
  const lastMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.payment_method.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesMethod = methodFilter === 'all' || e.payment_method === methodFilter;

      let matchesTime = true;
      if (timeframeFilter === 'this-month') {
        matchesTime = (e.expense_date || '').startsWith(thisMonthKey);
      } else if (timeframeFilter === 'last-month') {
        matchesTime = (e.expense_date || '').startsWith(lastMonthKey);
      } else if (timeframeFilter === 'last-3-months') {
        const last3Keys = historyMonths.slice(0, 3).map((m) => m.monthKey);
        matchesTime = last3Keys.some((k) => (e.expense_date || '').startsWith(k));
      } else if (timeframeFilter === 'last-6-months') {
        const last6Keys = historyMonths.slice(0, 6).map((m) => m.monthKey);
        matchesTime = last6Keys.some((k) => (e.expense_date || '').startsWith(k));
      } else if (timeframeFilter !== 'all') {
        matchesTime = (e.expense_date || '').startsWith(timeframeFilter);
      }

      return matchesSearch && matchesCategory && matchesMethod && matchesTime;
    });
  }, [expenses, searchQuery, categoryFilter, methodFilter, timeframeFilter, thisMonthKey, lastMonthKey, historyMonths]);

  const periodExpensesTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const allTimeExpensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Top category for active view
  const catSums: Record<string, number> = {};
  filteredExpenses.forEach((e) => {
    catSums[e.category] = (catSums[e.category] || 0) + Number(e.amount);
  });
  let topCategoryName = '—';
  let topCategoryAmount = 0;
  Object.entries(catSums).forEach(([name, amt]) => {
    if (amt > topCategoryAmount) {
      topCategoryAmount = amt;
      topCategoryName = name;
    }
  });
  const topCategoryPct = periodExpensesTotal > 0 ? Math.round((topCategoryAmount / periodExpensesTotal) * 100) : 0;

  const thisMonthExpenses = expenses
    .filter((e) => (e.expense_date || '').startsWith(thisMonthKey))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const lastMonthExpenses = expenses
    .filter((e) => (e.expense_date || '').startsWith(lastMonthKey))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginated = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportHistoricalCSV = () => {
    const headers = ['ID', 'Date', 'Category', 'Title', 'Amount', 'Payment Method', 'Description'];
    const rows = expenses.map((e) => [
      e.id,
      e.expense_date,
      e.category,
      `"${e.title.replace(/"/g, '""')}"`,
      e.amount,
      e.payment_method,
      `"${(e.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Gym_Expenses_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Historical expenses CSV exported successfully!');
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showConfirm(
      'Delete Expense?',
      `Are you sure you want to delete expense record "${title}"? This action cannot be undone.`,
      'Yes, delete',
      '#ef4444'
    );
    if (confirmed) {
      DBService.deleteExpense(id);
      refreshData();
      showToast(`Expense "${escapeHtml(title)}" deleted`);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Expenses
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Track and manage your gym&apos;s expenses.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingExpense(null);
              setIsModalOpen(true);
            }}
            className="btn btn-primary"
          >
            <Plus size={16} />
            <span>Add Expense</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Top 3 Summary Cards */}
      <ScrollReveal delay={40}>
        <div className="grid grid-cols-3 gap-4">
          {/* Selected Period Expenses */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              {timeframeFilter === 'all' ? 'Total Historical Outlay' : 'Selected Period Outlay'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {currency}{periodExpensesTotal.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {timeframeFilter === 'all'
                ? `${expenses.length} records across all history`
                : `${filteredExpenses.length} entries for selected filter`}
            </div>
          </div>

          {/* This Month vs Last Month */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              This Month ({now.toLocaleString('en-US', { month: 'short' })})
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {currency}{thisMonthExpenses.toLocaleString()}
            </div>
            {lastMonthExpenses > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: thisMonthExpenses <= lastMonthExpenses ? '#059669' : '#ef4444', fontWeight: 600 }}>
                {thisMonthExpenses <= lastMonthExpenses ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                <span>
                  {Math.abs(Math.round(((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100))}% vs last month ({currency}{lastMonthExpenses.toLocaleString()})
                </span>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                First month on record
              </div>
            )}
          </div>

          {/* Historical Monthly Baseline Average */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Monthly Baseline Average
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {currency}{historicalSummary.overallMonthlyAverage.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Average across {historicalSummary.monthlyTotals.length} recorded months
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* View Switcher: Ledger vs Historical Analysis */}
      <ScrollReveal delay={60}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #e2e8f0',
            paddingBottom: '0.75rem',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('records')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: activeTab === 'records' ? '#0f172a' : '#ffffff',
                color: activeTab === 'records' ? '#ffffff' : '#64748b',
                border: '1px solid',
                borderColor: activeTab === 'records' ? '#0f172a' : '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              <Receipt size={15} />
              <span>Expense Ledger ({filteredExpenses.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('historical')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 0.85rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                backgroundColor: activeTab === 'historical' ? '#0f172a' : '#ffffff',
                color: activeTab === 'historical' ? '#ffffff' : '#64748b',
                border: '1px solid',
                borderColor: activeTab === 'historical' ? '#0f172a' : '#e2e8f0',
                cursor: 'pointer',
              }}
            >
              <History size={15} />
              <span>Historical Trends & Multi-Month Matrix</span>
            </button>
          </div>

          <button
            onClick={exportHistoricalCSV}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #e2e8f0',
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            <span>Export Historical Ledger CSV</span>
          </button>
        </div>
      </ScrollReveal>

      {/* Content depending on activeTab */}
      {activeTab === 'historical' ? (
        <ScrollReveal delay={80}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* 6-Month Trajectory Cards */}
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
                Monthly Historical Trajectory (Last 6 Months)
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, historicalSummary.monthlyTotals.length)}, 1fr)`, gap: '0.85rem' }}>
                {historicalSummary.monthlyTotals.map((m) => (
                  <div
                    key={m.monthKey}
                    style={{
                      backgroundColor: m.monthKey === thisMonthKey ? '#eff6ff' : '#f8fafc',
                      border: '1px solid',
                      borderColor: m.monthKey === thisMonthKey ? '#bfdbfe' : '#e2e8f0',
                      borderRadius: '10px',
                      padding: '1rem',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {m.month}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: m.monthKey === thisMonthKey ? '#1d4ed8' : '#0f172a', margin: '0.35rem 0' }}>
                      {currency}{m.total.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                      {m.monthKey === thisMonthKey ? 'Current Cycle' : 'Historical'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Month Category Comparison Matrix */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Historical Category Spend Matrix
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Month-by-month expense comparison across operational categories.
                  </p>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.9rem 1.5rem' }}>Category</th>
                      {historicalSummary.monthlyTotals.map((m) => (
                        <th key={m.monthKey} style={{ padding: '0.9rem 1.25rem', textAlign: 'right' }}>
                          {m.month}
                        </th>
                      ))}
                      <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Monthly Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(historicalSummary.categories).map(([catName, catData]) => (
                      <tr
                        key={catName}
                        style={{ borderBottom: '1px solid #f8fafc', transition: 'background-color 0.15s ease' }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.785rem',
                            }}
                          >
                            {catName}
                          </span>
                        </td>
                        {catData.recentMonths.map((rm, idx) => (
                          <td key={idx} style={{ padding: '1rem 1.25rem', textAlign: 'right', color: rm.amount > 0 ? '#0f172a' : '#94a3b8' }}>
                            {rm.amount > 0 ? `${currency}${rm.amount.toLocaleString()}` : '—'}
                          </td>
                        ))}
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 700, color: '#0071e3' }}>
                          {currency}{catData.monthlyAvg.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollReveal>
      ) : (
        <>
          {/* 3. Expense Breakdown Chart Card */}
          <ScrollReveal delay={70}>
            <div className="card">
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
                Expenses by Category
              </h2>
              <CategoryExpenseChart expenses={filteredExpenses} currency={currency} />
            </div>
          </ScrollReveal>

          {/* 4. Filters & Search Bar */}
          <ScrollReveal delay={100}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '0.5rem 0.85rem',
                  width: '100%',
                  maxWidth: '300px',
                }}
              >
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.85rem',
                    color: '#0f172a',
                    width: '100%',
                    padding: 0,
                  }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                {/* Timeframe Filter */}
                <select
                  value={timeframeFilter}
                  onChange={(e) => {
                    setTimeframeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Historical Records</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="last-6-months">Last 6 Months</option>
                  <optgroup label="Specific Historical Months">
                    {historyMonths.map((m) => (
                      <option key={m.monthKey} value={m.monthKey}>
                        {m.monthLabel}
                      </option>
                    ))}
                  </optgroup>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Categories</option>
                  <option value="Rent">Rent</option>
                  <option value="Salaries">Salaries</option>
                  <option value="Utilities">Utilities</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Supplies">Supplies</option>
                  <option value="Other">Other</option>
                </select>

                <select
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '0.5rem 0.85rem',
                    fontSize: '0.85rem',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <option value="all">All Methods</option>
                  <option value="Cash">Cash</option>
                  <option value="GCash">GCash</option>
                </select>
              </div>
            </div>
          </ScrollReveal>

      {/* 5. Recent Expenses Table Card */}
      <ScrollReveal delay={130}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Recent Expenses
            </h2>
          </div>

        {filteredExpenses.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.875rem' }}>
            No expenses found matching the criteria.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Date</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Category</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Description</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Amount</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Method</th>
                  <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: '1px solid #f8fafc',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.5rem', color: '#64748b' }}>
                      {formatDate(exp.expense_date)}
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span
                        style={{
                          padding: '0.25rem 0.65rem',
                          borderRadius: '6px',
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          fontSize: '0.785rem',
                          fontWeight: 600,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {exp.category}
                      </span>
                    </td>

                    <td style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{exp.title}</div>
                      {exp.description && (
                        <div style={{ fontSize: '0.785rem', color: '#64748b' }}>{exp.description}</div>
                      )}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#0f172a' }}>
                      {currency}{Number(exp.amount).toLocaleString()}
                    </td>

                    <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                      {exp.payment_method}
                    </td>

                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setEditingExpense(exp);
                            setIsModalOpen(true);
                          }}
                          style={{
                            padding: '0.35rem',
                            color: '#64748b',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          title="Edit"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id, exp.title)}
                          style={{
                            padding: '0.35rem',
                            color: '#ef4444',
                            borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {filteredExpenses.length > 0 && (
          <div
            style={{
              padding: '1rem 1.5rem',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.825rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              Showing {Math.min((currentPage - 1) * pageSize + 1, filteredExpenses.length)}-
              {Math.min(currentPage * pageSize, filteredExpenses.length)} of {filteredExpenses.length}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  color: currentPage === 1 ? '#cbd5e1' : '#334155',
                  backgroundColor: '#ffffff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: currentPage === page ? 700 : 500,
                    color: currentPage === page ? '#ffffff' : '#334155',
                    backgroundColor: currentPage === page ? '#0f172a' : '#ffffff',
                    border: '1px solid',
                    borderColor: currentPage === page ? '#0f172a' : '#e2e8f0',
                    cursor: 'pointer',
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '0.35rem 0.5rem',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  color: currentPage === totalPages ? '#cbd5e1' : '#334155',
                  backgroundColor: '#ffffff',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
      </ScrollReveal>
      </>
      )}

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingExpense(null);
          refreshData();
        }}
        initialExpense={editingExpense}
      />
    </div>
  );
};
