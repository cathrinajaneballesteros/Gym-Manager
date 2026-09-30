'use client';

import React, { useState, useEffect } from 'react';
import {
  FileBarChart2,
  Calendar,
  FileText,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
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

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expenses' | 'profit-loss' | 'monthly' | 'annual'>('revenue');
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendData[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setKpis(DBService.getDashboardKPIs('this-month'));
    setTrends(DBService.getMonthlyTrends());
    setExpenses(DBService.getExpenses());
    setMembers(DBService.getMembers());
    setPayments(DBService.getPayments());
    setProfile(DBService.getProfile());
  }, []);

  if (!kpis) return null;

  const currency = profile?.currency || '₱';
  const gymName = profile?.gym_name || 'IronPeak Fitness & Gym';

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
      generateFinancialPDFReport({
        gymName,
        currency,
        reportPeriod: kpis.periodLabel,
        kpis,
        trends,
        expenses,
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
        reportPeriod: kpis.periodLabel,
        kpis,
        trends,
        expenses,
        members,
        payments,
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
            <span>Apr 1, 2026 - Apr 30, 2026</span>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Apple macOS/iOS Segmented Navigation Controls */}
      <ScrollReveal delay={40}>
        <div style={{ display: 'inline-flex', backgroundColor: 'rgba(118, 118, 128, 0.12)', padding: '3px', borderRadius: '10px', gap: '2px', width: 'fit-content' }}>
          {[
            { key: 'revenue', label: 'Revenue' },
            { key: 'expenses', label: 'Expenses' },
            { key: 'profit-loss', label: 'Profit & Loss' },
            { key: 'monthly', label: 'Monthly' },
            { key: 'annual', label: 'Annual' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
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

      {/* 3. Top 2 Metric Cards with Sparklines */}
      <ScrollReveal delay={70}>
        <div className="grid grid-cols-2 gap-4">
          {/* Total Revenue Card with Mini Chart */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Total Revenue
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {currency}{kpis.totalRevenue.toLocaleString()}
            </div>
            {kpis.totalRevenue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginBottom: '1rem' }}>
                <ArrowUpRight size={14} />
                <span>12.5% from last month</span>
              </div>
            )}

            <div style={{ width: '100%', height: 100, marginTop: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="repRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0284c7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="revenue" stroke="#0284c7" strokeWidth={2.5} fill="url(#repRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Total Expenses Card with Mini Chart */}
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.4rem' }}>
              Total Expenses
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {currency}{kpis.totalExpenses.toLocaleString()}
            </div>
            {kpis.totalExpenses > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600, marginBottom: '1rem' }}>
                <ArrowDownRight size={14} />
                <span>4.2% from last month</span>
              </div>
            )}

            <div style={{ width: '100%', height: 100, marginTop: 'auto' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="repExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#059669" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="expenses" stroke="#059669" strokeWidth={2.5} fill="url(#repExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Net Profit Card + Export Action Buttons */}
      <ScrollReveal delay={100}>
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            padding: '1.5rem 1.75rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500, marginBottom: '0.35rem' }}>
              Net Profit
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>
              {currency}{kpis.netProfit.toLocaleString()}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="btn btn-outline"
              style={{ backgroundColor: '#ffffff', color: '#0f172a', border: '1px solid #0f172a' }}
            >
              <FileText size={16} />
              <span>{isExporting ? 'Generating...' : 'Export PDF'}</span>
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="btn btn-outline"
              style={{ backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #0f172a' }}
            >
              <FileSpreadsheet size={16} />
              <span>{isExporting ? 'Generating...' : 'Export Excel'}</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 5. Financial Summary Table */}
      <ScrollReveal delay={130}>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Financial Summary
            </h2>
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
                <td style={{ padding: '1rem 1.25rem', color: '#334155' }}>{currency}{kpis.totalRevenue.toLocaleString()}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{currency}218,420</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#059669', fontWeight: 600 }}>+12.5%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f8fafc' }}>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>Expenses</td>
                <td style={{ padding: '1rem 1.25rem', color: '#334155' }}>{currency}{kpis.totalExpenses.toLocaleString()}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{currency}94,300</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#ef4444', fontWeight: 600 }}>+4.2%</td>
              </tr>
              <tr>
                <td style={{ padding: '1rem 1.5rem', fontWeight: 700, color: '#0f172a' }}>Net Profit</td>
                <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#059669' }}>{currency}{kpis.netProfit.toLocaleString()}</td>
                <td style={{ padding: '1rem 1.25rem', color: '#64748b' }}>{currency}124,120</td>
                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', color: '#059669', fontWeight: 700 }}>+18.7%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
};
