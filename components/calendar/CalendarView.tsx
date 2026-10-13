'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CreditCard,
  Receipt,
  Users,
  Bell,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  X,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { Member, Payment, Expense, UserProfile } from '@/types/database';
import { getPaymentMemberName } from '@/lib/ui/format';
import { PaymentReminderModal } from '@/components/payments/PaymentReminderModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

type FilterType = 'all' | 'expirations' | 'payments' | 'expenses';

export const CalendarView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Current view date: year and month (0-indexed month)
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Modal states
  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [selectedMemberForReminder, setSelectedMemberForReminder] = useState<Member | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [preselectedMemberId, setPreselectedMemberId] = useState<string | undefined>(undefined);

  const loadData = () => {
    setProfile(DBService.getProfile());
    setMembers(DBService.getMembers());
    setPayments(DBService.getPayments());
    setExpenses(DBService.getExpenses());
  };

  useGymDataRefresh(loadData);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('storage', handleUpdate);
    return () => window.removeEventListener('storage', handleUpdate);
  }, []);

  const currency = profile?.currency || '₱';
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const t = new Date();
    setViewDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDateStr(todayStr);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('en-US', { month: 'long' });

  // Map dates to events
  const { dateDataMap, monthStats } = useMemo(() => {
    const map = new Map<
      string,
      {
        expirations: Member[];
        payments: Payment[];
        expenses: Expense[];
        totalRevenue: number;
        totalExpenses: number;
      }
    >();

    const getOrCreate = (dStr: string) => {
      if (!map.has(dStr)) {
        map.set(dStr, {
          expirations: [],
          payments: [],
          expenses: [],
          totalRevenue: 0,
          totalExpenses: 0,
        });
      }
      return map.get(dStr)!;
    };

    // 1. Members with end_date
    members.forEach((m) => {
      if (m.end_date) {
        const item = getOrCreate(m.end_date);
        item.expirations.push(m);
      }
    });

    // 2. Payments
    payments.forEach((p) => {
      if (p.payment_date && p.payment_status === 'completed') {
        const dStr = p.payment_date.slice(0, 10);
        const item = getOrCreate(dStr);
        item.payments.push(p);
        item.totalRevenue += Number(p.amount);
      }
    });

    // 3. Expenses
    expenses.forEach((e) => {
      if (e.expense_date) {
        const dStr = e.expense_date.slice(0, 10);
        const item = getOrCreate(dStr);
        item.expenses.push(e);
        item.totalExpenses += Number(e.amount);
      }
    });

    // Month level stats
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    let monthExpirationsCount = 0;
    let monthRevenue = 0;
    let monthExpenseTotal = 0;

    map.forEach((val, dateKey) => {
      if (dateKey.startsWith(monthKey)) {
        monthExpirationsCount += val.expirations.length;
        monthRevenue += val.totalRevenue;
        monthExpenseTotal += val.totalExpenses;
      }
    });

    return {
      dateDataMap: map,
      monthStats: {
        monthExpirationsCount,
        monthRevenue,
        monthExpenseTotal,
        monthNetProfit: monthRevenue - monthExpenseTotal,
      },
    };
  }, [members, payments, expenses, currentYear, currentMonth]);

  // Compute calendar grid days
  const calendarGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    interface GridCell {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
    }

    const cells: GridCell[] = [];

    // Preceding days from previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
      });
    }

    // Trailing days to fill 42 cells (6 rows * 7 days)
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({
        dateStr: dStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr]);

  // Selected date data
  const selectedDayData = selectedDateStr ? dateDataMap.get(selectedDateStr) : null;
  const selectedDateFormatted = selectedDateStr
    ? new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  const handleOpenReminder = (member: Member) => {
    setSelectedMemberForReminder(member);
    setReminderModalOpen(true);
  };

  const handleRecordPayment = (memberId?: string) => {
    setPreselectedMemberId(memberId);
    setPaymentModalOpen(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Header & Controls */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Gym Operations Calendar
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Monitor membership expirations, payment due dates, and operational cashflow at a glance.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => handleRecordPayment()}
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem' }}
            >
              <Plus size={16} />
              <span>Record Payment</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Month Financial KPI Bar */}
      <ScrollReveal delay={30}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
          }}
        >
          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Users size={16} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600 }}>Expirations This Month</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              {monthStats.monthExpirationsCount} Members
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
              Scheduled for renewal in {monthName}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <ArrowUpRight size={16} style={{ color: '#059669' }} />
              <span style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600 }}>Revenue Collected</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#059669' }}>
              +{currency}{monthStats.monthRevenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
              Payments received in {monthName}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <ArrowDownRight size={16} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600 }}>Expenses Paid</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              -{currency}{monthStats.monthExpenseTotal.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
              Operational outlays in {monthName}
            </div>
          </div>

          <div className="card" style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <CreditCard size={16} style={{ color: monthStats.monthNetProfit >= 0 ? '#059669' : '#ef4444' }} />
              <span style={{ fontSize: '0.785rem', color: '#64748b', fontWeight: 600 }}>Net Month Profit</span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: monthStats.monthNetProfit >= 0 ? '#059669' : '#ef4444' }}>
              {monthStats.monthNetProfit >= 0 ? '+' : '-'}{currency}{Math.abs(monthStats.monthNetProfit).toLocaleString()}
            </div>
            <div style={{ fontSize: '0.725rem', color: '#64748b', marginTop: '2px' }}>
              Cash balance for {monthName}
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 3. Calendar Card */}
      <ScrollReveal delay={60}>
        <div className="card" style={{ padding: '1.5rem' }}>
          {/* Calendar Toolbar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            {/* Month title + Navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={handlePrevMonth}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.35rem 0.55rem' }}
                  aria-label="Previous Month"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={handleNextMonth}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.35rem 0.55rem' }}
                  aria-label="Next Month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', minWidth: '180px' }}>
                {monthName} {currentYear}
              </h2>

              <button
                onClick={handleToday}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Today
              </button>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { key: 'all', label: 'All Items' },
                { key: 'expirations', label: '• Expirations', color: '#f59e0b' },
                { key: 'payments', label: '• Payments', color: '#059669' },
                { key: 'expenses', label: '• Expenses', color: '#ef4444' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key as FilterType)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '999px',
                    fontSize: '0.785rem',
                    fontWeight: activeFilter === f.key ? 600 : 500,
                    border: '1px solid',
                    borderColor: activeFilter === f.key ? '#0f172a' : '#e2e8f0',
                    backgroundColor: activeFilter === f.key ? '#0f172a' : '#ffffff',
                    color: activeFilter === f.key ? '#ffffff' : f.color || '#475569',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Weekday Column Headers */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '4px',
              textAlign: 'center',
              marginBottom: '6px',
            }}
          >
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div
                key={d}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748b',
                  padding: '0.4rem 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* 42-Cell Calendar Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '6px',
            }}
          >
            {calendarGrid.map((cell) => {
              const data = dateDataMap.get(cell.dateStr);
              const isSelected = selectedDateStr === cell.dateStr;

              const hasExpirations = (data?.expirations.length || 0) > 0;
              const hasPayments = (data?.payments.length || 0) > 0;
              const hasExpenses = (data?.expenses.length || 0) > 0;

              // Filter logic
              const showExpirations = (activeFilter === 'all' || activeFilter === 'expirations') && hasExpirations;
              const showPayments = (activeFilter === 'all' || activeFilter === 'payments') && hasPayments;
              const showExpenses = (activeFilter === 'all' || activeFilter === 'expenses') && hasExpenses;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  style={{
                    minHeight: '92px',
                    padding: '0.5rem',
                    borderRadius: '8px',
                    border: isSelected
                      ? '2px solid #0f172a'
                      : cell.isToday
                      ? '1.5px solid #3b82f6'
                      : '1px solid #e2e8f0',
                    backgroundColor: isSelected
                      ? '#f8fafc'
                      : cell.isCurrentMonth
                      ? '#ffffff'
                      : '#fafafa',
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#94a3b8';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = cell.isToday ? '#3b82f6' : '#e2e8f0';
                      e.currentTarget.style.backgroundColor = cell.isCurrentMonth ? '#ffffff' : '#fafafa';
                    }
                  }}
                >
                  {/* Date Number Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: cell.isToday ? '24px' : 'auto',
                        height: cell.isToday ? '24px' : 'auto',
                        borderRadius: cell.isToday ? '50%' : '0',
                        backgroundColor: cell.isToday ? '#3b82f6' : 'transparent',
                        color: cell.isToday ? '#ffffff' : cell.isCurrentMonth ? '#0f172a' : '#94a3b8',
                        fontWeight: cell.isToday || isSelected ? 700 : 500,
                        fontSize: '0.8rem',
                      }}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Small dot summary if items exist */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      {hasExpirations && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                      )}
                      {hasPayments && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#059669' }} />
                      )}
                      {hasExpenses && (
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                      )}
                    </div>
                  </div>

                  {/* Pills Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                    {showExpirations && (
                      <div
                        style={{
                          backgroundColor: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          fontSize: '0.675rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                        title={`${data?.expirations.length} member(s) expiring`}
                      >
                        <span>⏰ {data?.expirations.length} Expiring</span>
                      </div>
                    )}

                    {showPayments && (
                      <div
                        style={{
                          backgroundColor: '#ecfdf5',
                          color: '#065f46',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          fontSize: '0.675rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`Collected ${currency}${data?.totalRevenue.toLocaleString()}`}
                      >
                        <span>+{currency}{data?.totalRevenue.toLocaleString()}</span>
                      </div>
                    )}

                    {showExpenses && (
                      <div
                        style={{
                          backgroundColor: '#ffe4e6',
                          color: '#9f1239',
                          borderRadius: '4px',
                          padding: '1px 4px',
                          fontSize: '0.675rem',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={`Paid ${currency}${data?.totalExpenses.toLocaleString()}`}
                      >
                        <span>-{currency}{data?.totalExpenses.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Day Detail Inspector Drawer / Modal */}
      {selectedDateStr && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedDateStr(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: '1.75rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  <CalendarIcon size={14} />
                  <span>Daily Ledger & Activity Inspector</span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
                  {selectedDateFormatted}
                </h3>
              </div>

              <button
                onClick={() => setSelectedDateStr(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px',
                }}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Daily Summary Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ backgroundColor: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                <span style={{ fontSize: '0.725rem', color: '#92400e', fontWeight: 600, display: 'block' }}>Expiring Members</span>
                <strong style={{ fontSize: '1.2rem', color: '#b45309' }}>{selectedDayData?.expirations.length || 0}</strong>
              </div>
              <div style={{ backgroundColor: '#ecfdf5', padding: '0.75rem', borderRadius: '8px', border: '1px solid #d1fae5' }}>
                <span style={{ fontSize: '0.725rem', color: '#065f46', fontWeight: 600, display: 'block' }}>Total Collected</span>
                <strong style={{ fontSize: '1.2rem', color: '#059669' }}>{currency}{(selectedDayData?.totalRevenue || 0).toLocaleString()}</strong>
              </div>
              <div style={{ backgroundColor: '#fff1f2', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ffe4e6' }}>
                <span style={{ fontSize: '0.725rem', color: '#9f1239', fontWeight: 600, display: 'block' }}>Expenses Logged</span>
                <strong style={{ fontSize: '1.2rem', color: '#e11d48' }}>{currency}{(selectedDayData?.totalExpenses || 0).toLocaleString()}</strong>
              </div>
            </div>

            {/* Section A: Members Expiring on This Date */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} style={{ color: '#f59e0b' }} />
                  <span>Memberships Expiring ({selectedDayData?.expirations.length || 0})</span>
                </h4>
              </div>

              {!selectedDayData || selectedDayData.expirations.length === 0 ? (
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.825rem', color: '#64748b' }}>
                  No member subscriptions expiring on this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {selectedDayData.expirations.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        padding: '0.85rem 1rem',
                        backgroundColor: '#fffbeb',
                        border: '1px solid #fef3c7',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>
                          {m.first_name} {m.last_name}
                        </div>
                        <div style={{ fontSize: '0.785rem', color: '#64748b', marginTop: '2px' }}>
                          Plan: <strong>{m.plan?.name || 'Standard Plan'}</strong> • Tel: {m.phone || 'None'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleOpenReminder(m)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.65rem',
                            backgroundColor: '#ffffff',
                          }}
                        >
                          <Bell size={13} style={{ color: '#d97706' }} />
                          <span>Send Reminder</span>
                        </button>
                        <button
                          onClick={() => handleRecordPayment(m.id)}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                        >
                          Renew
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Payments Received */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CreditCard size={16} style={{ color: '#059669' }} />
                  <span>Payments Received ({selectedDayData?.payments.length || 0})</span>
                </h4>
              </div>

              {!selectedDayData || selectedDayData.payments.length === 0 ? (
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.825rem', color: '#64748b' }}>
                  No payments logged on this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedDayData.payments.map((p) => {
                    const member = members.find((m) => m.id === p.member_id);
                    const memberName = getPaymentMemberName({ ...p, member });
                    return (
                      <div
                        key={p.id}
                        style={{
                          padding: '0.75rem 1rem',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.825rem',
                        }}
                      >
                        <div>
                          <strong style={{ color: '#0f172a' }}>
                            {memberName}
                          </strong>
                          <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1px' }}>
                            {p.payment_method} {p.reference_number ? `• Ref: #${p.reference_number}` : ''}
                          </div>
                        </div>

                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#059669', fontSize: '0.95rem' }}>
                            +{currency}{Number(p.amount).toLocaleString()}
                          </span>
                          <span
                            style={{
                              display: 'block',
                              fontSize: '0.685rem',
                              fontWeight: 600,
                              color: p.receipt_status === 'verified' ? '#059669' : p.receipt_status === 'rejected' ? '#dc2626' : '#d97706',
                            }}
                          >
                            Receipt: {p.receipt_status || 'unverified'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section C: Expenses Logged */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Receipt size={16} style={{ color: '#ef4444' }} />
                  <span>Expenses Paid ({selectedDayData?.expenses.length || 0})</span>
                </h4>
              </div>

              {!selectedDayData || selectedDayData.expenses.length === 0 ? (
                <div style={{ padding: '0.85rem', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '0.825rem', color: '#64748b' }}>
                  No expenses incurred on this date.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedDayData.expenses.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        padding: '0.75rem 1rem',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.825rem',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#0f172a' }}>{e.title}</strong>
                        <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '1px' }}>
                          Category: {e.category}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.95rem' }}>
                          -{currency}{Number(e.amount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.75rem', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
              <button
                onClick={() => setSelectedDateStr(null)}
                className="btn btn-secondary"
                style={{ fontSize: '0.825rem' }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedDateStr(null);
                  handleRecordPayment();
                }}
                className="btn btn-primary"
                style={{ fontSize: '0.825rem' }}
              >
                + Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Reminder Modal */}
      <PaymentReminderModal
        isOpen={reminderModalOpen}
        onClose={() => {
          setReminderModalOpen(false);
          setSelectedMemberForReminder(null);
        }}
        member={selectedMemberForReminder}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Payment Modal */}
      <PaymentModal
        isOpen={paymentModalOpen}
        onClose={() => {
          setPaymentModalOpen(false);
          setPreselectedMemberId(undefined);
        }}
        preselectedMemberId={preselectedMemberId}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
