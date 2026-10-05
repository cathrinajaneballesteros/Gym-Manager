'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  TrendingUp,
  CreditCard,
  Receipt,
  Users,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Plus,
  X,
  CheckCircle2,
  AlertCircle,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  DollarSign,
  Building2,
  Zap,
  Package,
  Wrench,
  Dumbbell,
  Megaphone,
  Layers,
  Smartphone,
  Banknote,
  Activity,
  FileText,
  Percent,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { DashboardKPIs, MonthlyTrendData, Member, UserProfile, Payment, Expense } from '@/types/database';
import { MetricCard } from '@/components/ui/MetricCard';
import { RevenueExpenseChart } from '@/components/charts/RevenueExpenseChart';
import { CategoryExpenseChart } from '@/components/charts/CategoryExpenseChart';
import { MemberModal } from '@/components/members/MemberModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ExpenseModal } from '@/components/expenses/ExpenseModal';
import { PaymentReminderModal } from '@/components/payments/PaymentReminderModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const DashboardOverview: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [lastMonthKpis, setLastMonthKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [activeBreakdown, setActiveBreakdown] = useState<'revenue' | 'expenses' | 'profit' | 'members' | null>(null);
  const [selectedMemberForReminder, setSelectedMemberForReminder] = useState<Member | null>(null);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveBreakdown(null);
      }
    };
    if (activeBreakdown) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeBreakdown]);

  const refreshData = () => {
    setKpis(DBService.getDashboardKPIs('this-month'));
    setLastMonthKpis(DBService.getDashboardKPIs('last-month'));
    setTrends(DBService.getMonthlyTrends());
    setMembers(DBService.getMembers());
    setPayments(DBService.getPayments());
    setExpenses(DBService.getExpenses());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    refreshData();
    const handleProfileUpdate = () => {
      setProfile(DBService.getProfile());
    };
    window.addEventListener('sgfm_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('sgfm_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  if (!kpis) return null;

  const currency = profile?.currency || '₱';
  const adminFirstName = DBService.getFirstName(profile?.full_name);
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' : currentHour < 18 ? 'Good afternoon' : 'Good evening';
  const expiringMembers = members.filter((m) => m.status === 'expiring');
  const recentPayments = payments.slice(0, 2);

  const revenueTrend = lastMonthKpis && lastMonthKpis.totalRevenue > 0
    ? {
        value: `${kpis.totalRevenue >= lastMonthKpis.totalRevenue ? '+' : '-'}${Math.abs(Math.round(((kpis.totalRevenue - lastMonthKpis.totalRevenue) / lastMonthKpis.totalRevenue) * 100))}%`,
        positive: kpis.totalRevenue >= lastMonthKpis.totalRevenue,
        direction: kpis.totalRevenue >= lastMonthKpis.totalRevenue ? ('up' as const) : ('down' as const),
        label: 'from last month',
      }
    : undefined;

  const expenseTrend = lastMonthKpis && lastMonthKpis.totalExpenses > 0
    ? (() => {
        const expenseDiff = kpis.totalExpenses - lastMonthKpis.totalExpenses;
        return {
          value: `${expenseDiff >= 0 ? '+' : '-'}${Math.abs(Math.round((expenseDiff / lastMonthKpis.totalExpenses) * 100))}%`,
          positive: expenseDiff >= 0,
          direction: expenseDiff >= 0 ? ('up' as const) : ('down' as const),
          label: 'from last month',
        };
      })()
    : undefined;

  const profitTrend = lastMonthKpis && lastMonthKpis.netProfit !== 0
    ? (() => {
        const profitDiff = kpis.netProfit - lastMonthKpis.netProfit;
        return {
          value: `${profitDiff >= 0 ? '+' : '-'}${Math.abs(Math.round((profitDiff / Math.abs(lastMonthKpis.netProfit)) * 100))}%`,
          positive: profitDiff >= 0,
          direction: profitDiff >= 0 ? ('up' as const) : ('down' as const),
          label: 'from last month',
        };
      })()
    : undefined;

  const memberTrend = lastMonthKpis && lastMonthKpis.activeMembers > 0
    ? (() => {
        const memberDiff = kpis.activeMembers - lastMonthKpis.activeMembers;
        return {
          value: `${memberDiff >= 0 ? '+' : '-'}${Math.abs(Math.round((memberDiff / lastMonthKpis.activeMembers) * 100))}%`,
          positive: memberDiff >= 0,
          direction: memberDiff >= 0 ? ('up' as const) : ('down' as const),
          label: 'from last month',
        };
      })()
    : undefined;

  // Derived data for breakdown modals
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthCompletedPayments = payments.filter(
    (p) => p.payment_status === 'completed' && (p.payment_date || '').startsWith(thisMonthKey)
  );
  const activePaymentsList = monthCompletedPayments;

  const paymentsByMethod = activePaymentsList.reduce<Record<string, { total: number; count: number }>>((acc, p) => {
    const method = p.payment_method || 'Other';
    if (!acc[method]) acc[method] = { total: 0, count: 0 };
    acc[method].total += Number(p.amount);
    acc[method].count += 1;
    return acc;
  }, {});

  const plans = DBService.getPlans();
  const paymentsByPlan = activePaymentsList.reduce<Record<string, { total: number; count: number; name: string }>>((acc, p) => {
    const plan = plans.find((pl) => pl.id === p.membership_plan_id);
    const planName = plan ? plan.name : 'Standard Pass';
    if (!acc[planName]) acc[planName] = { total: 0, count: 0, name: planName };
    acc[planName].total += Number(p.amount);
    acc[planName].count += 1;
    return acc;
  }, {});

  const monthExpensesList = expenses.filter((e) => (e.expense_date || '').startsWith(thisMonthKey));
  const activeExpensesList = monthExpensesList;

  const expensesByCategory = activeExpensesList.reduce<Record<string, { total: number; count: number }>>((acc, e) => {
    if (!acc[e.category]) acc[e.category] = { total: 0, count: 0 };
    acc[e.category].total += Number(e.amount);
    acc[e.category].count += 1;
    return acc;
  }, {});

  const topExpensesList = [...activeExpensesList]
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);

  const membersByPlan = members.reduce<Record<string, number>>((acc, m) => {
    const pName = m.plan?.name || 'Standard Pass';
    acc[pName] = (acc[pName] || 0) + 1;
    return acc;
  }, {});

  const topExpenseEntry = Object.entries(expensesByCategory).sort((a, b) => b[1].total - a[1].total)[0];
  const topCategoryName = topExpenseEntry ? topExpenseEntry[0] : 'None';
  const topCategoryTotal = topExpenseEntry ? topExpenseEntry[1].total : 0;

  const topRevenuePlanEntry = Object.entries(paymentsByPlan).sort((a, b) => b[1].total - a[1].total)[0];
  const topRevenuePlanName = topRevenuePlanEntry ? topRevenuePlanEntry[0] : 'Standard Pass';

  const topPaymentMethodEntry = Object.entries(paymentsByMethod).sort((a, b) => b[1].total - a[1].total)[0];
  const topPaymentMethodName = topPaymentMethodEntry ? topPaymentMethodEntry[0] : 'GCash';

  const totalRevenueCollected = Object.values(paymentsByMethod).reduce((sum, item) => sum + item.total, 0);
  const baseRevenue = kpis.totalRevenue > 0 ? kpis.totalRevenue : totalRevenueCollected;

  const totalExpensesOutlays = Object.values(expensesByCategory).reduce((sum, item) => sum + item.total, 0);
  const baseExpenses = kpis.totalExpenses > 0 ? kpis.totalExpenses : totalExpensesOutlays;

  const getCategoryDetails = (category: string) => {
    switch (category) {
      case 'Rent':
        return { icon: Building2, color: '#475569', bg: '#f1f5f9', border: '#e2e8f0', bar: 'linear-gradient(90deg, #64748b, #94a3b8)' };
      case 'Utilities':
        return { icon: Zap, color: '#d97706', bg: '#fffbeb', border: '#fde68a', bar: 'linear-gradient(90deg, #f59e0b, #fbbf24)' };
      case 'Salaries':
        return { icon: Users, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', bar: 'linear-gradient(90deg, #3b82f6, #60a5fa)' };
      case 'Supplies':
        return { icon: Package, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', bar: 'linear-gradient(90deg, #10b981, #34d399)' };
      case 'Maintenance':
        return { icon: Wrench, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', bar: 'linear-gradient(90deg, #8b5cf6, #a78bfa)' };
      case 'Equipment':
        return { icon: Dumbbell, color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc', bar: 'linear-gradient(90deg, #06b6d4, #22d3ee)' };
      case 'Marketing':
        return { icon: Megaphone, color: '#e11d48', bg: '#fff1f2', border: '#fecdd3', bar: 'linear-gradient(90deg, #f43f5e, #fb7185)' };
      default:
        return { icon: Layers, color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', bar: 'linear-gradient(90deg, #64748b, #94a3b8)' };
    }
  };

  const getPaymentMethodDetails = (method: string) => {
    switch (method) {
      case 'GCash':
        return { icon: Smartphone, color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', bar: 'linear-gradient(90deg, #0284c7, #38bdf8)' };
      case 'Cash':
      default:
        return { icon: Banknote, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', bar: 'linear-gradient(90deg, #059669, #34d399)' };
    }
  };

  const getPlanBadgeDetails = (name: string) => {
    if (name.toLowerCase().includes('vip')) {
      return { color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', bar: 'linear-gradient(90deg, #8b5cf6, #c084fc)' };
    }
    if (name.toLowerCase().includes('quarterly')) {
      return { color: '#0284c7', bg: '#e0f2fe', border: '#bae6fd', bar: 'linear-gradient(90deg, #0284c7, #38bdf8)' };
    }
    return { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', bar: 'linear-gradient(90deg, #10b981, #34d399)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Greeting */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              {greeting}, {adminFirstName}!
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#86868b' }}>
              Here&apos;s what&apos;s happening with your gym&apos;s finances today.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="btn btn-outline btn-sm"
            >
              <Plus size={14} />
              <span>Record Payment</span>
            </button>
            <button
              onClick={() => setIsMemberModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Add Member</span>
            </button>
          </div>
        </div>
      </ScrollReveal>

      {/* 2. Key Metrics Row (4 Clickable Cards) */}
      <ScrollReveal delay={50}>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`+${currency}${kpis.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            trend={revenueTrend}
            variant="emerald"
            valueColor="#059669"
            onClick={() => setActiveBreakdown('revenue')}
            clickableHint="Breakdown"
          />

          <MetricCard
            title="Total Expenses"
            value={`-${currency}${kpis.totalExpenses.toLocaleString()}`}
            icon={Receipt}
            trend={expenseTrend}
            variant="rose"
            valueColor="#ef4444"
            onClick={() => setActiveBreakdown('expenses')}
            clickableHint="Breakdown"
          />

          <MetricCard
            title="Net Profit"
            value={`${kpis.netProfit >= 0 ? '+' : '-'}${currency}${Math.abs(kpis.netProfit).toLocaleString()}`}
            icon={CreditCard}
            trend={profitTrend}
            variant={kpis.netProfit >= 0 ? 'emerald' : 'rose'}
            valueColor={kpis.netProfit >= 0 ? '#059669' : '#ef4444'}
            onClick={() => setActiveBreakdown('profit')}
            clickableHint="Breakdown"
          />

          <MetricCard
            title="Active Members"
            value={kpis.activeMembers}
            icon={Users}
            trend={memberTrend}
            variant="purple"
            onClick={() => setActiveBreakdown('members')}
            clickableHint="Breakdown"
          />
        </div>
      </ScrollReveal>

      {/* 3. Main Analytics Row: Revenue vs Expenses (60%) & Expense Breakdown (40%) */}
      <ScrollReveal delay={100}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.55fr 1fr',
            gap: '1.5rem',
          }}
          className="analytics-grid"
        >
          {/* Revenue vs Expenses Chart Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1d1d1f' }}>
                Revenue vs Expenses
              </h2>
            </div>
            <div style={{ flex: 1 }}>
              <RevenueExpenseChart data={trends} currency={currency} />
            </div>
          </div>

          {/* Expense Breakdown Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#1d1d1f' }}>
                Expense Breakdown
              </h2>
              <button
                onClick={() => setIsExpenseModalOpen(true)}
                style={{ fontSize: '0.785rem', color: '#059669', fontWeight: 600, cursor: 'pointer' }}
              >
                + Add
              </button>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
              <CategoryExpenseChart expenses={DBService.getExpenses()} currency={currency} />
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* 4. Bottom 3 Cards: AI Insights, Upcoming Renewals, Recent Activity */}
      <ScrollReveal delay={150}>
        <div className="grid grid-cols-3 gap-4">
          {/* Card 1: AI Insights */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.35rem 1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={15} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
                  AI Insights
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#424245', lineHeight: 1.55 }}>
                {members.length > 0
                  ? `Revenue is projected to increase based on current subscription momentum and renewal trends.`
                  : `Add gym members and record transactions to begin receiving AI revenue projections and churn warnings.`}
              </p>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href="/analytics"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#059669',
                }}
              >
                <span>View Forecast</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Card 2: Upcoming Renewals */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.35rem 1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    backgroundColor: '#fffbeb',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={15} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
                  Upcoming Renewals
                </h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#424245', lineHeight: 1.55 }}>
                {expiringMembers.length > 0 ? (
                  <><strong>{expiringMembers.length} memberships</strong> expire in the next 7 days. Early outreach recommended to retain at-risk members.</>
                ) : (
                  <><strong>No expiring memberships</strong> in the next 7 days. All member accounts are currently active or up to date.</>
                )}
              </p>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href="/members?status=expiring"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#059669',
                }}
              >
                <span>View Members</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Card 3: Recent Activity */}
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '1.35rem 1.5rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '7px',
                    backgroundColor: '#f1f5f9',
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={15} />
                </div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#1d1d1f' }}>
                  Recent Activity
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {recentPayments.map((p, idx) => (
                  <div key={p.id || idx} style={{ fontSize: '0.8rem', borderBottom: idx === 0 ? '1px solid #f1f5f9' : 'none', paddingBottom: idx === 0 ? '0.5rem' : '0' }}>
                    <div style={{ fontWeight: 600, color: '#1d1d1f' }}>
                      Payment received • {currency}{Number(p.amount).toLocaleString()}
                    </div>
                    <div style={{ color: '#86868b', fontSize: '0.75rem', marginTop: '2px' }}>
                      {p.member?.first_name} {p.member?.last_name} • {p.payment_method} • Just now
                    </div>
                  </div>
                ))}
                {recentPayments.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#86868b' }}>No recent activity</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              <Link
                href="/payments"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  color: '#059669',
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Modals for Quick Actions */}
      <MemberModal
        isOpen={isMemberModalOpen}
        onClose={() => setIsMemberModalOpen(false)}
        onSuccess={() => {
          setIsMemberModalOpen(false);
          refreshData();
        }}
      />
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
          setIsPaymentModalOpen(false);
          refreshData();
        }}
      />
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        onSuccess={() => {
          setIsExpenseModalOpen(false);
          refreshData();
        }}
      />

      {/* Reminder Modal triggered from Members Breakdown */}
      <PaymentReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => {
          setIsReminderModalOpen(false);
          setSelectedMemberForReminder(null);
        }}
        member={selectedMemberForReminder}
        onSuccess={() => {
          refreshData();
        }}
      />

      {/* Interactive Dashboard Metric Card Slide-Over Drawer */}
      {mounted && activeBreakdown && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.35)',
            backdropFilter: 'blur(16px) saturate(160%)',
            WebkitBackdropFilter: 'blur(16px) saturate(160%)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
            animation: 'modalBackdropFade 0.2s ease-out',
          }}
          onClick={() => setActiveBreakdown(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '640px',
              height: '100vh',
              backgroundColor: '#ffffff',
              borderLeft: '1px solid rgba(0, 0, 0, 0.08)',
              boxShadow: '-16px 0 45px -10px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              animation: 'drawerSlideInRight 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div
              style={{
                padding: '1.5rem 1.75rem 1.25rem',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '1rem',
                backgroundColor: '#ffffff',
              }}
            >
              <div>
                {activeBreakdown === 'revenue' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5', color: '#059669', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <TrendingUp size={13} />
                    <span>Revenue Intelligence • {kpis.periodLabel}</span>
                  </div>
                )}
                {activeBreakdown === 'expenses' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: '#fff1f2', border: '1px solid #ffe4e6', color: '#e11d48', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <Receipt size={13} />
                    <span>Operating Expenditures • {kpis.periodLabel}</span>
                  </div>
                )}
                {activeBreakdown === 'profit' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: '#eff6ff', border: '1px solid #dbeafe', color: '#2563eb', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <Activity size={13} />
                    <span>Executive P&L Statement • {kpis.periodLabel}</span>
                  </div>
                )}
                {activeBreakdown === 'members' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.25rem 0.75rem', borderRadius: '999px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe', color: '#7c3aed', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    <Users size={13} />
                    <span>Membership Roster & Cohorts</span>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.65rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontSize: '2.1rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                    {activeBreakdown === 'revenue' && (
                      <span style={{ color: '#059669' }}>+{currency}{kpis.totalRevenue.toLocaleString()}</span>
                    )}
                    {activeBreakdown === 'expenses' && (
                      <span style={{ color: '#ef4444' }}>-{currency}{kpis.totalExpenses.toLocaleString()}</span>
                    )}
                    {activeBreakdown === 'profit' && (
                      <span style={{ color: kpis.netProfit >= 0 ? '#059669' : '#ef4444' }}>
                        {kpis.netProfit >= 0 ? '+' : '-'}{currency}{Math.abs(kpis.netProfit).toLocaleString()}
                      </span>
                    )}
                    {activeBreakdown === 'members' && (
                      <span style={{ color: '#0f172a' }}>{kpis.activeMembers} Members</span>
                    )}
                  </h3>
                  {activeBreakdown === 'profit' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: kpis.profitMargin >= 20 ? '#059669' : '#e11d48', backgroundColor: kpis.profitMargin >= 20 ? '#ecfdf5' : '#fff1f2', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                      {kpis.profitMargin}% Net Margin
                    </span>
                  )}
                  {activeBreakdown === 'members' && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                      of {members.length} total registered
                    </span>
                  )}
                </div>

                <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '4px' }}>
                  {activeBreakdown === 'revenue' && (activePaymentsList.length > 0
                    ? `Aggregated across ${activePaymentsList.length} verified member payments in ${kpis.periodLabel}.`
                    : 'No payments recorded this month.')}
                  {activeBreakdown === 'expenses' && (activeExpensesList.length > 0
                    ? `Recorded operational expenditures across ${activeExpensesList.length} verified expense entries.`
                    : 'No expenses recorded this month.')}
                  {activeBreakdown === 'profit' && `Reconciled net take-home cash flow after deducting operational facility costs.`}
                  {activeBreakdown === 'members' && `Current member status, tier distribution, and active retention cohorts.`}
                </p>
              </div>

              {/* Close Button */}
              <button
                onClick={() => setActiveBreakdown(null)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#f1f5f9',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748b',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                  e.currentTarget.style.color = '#0f172a';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#64748b';
                }}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.5rem 1.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.5rem',
              }}
            >
              {/* BREAKDOWN 1: TOTAL REVENUE */}
              {activeBreakdown === 'revenue' && activePaymentsList.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Average Payment</span>
                      <strong style={{ fontSize: '1.15rem', color: '#059669' }}>
                        {currency}{Math.round(baseRevenue / (activePaymentsList.length || 1)).toLocaleString()}
                      </strong>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Primary Channel</span>
                      <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{topPaymentMethodName}</strong>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Leading Tier</span>
                      <strong style={{ fontSize: '1.15rem', color: '#0284c7' }}>{topRevenuePlanName}</strong>
                    </div>
                  </div>

                  {/* Section A: Payment Methods */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Collections by Payment Method
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Deposit channels breakdown
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.entries(paymentsByMethod).map(([method, data]) => {
                        const pct = baseRevenue > 0 ? Math.round((data.total / baseRevenue) * 100) : 0;
                        const details = getPaymentMethodDetails(method);
                        const IconComponent = details.icon;

                        return (
                          <div
                            key={method}
                            style={{
                              padding: '1rem 1.15rem',
                              backgroundColor: '#ffffff',
                              borderRadius: '14px',
                              border: '1px solid #f1f5f9',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: details.bg,
                                    border: `1px solid ${details.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: details.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconComponent size={18} strokeWidth={2.2} />
                                </div>
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>{method}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '1px' }}>
                                    {data.count} {data.count === 1 ? 'transaction' : 'transactions'}
                                  </span>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: '#059669', fontSize: '1rem' }}>
                                  +{currency}{data.total.toLocaleString()}
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    color: '#059669',
                                    backgroundColor: '#ecfdf5',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    display: 'inline-block',
                                    marginTop: '2px',
                                  }}
                                >
                                  {pct}% of collections
                                </span>
                              </div>
                            </div>

                            <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(4, pct))}%`,
                                  height: '100%',
                                  background: details.bar,
                                  borderRadius: '999px',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Membership Plan Contributions */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Revenue by Membership Tier
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Subscription tiers performance
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      {Object.entries(paymentsByPlan).map(([planName, data]) => {
                        const badge = getPlanBadgeDetails(planName);
                        return (
                          <div
                            key={planName}
                            style={{
                              padding: '1rem',
                              borderRadius: '14px',
                              border: `1px solid ${badge.border}`,
                              backgroundColor: '#ffffff',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: badge.color, backgroundColor: badge.bg, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                                {planName}
                              </span>
                              <span style={{ fontSize: '0.725rem', color: '#64748b' }}>
                                {data.count} subs
                              </span>
                            </div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                              {currency}{data.total.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeBreakdown === 'revenue' && activePaymentsList.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                  No payments recorded this month.
                </div>
              )}

              {/* BREAKDOWN 2: TOTAL EXPENSES */}
              {activeBreakdown === 'expenses' && activeExpensesList.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Recorded Items</span>
                      <strong style={{ fontSize: '1.15rem', color: '#0f172a' }}>{activeExpensesList.length} Entries</strong>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Top Category</span>
                      <strong style={{ fontSize: '1.15rem', color: '#e11d48' }}>{topCategoryName}</strong>
                    </div>
                    <div style={{ padding: '0.85rem 1rem', borderRadius: '12px', backgroundColor: '#fafafa', border: '1px solid #f1f5f9' }}>
                      <span style={{ fontSize: '0.725rem', color: '#64748b', fontWeight: 600, display: 'block', textTransform: 'uppercase', letterSpacing: '0.03em' }}>MoM Variance</span>
                      <strong style={{ fontSize: '1.15rem', color: expenseTrend?.positive ? '#059669' : '#e11d48' }}>
                        {expenseTrend ? expenseTrend.value : '0%'}
                      </strong>
                    </div>
                  </div>

                  {/* Section A: Outlays by Category */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Outlays by Category
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Share of total monthly overhead
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.entries(expensesByCategory).map(([cat, data]) => {
                        const pct = baseExpenses > 0 ? Math.round((data.total / baseExpenses) * 100) : 0;
                        const details = getCategoryDetails(cat);
                        const IconComponent = details.icon;

                        return (
                          <div
                            key={cat}
                            style={{
                              padding: '1rem 1.15rem',
                              backgroundColor: '#ffffff',
                              borderRadius: '14px',
                              border: '1px solid #f1f5f9',
                              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div
                                  style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    backgroundColor: details.bg,
                                    border: `1px solid ${details.border}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: details.color,
                                    flexShrink: 0,
                                  }}
                                >
                                  <IconComponent size={18} strokeWidth={2.2} />
                                </div>
                                <div>
                                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.925rem' }}>{cat}</span>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '1px' }}>
                                    {data.count} {data.count === 1 ? 'logged expense' : 'logged expenses'}
                                  </span>
                                </div>
                              </div>

                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                                  {currency}{data.total.toLocaleString()}
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.725rem',
                                    fontWeight: 700,
                                    color: '#e11d48',
                                    backgroundColor: '#fff1f2',
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '6px',
                                    display: 'inline-block',
                                    marginTop: '2px',
                                  }}
                                >
                                  {pct}% of outlays
                                </span>
                              </div>
                            </div>

                            <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(4, pct))}%`,
                                  height: '100%',
                                  background: details.bar,
                                  borderRadius: '999px',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Top Expense Items */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Top Expense Line Items
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Ranked by amount
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {topExpensesList.map((e) => {
                        const details = getCategoryDetails(e.category);
                        const IconComponent = details.icon;

                        return (
                          <div
                            key={e.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.85rem 1.15rem',
                              backgroundColor: '#ffffff',
                              border: '1px solid #f1f5f9',
                              borderRadius: '12px',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '9px',
                                  backgroundColor: details.bg,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: details.color,
                                  flexShrink: 0,
                                }}
                              >
                                <IconComponent size={17} strokeWidth={2} />
                              </div>
                              <div>
                                <strong style={{ color: '#0f172a', fontSize: '0.875rem' }}>{e.title}</strong>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '2px', fontSize: '0.75rem', color: '#64748b' }}>
                                  <span style={{ fontWeight: 600, color: details.color }}>{e.category}</span>
                                  <span>•</span>
                                  <span>{e.expense_date}</span>
                                </div>
                              </div>
                            </div>

                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#e11d48', fontSize: '0.975rem' }}>
                                -{currency}{Number(e.amount).toLocaleString()}
                              </div>
                              <span style={{ fontSize: '0.675rem', fontWeight: 600, color: '#64748b', backgroundColor: '#f1f5f9', padding: '0.15rem 0.45rem', borderRadius: '4px', display: 'inline-block', marginTop: '2px' }}>
                                Recorded
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {activeBreakdown === 'expenses' && activeExpensesList.length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                  No expenses recorded this month.
                </div>
              )}

              {/* BREAKDOWN 3: NET PROFIT */}
              {activeBreakdown === 'profit' && (
                <>
                  {/* Executive P&L Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.35rem 1.5rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.85rem' }}>
                      Monthly Income Reconciliation (P&L)
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowUpRight size={16} />
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>(+) Gross Operating Revenue</span>
                        </div>
                        <strong style={{ fontSize: '1.05rem', color: '#059669' }}>+{currency}{kpis.totalRevenue.toLocaleString()}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: '#fff1f2', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ArrowDownRight size={16} />
                          </div>
                          <span style={{ fontSize: '0.9rem', color: '#334155', fontWeight: 500 }}>(-) Operating Facility Overhead</span>
                        </div>
                        <strong style={{ fontSize: '1.05rem', color: '#ef4444' }}>-{currency}{kpis.totalExpenses.toLocaleString()}</strong>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.25rem' }}>
                        <div>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>(=) Net Operating Profit</span>
                          <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>Post-expense net retained earnings</span>
                        </div>
                        <strong style={{ fontSize: '1.45rem', fontWeight: 800, color: kpis.netProfit >= 0 ? '#059669' : '#ef4444' }}>
                          {kpis.netProfit >= 0 ? '+' : '-'}{currency}{Math.abs(kpis.netProfit).toLocaleString()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Multi-Month Profit Trajectory */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Multi-Month Profit Trajectory
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Past 6 performance periods
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(95px, 1fr))', gap: '0.5rem' }}>
                      {trends.slice(-6).map((t) => (
                        <div
                          key={t.monthKey}
                          style={{
                            textAlign: 'center',
                            padding: '0.85rem 0.5rem',
                            backgroundColor: '#f8fafc',
                            borderRadius: '10px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block' }}>{t.month}</span>
                          <strong style={{ fontSize: '0.95rem', color: t.profit >= 0 ? '#059669' : '#e11d48', display: 'block', marginTop: '4px' }}>
                            {currency}{(t.profit / 1000).toFixed(0)}k
                          </strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actionable Profit Tip Card */}
                  <div
                    style={{
                      padding: '1rem 1.25rem',
                      borderRadius: '14px',
                      backgroundColor: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#dcfce7', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Sparkles size={18} />
                    </div>
                    <div style={{ fontSize: '0.825rem', color: '#166534', lineHeight: 1.45 }}>
                      <strong>AI Profit Maximizer:</strong> Your current operating margin is <strong>{kpis.profitMargin}%</strong>. Implementing HVAC automation and bulk supply procurement can immediately trim expenses by up to <strong>₱10,000/mo</strong>.
                    </div>
                  </div>
                </>
              )}

              {/* BREAKDOWN 4: ACTIVE MEMBERS */}
              {activeBreakdown === 'members' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.65rem' }}>
                    <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: '#ecfdf5', border: '1px solid #d1fae5' }}>
                      <span style={{ fontSize: '0.7rem', color: '#065f46', fontWeight: 600, display: 'block' }}>Active Members</span>
                      <strong style={{ fontSize: '1.25rem', color: '#059669' }}>{kpis.activeMembers}</strong>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: '#fffbeb', border: '1px solid #fef3c7' }}>
                      <span style={{ fontSize: '0.7rem', color: '#92400e', fontWeight: 600, display: 'block' }}>Expiring (7d)</span>
                      <strong style={{ fontSize: '1.25rem', color: '#b45309' }}>{kpis.expiringMemberships}</strong>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Expired/Inactive</span>
                      <strong style={{ fontSize: '1.25rem', color: '#475569' }}>{kpis.expiredMemberships}</strong>
                    </div>
                    <div style={{ padding: '0.85rem', borderRadius: '12px', backgroundColor: '#f5f3ff', border: '1px solid #ede9fe' }}>
                      <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: 600, display: 'block' }}>Retention Rate</span>
                      <strong style={{ fontSize: '1.25rem', color: '#7c3aed' }}>{kpis.renewalRate}%</strong>
                    </div>
                  </div>

                  {/* Section A: Plan Distribution */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                        Membership Tier Distribution
                      </h4>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        Roster breakdown by package
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {Object.entries(membersByPlan).map(([planName, count]) => {
                        const pct = members.length > 0 ? Math.round((count / members.length) * 100) : 0;
                        const badge = getPlanBadgeDetails(planName);

                        return (
                          <div
                            key={planName}
                            style={{
                              padding: '0.9rem 1.15rem',
                              backgroundColor: '#ffffff',
                              borderRadius: '14px',
                              border: '1px solid #f1f5f9',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
                              <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{planName}</span>
                              <span style={{ fontWeight: 700, color: badge.color, fontSize: '0.875rem' }}>
                                {count} {count === 1 ? 'member' : 'members'} ({pct}%)
                              </span>
                            </div>

                            <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                              <div
                                style={{
                                  width: `${Math.min(100, Math.max(4, pct))}%`,
                                  height: '100%',
                                  background: badge.bar,
                                  borderRadius: '999px',
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Section B: Expiring Members Outreach */}
                  {expiringMembers.length > 0 && (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                          Expiring Memberships • Outreach Needed
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: '#b45309', fontWeight: 600 }}>
                          {expiringMembers.length} requiring renewal
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {expiringMembers.map((m) => (
                          <div
                            key={m.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.85rem 1.15rem',
                              backgroundColor: '#fffbeb',
                              border: '1px solid #fef3c7',
                              borderRadius: '12px',
                            }}
                          >
                            <div>
                              <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{m.first_name} {m.last_name}</strong>
                              <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                Plan: <strong>{m.plan?.name || 'Standard Pass'}</strong> • Expires: <span style={{ color: '#b45309', fontWeight: 600 }}>{m.end_date}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                setSelectedMemberForReminder(m);
                                setIsReminderModalOpen(true);
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.775rem',
                                padding: '0.35rem 0.75rem',
                                backgroundColor: '#ffffff',
                                border: '1px solid #fde68a',
                              }}
                            >
                              <Bell size={13} style={{ color: '#d97706' }} />
                              <span>Send Reminder</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Sticky Footer Bar */}
            <div
              style={{
                padding: '1rem 1.75rem',
                borderTop: '1px solid #f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#ffffff',
              }}
            >
              <button
                onClick={() => setActiveBreakdown(null)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.825rem', padding: '0.45rem 1rem' }}
              >
                Close
              </button>

              <Link
                href={
                  activeBreakdown === 'revenue'
                    ? '/payments'
                    : activeBreakdown === 'expenses'
                    ? '/expenses'
                    : activeBreakdown === 'profit'
                    ? '/analytics'
                    : '/members'
                }
                onClick={() => setActiveBreakdown(null)}
                className="btn btn-primary btn-sm"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.825rem',
                  padding: '0.45rem 1.15rem',
                  backgroundColor: '#0f172a',
                  borderRadius: '999px',
                }}
              >
                <span>
                  {activeBreakdown === 'revenue' && 'Open Full Payments Ledger'}
                  {activeBreakdown === 'expenses' && 'Open Full Expense Ledger & History'}
                  {activeBreakdown === 'profit' && 'Open AI Profit Optimization'}
                  {activeBreakdown === 'members' && 'Manage All Members'}
                </span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        @media (max-width: 1024px) {
          .analytics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
