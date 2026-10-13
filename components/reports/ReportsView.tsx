'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar,
  FileText,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { DashboardKPIs, MonthlyTrendData, Expense, Member, Payment, UserProfile } from '@/types/database';
import { generateFinancialPDFReport } from '@/lib/export/pdf-generator';
import { generateFinancialExcelReport } from '@/lib/export/excel-generator';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showError } from '@/lib/ui/swal';
import { getCurrentMonthRangeLabel } from '@/lib/ui/date';

type ReportTab = 'revenue' | 'expenses' | 'profit-loss' | 'monthly' | 'annual';

const TH: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  fontSize: '0.72rem',
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  textAlign: 'left',
  borderBottom: '1px solid #f1f5f9',
};

const TD: React.CSSProperties = {
  padding: '0.8rem 1.25rem',
  fontSize: '0.875rem',
  color: '#0f172a',
  borderBottom: '1px solid #f8fafc',
};

// "+₱1,500" / "-₱1,500": the sign goes before the currency symbol.
const formatSigned = (value: number, currency: string, alwaysSign = true): string =>
  `${value < 0 ? '-' : alwaysSign ? '+' : ''}${currency}${Math.abs(value).toLocaleString()}`;

// Margin only means something when there was revenue; otherwise show a dash.
const formatMargin = (profit: number, revenue: number): string =>
  revenue > 0 ? `${Math.round((profit / revenue) * 100)}%` : '—';

// Names a report period by its months, e.g. "October 2026" or "May 2026 - October 2026".
const formatMonthRange = (monthKeys: string[]): string => {
  const toLabel = (key: string) => {
    const [y, m] = key.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };
  if (monthKeys.length === 0) return '';
  const first = toLabel(monthKeys[0]);
  const last = toLabel(monthKeys[monthKeys.length - 1]);
  return first === last ? first : `${first} - ${last}`;
};

interface SummaryCardProps {
  label: string;
  value: string;
  color: string;
  change: { label: string; color: string; isUp: boolean } | null;
  trends: MonthlyTrendData[];
  dataKey: 'revenue' | 'expenses';
}

