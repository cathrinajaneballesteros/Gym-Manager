'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Receipt,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit,
  ArrowDownRight,
  ArrowUpRight,
  ArrowRight,
  History,
  Download,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { Expense, UserProfile } from '@/types/database';
import { CategoryExpenseChart } from '@/components/charts/CategoryExpenseChart';
import { ExpenseModal } from './ExpenseModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showConfirm, showError, showToast } from '@/lib/ui/swal';
import { getRecentMonthKeys, getTodayKey, formatDisplayDate } from '@/lib/ui/date';
import { downloadCSV } from '@/lib/ui/csv';
import { getPageWindow } from '@/lib/ui/pagination';

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

  useGymDataRefresh(refreshData);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
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
        matchesTime = getRecentMonthKeys(3).includes((e.expense_date || '').slice(0, 7));
      } else if (timeframeFilter === 'last-6-months') {
        matchesTime = getRecentMonthKeys(6).includes((e.expense_date || '').slice(0, 7));
      } else if (timeframeFilter !== 'all') {
        matchesTime = (e.expense_date || '').startsWith(timeframeFilter);
      }

      return matchesSearch && matchesCategory && matchesMethod && matchesTime;
    })
    // Newest expense date first; same-day entries by when they were added.
    .sort(
      (a, b) =>
        (b.expense_date || '').localeCompare(a.expense_date || '') ||
        (b.created_at || '').localeCompare(a.created_at || '')
    );
  }, [expenses, searchQuery, categoryFilter, methodFilter, timeframeFilter, thisMonthKey, lastMonthKey]);

  const periodExpensesTotal = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const thisMonthExpenses = expenses
    .filter((e) => (e.expense_date || '').startsWith(thisMonthKey))
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // This month is still in progress, so compare with the same days of last month.
  const lastMonthSameDayKey = `${lastMonthKey}-${String(now.getDate()).padStart(2, '0')}`;
  const lastMonthExpenses = expenses
    .filter((e) => (e.expense_date || '').startsWith(lastMonthKey) && (e.expense_date || '') <= lastMonthSameDayKey)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  // After a delete the last page can disappear; go back to the last page that still exists.
  if (currentPage > totalPages) setCurrentPage(totalPages);
  const paginated = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportHistoricalCSV = () => {
    const headers = ['ID', 'Date', 'Category', 'Title', 'Amount', 'Payment Method', 'Description'];
    const rows = filteredExpenses.map((e) => [
      e.id,
      e.expense_date,
      e.category,
      e.title,
      Number(e.amount),
      e.payment_method,
      e.description,
    ]);
    downloadCSV(`Gym_Expenses_${getTodayKey()}.csv`, [headers, ...rows]);
    showToast('Expenses CSV exported successfully!');
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showConfirm(
      'Delete Expense?',
      `Delete "${title}"? This can't be undone.`,
      'Yes, delete',
      '#ef4444'
    );
    if (confirmed) {
      try {
        await DBService.deleteExpense(id);
      } catch (err) {
        showError('Delete Failed', err instanceof Error ? err.message : 'Could not delete the expense.');
        return;
      }
      refreshData();
      showToast(`Expense "${title}" deleted`);
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
              {timeframeFilter === 'all' ? 'Total Spent' : 'Spent in This Period'}
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              -{currency}{periodExpensesTotal.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {timeframeFilter === 'all'
                ? `${expenses.length} ${expenses.length === 1 ? 'expense' : 'expenses'} in total`
                : `${filteredExpenses.length} ${filteredExpenses.length === 1 ? 'expense' : 'expenses'} in this period`}
            </div>
          </div>

          {/* This Month vs Last Month */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              This Month ({now.toLocaleString('en-US', { month: 'short' })})
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              -{currency}{thisMonthExpenses.toLocaleString()}
            </div>
            {lastMonthExpenses > 0 ? (
              (() => {
                const diff = thisMonthExpenses - lastMonthExpenses;
                const isPos = diff >= 0;
                const pct = Math.abs(Math.round((diff / lastMonthExpenses) * 100));
                // A change that rounds to 0% is no change: grey, not red or green.
                const isFlat = pct === 0;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: isFlat ? '#64748b' : isPos ? '#ef4444' : '#059669', fontWeight: 600 }}>
                    {isFlat ? <ArrowRight size={14} /> : isPos ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span>
                      {isFlat ? '0%' : `${isPos ? '+' : '-'}${pct}%`} vs same point last month ({currency}{lastMonthExpenses.toLocaleString()})
                    </span>
                  </div>
                );
              })()
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                No expenses by this point last month
              </div>
            )}
          </div>

          {/* Historical Monthly Baseline Average */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Average per Month
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              -{currency}{historicalSummary.overallMonthlyAverage.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {(() => {
                // Same months the average is divided by: months in the window that have expenses.
                const recorded = historicalSummary.monthlyTotals.filter((m) => m.total > 0).length;
                return `Based on ${recorded} ${recorded === 1 ? 'month' : 'months'} with expenses`;
              })()}
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
              <span>All Expenses ({filteredExpenses.length})</span>
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
              <span>Month by Month</span>
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
            <span>Export CSV</span>
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
                Last 6 Months
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.85rem' }}>
                {historicalSummary.monthlyTotals.map((m) => (
                  // Opens that month's expenses in Records.
                  <button
                    type="button"
                    key={m.monthKey}
                    title={`See ${m.month} expenses`}
                    onClick={() => {
                      setTimeframeFilter(m.monthKey);
                      setCurrentPage(1);
                      setActiveTab('records');
                    }}
                    style={{
                      backgroundColor: m.monthKey === thisMonthKey ? '#eff6ff' : '#f8fafc',
                      border: '1px solid',
                      borderColor: m.monthKey === thisMonthKey ? '#bfdbfe' : '#e2e8f0',
                      borderRadius: '10px',
                      padding: '1rem',
                      textAlign: 'center',
                      cursor: 'pointer',
                      font: 'inherit',
                    }}
                  >
                    <div style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                      {m.month}
                    </div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: m.monthKey === thisMonthKey ? '#1d4ed8' : '#0f172a', margin: '0.35rem 0' }}>
                      {currency}{m.total.toLocaleString()}
                    </div>
                    {m.monthKey === thisMonthKey && (
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>So far</div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Multi-Month Category Comparison Matrix */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Spending by Category
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.15rem' }}>
                    How much went to each category each month.
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
                className="phone-fill"
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

              <div className="phone-fill phone-stack" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                  <option value="all">All Time</option>
                  <option value="this-month">This Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="last-3-months">Last 3 Months</option>
                  <option value="last-6-months">Last 6 Months</option>
                  <optgroup label="Pick a Month">
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
            <table className="phone-tight-table steady-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ width: '14%', padding: '0.9rem 1.5rem' }}>Date</th>
                  <th className="hide-on-phone" style={{ width: '13%', padding: '0.9rem 1.25rem' }}>Category</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Description</th>
                  <th style={{ width: '12%', padding: '0.9rem 1.25rem' }}>Amount</th>
                  <th className="hide-on-phone" style={{ width: '10%', padding: '0.9rem 1.25rem' }}>Method</th>
                  <th style={{ width: '130px', padding: '0.9rem 1.5rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              {/* Keyed by page so the rows fade in when the page changes. */}
              <tbody key={currentPage} className="page-rows">
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
                      {formatDisplayDate(exp.expense_date)}
                    </td>

                    <td className="hide-on-phone" style={{ padding: '1rem 1.25rem' }}>
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

                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#ef4444', whiteSpace: 'nowrap' }}>
                      -{currency}{Number(exp.amount).toLocaleString()}
                    </td>

                    <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
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

              {getPageWindow(currentPage, totalPages).map((page) => (
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
