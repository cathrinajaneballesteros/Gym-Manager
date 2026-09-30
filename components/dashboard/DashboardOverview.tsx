'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { DashboardKPIs, MonthlyTrendData, Member, UserProfile, Payment } from '@/types/database';
import { MetricCard } from '@/components/ui/MetricCard';
import { RevenueExpenseChart } from '@/components/charts/RevenueExpenseChart';
import { CategoryExpenseChart } from '@/components/charts/CategoryExpenseChart';
import { MemberModal } from '@/components/members/MemberModal';
import { PaymentModal } from '@/components/payments/PaymentModal';
import { ExpenseModal } from '@/components/expenses/ExpenseModal';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const DashboardOverview: React.FC = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendData[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Modals state
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const refreshData = () => {
    setKpis(DBService.getDashboardKPIs('this-month'));
    setTrends(DBService.getMonthlyTrends());
    setMembers(DBService.getMembers());
    setPayments(DBService.getPayments());
    setProfile(DBService.getProfile());
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!kpis) return null;

  const currency = profile?.currency || '₱';
  const expiringMembers = members.filter((m) => m.status === 'expiring');
  const recentPayments = payments.slice(0, 2);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. Header Greeting */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              Good morning, Alex!
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

      {/* 2. Key Metrics Row (4 Cards) */}
      <ScrollReveal delay={50}>
        <div className="grid grid-cols-4 gap-4">
          <MetricCard
            title="Total Revenue"
            value={`${currency}${kpis.totalRevenue.toLocaleString()}`}
            icon={TrendingUp}
            trend={kpis.totalRevenue > 0 ? { value: '12.5%', positive: true, label: 'from last month' } : undefined}
            variant="emerald"
          />

          <MetricCard
            title="Total Expenses"
            value={`${currency}${kpis.totalExpenses.toLocaleString()}`}
            icon={Receipt}
            trend={kpis.totalExpenses > 0 ? { value: '4.2%', positive: false, label: 'from last month' } : undefined}
            variant="rose"
          />

          <MetricCard
            title="Net Profit"
            value={`${currency}${kpis.netProfit.toLocaleString()}`}
            icon={CreditCard}
            trend={kpis.netProfit !== 0 ? { value: '18.8%', positive: kpis.netProfit > 0, label: 'from last month' } : undefined}
            variant="blue"
          />

          <MetricCard
            title="Active Members"
            value={kpis.activeMembers}
            icon={Users}
            trend={kpis.activeMembers > 0 ? { value: '8.3%', positive: true, label: 'from last month' } : undefined}
            variant="purple"
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