// This month's total with the change from last month and a 6-month sparkline.
const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, color, change, trends, dataKey }) => (
  <div className="card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
    <div style={{ minWidth: '200px' }}>
      <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color, letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
        {value}
      </div>
      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: change.color, fontWeight: 600 }}>
          {change.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{change.label} from last month</span>
        </div>
      )}
    </div>

    <div style={{ flex: 1, minWidth: '220px' }}>
      <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, textAlign: 'right', marginBottom: '0.25rem' }}>
        Last 6 months
      </div>
      <div style={{ width: '100%', height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trends}>
            <defs>
              <linearGradient id={`rep-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                <stop offset="95%" stopColor={color} stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} fill={`url(#rep-${dataKey})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
);

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('revenue');
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [lastMonthKpis, setLastMonthKpis] = useState<DashboardKPIs | null>(null);
  const [sixMonthKpis, setSixMonthKpis] = useState<DashboardKPIs | null>(null);
  const [annualKpis, setAnnualKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendData[]>([]);
  const [ytdTrends, setYtdTrends] = useState<MonthlyTrendData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadReport = () => {
    setKpis(DBService.getDashboardKPIs('this-month'));
    setLastMonthKpis(DBService.getDashboardKPIs('last-month'));
    setSixMonthKpis(DBService.getDashboardKPIs('last-6-months'));
    setAnnualKpis(DBService.getDashboardKPIs('this-year'));
    setTrends(DBService.getMonthlyTrends());
    setYtdTrends(DBService.getMonthlyTrends(new Date().getMonth() + 1));
    setExpenses(DBService.getExpenses());
    setMembers(DBService.getMembers());
    setPayments(DBService.getPayments());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useGymDataRefresh(loadReport);

  if (!kpis) return null;

  const currency = profile?.currency || '₱';
  const gymName = profile?.gym_name || 'Your Gym';

  const lastRev = lastMonthKpis?.totalRevenue || 0;
  const lastExp = lastMonthKpis?.totalExpenses || 0;
  const lastProfit = lastMonthKpis?.netProfit || 0;

  // lowerIsBetter: for expenses, going down is good news (green).
  const getChangeStats = (current: number, previous: number, lowerIsBetter = false) => {
    if (current === previous) {
      return { label: '0.0%', color: '#64748b', isUp: true };
    }
    if (previous === 0) {
      // Nothing to compare against, so a percentage would be made up.
      return { label: '—', color: '#64748b', isUp: current > 0 };
    }
    const isUp = current > previous;
    // Divide by the size of the old value so a loss getting smaller counts as going up.
    const pct = (Math.abs(current - previous) / Math.abs(previous)) * 100;
    const isGood = lowerIsBetter ? !isUp : isUp;
    return {
      label: `${isUp ? '+' : '-'}${pct.toFixed(1)}%`,
      color: isGood ? '#059669' : '#ef4444',
      isUp,
    };
  };

  const revChange = getChangeStats(kpis.totalRevenue, lastRev);
  const expChange = getChangeStats(kpis.totalExpenses, lastExp, true);
  const profitChange = getChangeStats(kpis.netProfit, lastProfit);

  // Exports follow the selected report's period.
  const display = (activeTab === 'annual' ? annualKpis : activeTab === 'monthly' ? sixMonthKpis : kpis) || kpis;

  const rangeLabel =
    activeTab === 'annual'
      ? `${new Date().getFullYear()} Year to Date`
      : activeTab === 'monthly'
      ? 'Last 6 Months'
      : getCurrentMonthRangeLabel();

  const tabs: { key: ReportTab; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'profit-loss', label: 'Profit & Loss' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'annual', label: 'Annual' },
  ];

  // ---- Derived data for the tab bodies ----
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthPayments = payments.filter(
    (p) => p.payment_status === 'completed' && (p.payment_date || '').startsWith(monthKey)
  );
  const monthExpenses = expenses.filter((e) => (e.expense_date || '').startsWith(monthKey));

  const monthRevenueTotal = monthPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const monthExpenseTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const paymentsByMethod = monthPayments.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const method = p.payment_method || 'Other';
    if (!acc[method]) acc[method] = { total: 0, count: 0 };
    acc[method].total += Number(p.amount);
    acc[method].count += 1;
    return acc;
  }, {});

  const paymentsByPlan = monthPayments.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const planName = p.is_walk_in ? 'Walk-ins' : p.plan?.name || (p.membership_plan_id ? 'Unknown plan' : 'No plan');
    if (!acc[planName]) acc[planName] = { total: 0, count: 0 };
    acc[planName].total += Number(p.amount);
    acc[planName].count += 1;
    return acc;
  }, {});

  const expensesByCategory = monthExpenses.reduce<Record<string, { total: number; count: number }>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { total: 0, count: 0 };
    acc[e.category].total += Number(e.amount);
    acc[e.category].count += 1;
    return acc;
  }, {});

  const topExpenses = [...monthExpenses]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  // Months the selected report covers, used for the export period name and the exported records.
  const periodTrends = activeTab === 'annual' ? ytdTrends : activeTab === 'monthly' ? trends : trends.slice(-1);
  const periodMonthKeys = periodTrends.map((t) => t.monthKey);
  const inPeriod = (date: string | undefined) => periodMonthKeys.includes((date || '').slice(0, 7));
  const periodName = `${formatMonthRange(periodMonthKeys)}${activeTab === 'annual' ? ' (Year to Date)' : ''}`;
  const periodExpenses = expenses
    .filter((e) => inPeriod(e.expense_date))
    .sort((a, b) => (b.expense_date || '').localeCompare(a.expense_date || ''));
  const periodPayments = payments
    .filter((p) => inPeriod(p.payment_date))
    .sort((a, b) => (b.payment_date || '').localeCompare(a.payment_date || ''));
  // Monthly and Annual exports list their own months; the single-month tabs show the last 6 for context.
  const exportTrends = activeTab === 'annual' ? ytdTrends : trends;

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      const gym = DBService.getGym();
      generateFinancialPDFReport({
        gymName,
        gymContact: [gym?.address, gym?.phone].filter(Boolean).join(' · ') || undefined,
        currency,
        reportPeriod: periodName,
        kpis: display,
        trends: exportTrends,
        expenses: periodExpenses,
      });
    } catch (err) {
      console.error('PDF export error:', err);
      showError('PDF Export Failed', 'Error generating PDF report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    setIsExporting(true);
    try {
      generateFinancialExcelReport({
        gymName,
        currency,
        reportPeriod: periodName,
        kpis: display,
        trends: exportTrends,
        expenses: periodExpenses,
        members,
        payments: periodPayments,
      });
    } catch (err) {
      console.error('Excel export error:', err);
      showError('Excel Export Failed', 'Error generating Excel report. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Financial Reports
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Generate and export financial reports.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
            {/* Date Filter Pill */}
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
              <span>{rangeLabel}</span>
            </div>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="btn btn-outline btn-sm"
              style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #0f172a' }}
            >
              <FileText size={15} />
              <span>{isExporting ? 'Generating...' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="btn btn-outline btn-sm"
              style={{ backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #0f172a' }}
            >
              <FileSpreadsheet size={15} />
              <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Apple macOS/iOS Segmented Navigation Controls */}
      <ScrollReveal delay={40}>
        <div style={{ display: 'inline-flex', backgroundColor: 'rgba(118, 118, 128, 0.12)', padding: '3px', borderRadius: '10px', gap: '2px', width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                fontSize: '0.825rem',
                fontWeight: activeTab === tab.key ? 600 : 500,
                backgroundColor: activeTab === tab.key ? '#ffffff' : 'transparent',
                color: activeTab === tab.key ? '#1d1d1f' : '#636366',
                boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.08)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s cubic-bezier(0.25, 1, 0.5, 1)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </ScrollReveal>

      {/* 3. Tab-specific report body */}
      {activeTab === 'revenue' && (
        <ScrollReveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SummaryCard
              label="Total Revenue this month"
              value={`+${currency}${kpis.totalRevenue.toLocaleString()}`}
              color="#059669"
              change={lastRev > 0 ? revChange : null}
              trends={trends}
              dataKey="revenue"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Collections by Payment Method</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    {monthPayments.length} payment{monthPayments.length === 1 ? '' : 's'} recorded this month
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Method</th>
                        <th style={TH}>Payments</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(paymentsByMethod).map(([method, data]) => {
                        const pct = monthRevenueTotal > 0 ? Math.round((data.total / monthRevenueTotal) * 100) : 0;
                        return (
                          <tr key={method}>
                            <td style={TD}><strong>{method}</strong></td>
                            <td style={TD}>{data.count}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              +{currency}{data.total.toLocaleString()}
                            </td>
                            <td style={{ ...TD, textAlign: 'right', color: '#64748b' }}>{pct}%</td>
                          </tr>
                        );
                      })}
                      {Object.keys(paymentsByMethod).length === 0 && (
                        <tr>
                          <td style={{ ...TD, color: '#94a3b8' }} colSpan={4}>No payments recorded this month.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Revenue by Membership Tier</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Subscription tiers performance this month
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Plan</th>
                        <th style={TH}>Subs</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(paymentsByPlan).map(([planName, data]) => (
                        <tr key={planName}>
                          <td style={TD}><strong>{planName}</strong></td>
                          <td style={TD}>{data.count}</td>
                          <td style={{ ...TD, textAlign: 'right', color: '#0f172a', fontWeight: 600 }}>
                            {currency}{data.total.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {Object.keys(paymentsByPlan).length === 0 && (
                        <tr>
                          <td style={{ ...TD, color: '#94a3b8' }} colSpan={3}>No tier revenue recorded this month.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'expenses' && (
        <ScrollReveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <SummaryCard
              label="Total Expenses this month"
              value={`-${currency}${kpis.totalExpenses.toLocaleString()}`}
              color="#ef4444"
              change={lastExp > 0 ? expChange : null}
              trends={trends}
              dataKey="expenses"
            />
            <div className="grid grid-cols-2 gap-4">
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Outlays by Category</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Share of this month&apos;s overhead
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Category</th>
                        <th style={TH}>Items</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Total</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(expensesByCategory).map(([category, data]) => {
                        const pct = monthExpenseTotal > 0 ? Math.round((data.total / monthExpenseTotal) * 100) : 0;
                        return (
                          <tr key={category}>
                            <td style={TD}><strong>{category}</strong></td>
                            <td style={TD}>{data.count}</td>
                            <td style={{ ...TD, textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                              -{currency}{data.total.toLocaleString()}
                            </td>
                            <td style={{ ...TD, textAlign: 'right', color: '#64748b' }}>{pct}%</td>
                          </tr>
                        );
                      })}
                      {Object.keys(expensesByCategory).length === 0 && (
                        <tr>
                          <td style={{ ...TD, color: '#94a3b8' }} colSpan={4}>No expenses recorded this month.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                  <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Top Expense Line Items</h2>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                    Ranked by amount this month
                  </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={TH}>Item</th>
                        <th style={TH}>Category</th>
                        <th style={{ ...TH, textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topExpenses.map((e) => (
                        <tr key={e.id}>
                          <td style={TD}><strong>{e.title}</strong></td>
                          <td style={{ ...TD, color: '#64748b' }}>{e.category}</td>
                          <td style={{ ...TD, textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>
                            -{currency}{Number(e.amount).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                      {topExpenses.length === 0 && (
                        <tr>
                          <td style={{ ...TD, color: '#94a3b8' }} colSpan={3}>No expenses recorded this month.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'profit-loss' && (
        <ScrollReveal delay={70}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Profit &amp; Loss Statement</h2>
                <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                  This month compared with last month
                </p>
              </div>
              <div
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  padding: '0.25rem 0.7rem',
                  borderRadius: '6px',
                  color: kpis.totalRevenue === 0 ? '#64748b' : kpis.profitMargin >= 20 ? '#059669' : '#e11d48',
                  backgroundColor: kpis.totalRevenue === 0 ? '#f1f5f9' : kpis.profitMargin >= 20 ? '#ecfdf5' : '#fff1f2',
                }}
              >
                {formatMargin(kpis.netProfit, kpis.totalRevenue)} Net Margin
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase' }}>
                    <th style={{ padding: '0.9rem 1.5rem' }}>Category</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>This Month</th>
                    <th style={{ padding: '0.9rem 1.25rem' }}>Last Month</th>
                    <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Change</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Revenue</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#059669', fontWeight: 600 }}>+{currency}{kpis.totalRevenue.toLocaleString()}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{currency}{lastRev.toLocaleString()}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: revChange.color, fontWeight: 600 }}>{revChange.label}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Expenses</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#ef4444', fontWeight: 600 }}>-{currency}{kpis.totalExpenses.toLocaleString()}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{currency}{lastExp.toLocaleString()}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: expChange.color, fontWeight: 600 }}>{expChange.label}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#0f172a' }}>Net Profit</td>
                    <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: kpis.netProfit >= 0 ? '#059669' : '#ef4444' }}>{formatSigned(kpis.netProfit, currency)}</td>
                    <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{formatSigned(lastProfit, currency, false)}</td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: profitChange.color, fontWeight: 700 }}>{profitChange.label}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'monthly' && (
        <ScrollReveal delay={70}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Monthly Performance</h2>
              <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                Revenue, expenses and net profit over the last 6 months
              </p>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={TH}>Month</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Expenses</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Net Profit</th>
                    <th style={{ ...TH, textAlign: 'right' }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {trends.map((pt) => {
                    return (
                      <tr key={pt.monthKey}>
                        <td style={TD}><strong>{pt.month}</strong></td>
                        <td style={{ ...TD, textAlign: 'right', color: '#059669' }}>+{currency}{pt.revenue.toLocaleString()}</td>
                        <td style={{ ...TD, textAlign: 'right', color: '#ef4444' }}>-{currency}{pt.expenses.toLocaleString()}</td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: pt.profit >= 0 ? '#0f172a' : '#ef4444' }}>
                          {pt.profit >= 0 ? '+' : '-'}{currency}{Math.abs(pt.profit).toLocaleString()}
                        </td>
                        <td style={{ ...TD, textAlign: 'right', color: '#64748b' }}>{formatMargin(pt.profit, pt.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const totalRevenue = trends.reduce((sum, pt) => sum + pt.revenue, 0);
                    const totalExpenses = trends.reduce((sum, pt) => sum + pt.expenses, 0);
                    const totalProfit = totalRevenue - totalExpenses;
                    const TF: React.CSSProperties = { ...TD, fontWeight: 700, borderTop: '2px solid #e2e8f0', borderBottom: 'none', backgroundColor: '#f8fafc' };
                    return (
                      <tr>
                        <td style={TF}>Total</td>
                        <td style={{ ...TF, textAlign: 'right', color: '#059669' }}>+{currency}{totalRevenue.toLocaleString()}</td>
                        <td style={{ ...TF, textAlign: 'right', color: '#ef4444' }}>-{currency}{totalExpenses.toLocaleString()}</td>
                        <td style={{ ...TF, textAlign: 'right', color: totalProfit >= 0 ? '#0f172a' : '#ef4444' }}>
                          {formatSigned(totalProfit, currency)}
                        </td>
                        <td style={{ ...TF, textAlign: 'right', color: '#64748b' }}>{formatMargin(totalProfit, totalRevenue)}</td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>
            </div>
          </div>
        </ScrollReveal>
      )}

      {activeTab === 'annual' && (
        <ScrollReveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="grid grid-cols-3 gap-4">
              <div className="card" style={{ padding: '1.35rem 1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  YTD Revenue
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#059669', letterSpacing: '-0.02em' }}>
                  +{currency}{display.totalRevenue.toLocaleString()}
                </div>
              </div>
              <div className="card" style={{ padding: '1.35rem 1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  YTD Expenses
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#ef4444', letterSpacing: '-0.02em' }}>
                  -{currency}{display.totalExpenses.toLocaleString()}
                </div>
              </div>
              <div className="card" style={{ padding: '1.35rem 1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  YTD Net Profit
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: display.netProfit >= 0 ? '#059669' : '#ef4444', letterSpacing: '-0.02em' }}>
                  {display.netProfit >= 0 ? '+' : '-'}{currency}{Math.abs(display.netProfit).toLocaleString()}
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>Month-by-Month ({now.getFullYear()})</h2>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH}>Month</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Revenue</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Expenses</th>
                      <th style={{ ...TH, textAlign: 'right' }}>Net Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ytdTrends.map((row) => (
                      <tr key={row.monthKey}>
                        <td style={TD}><strong>{row.month}</strong></td>
                        <td style={{ ...TD, textAlign: 'right', color: '#059669' }}>+{currency}{row.revenue.toLocaleString()}</td>
                        <td style={{ ...TD, textAlign: 'right', color: '#ef4444' }}>-{currency}{row.expenses.toLocaleString()}</td>
                        <td style={{ ...TD, textAlign: 'right', fontWeight: 600, color: row.profit >= 0 ? '#0f172a' : '#ef4444' }}>
                          {row.profit >= 0 ? '+' : '-'}{currency}{Math.abs(row.profit).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
};
