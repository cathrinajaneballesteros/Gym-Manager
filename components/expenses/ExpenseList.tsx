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
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { Expense, UserProfile } from '@/types/database';
import { CategoryExpenseChart } from '@/components/charts/CategoryExpenseChart';
import { ExpenseModal } from './ExpenseModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showConfirm, showToast } from '@/lib/ui/swal';

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
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

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch =
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.payment_method.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || e.category === categoryFilter;
      const matchesMethod = methodFilter === 'all' || e.payment_method === methodFilter;

      return matchesSearch && matchesCategory && matchesMethod;
    });
  }, [expenses, searchQuery, categoryFilter, methodFilter]);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Calculate top category
  const catSums: Record<string, number> = {};
  expenses.forEach((e) => {
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
  const topCategoryPct = totalExpenses > 0 ? Math.round((topCategoryAmount / totalExpenses) * 100) : 0;
  const lastMonthTotalExpenses = DBService.getDashboardKPIs('last-month').totalExpenses;

  const totalPages = Math.ceil(filteredExpenses.length / pageSize) || 1;
  const paginated = filteredExpenses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      showToast(`Expense "${title}" deleted`);
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
          {/* Total Expenses */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Total Expenses
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {currency}{totalExpenses.toLocaleString()}
            </div>
            {lastMonthTotalExpenses > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: totalExpenses <= lastMonthTotalExpenses ? '#059669' : '#ef4444', fontWeight: 600 }}>
                {totalExpenses <= lastMonthTotalExpenses ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                <span>{Math.abs(Math.round(((totalExpenses - lastMonthTotalExpenses) / lastMonthTotalExpenses) * 100))}% from last month</span>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                No prior month records
              </div>
            )}
          </div>

          {/* This Month */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              This Month
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {currency}{totalExpenses.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Current billing cycle
            </div>
          </div>

          {/* Top Category */}
          <div className="card" style={{ padding: '1.25rem 1.4rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Top Category
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.35rem' }}>
              {topCategoryName}
            </div>
            <div style={{ fontSize: '0.8rem', color: totalExpenses > 0 ? '#059669' : '#94a3b8', fontWeight: totalExpenses > 0 ? 600 : 400 }}>
              {totalExpenses > 0 ? `${topCategoryPct}% of total outlays` : 'No expenses recorded'}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 3. Expense Breakdown Chart Card */}
      <ScrollReveal delay={70}>
        <div className="card">
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a', marginBottom: '1rem' }}>
            Expenses by Category
          </h2>
          <CategoryExpenseChart expenses={expenses} currency={currency} />
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
            maxWidth: '320px',
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
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="GCash">GCash</option>
            <option value="Card">Card</option>
          </select>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '0.5rem 0.85rem',
              fontSize: '0.825rem',
              color: '#475569',
              fontWeight: 500,
            }}
          >
            <Calendar size={14} color="#64748b" />
            <span>Apr 1, 2026 - Apr 30, 2026</span>
          </div>
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
