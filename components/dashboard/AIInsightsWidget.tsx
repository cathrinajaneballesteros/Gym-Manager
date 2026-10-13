'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, AlertTriangle, UserX, ArrowRight, TrendingUp } from 'lucide-react';
import { detectExpenseLeaks } from '@/lib/ai/leak-detector';
import { predictMemberChurn } from '@/lib/ai/churn-detector';

export const AIInsightsWidget: React.FC = () => {
  const leaks = detectExpenseLeaks();
  const churn = predictMemberChurn();

  const topLeak = leaks.anomalies[0];
  const topChurnMember = churn.highRiskMembers[0];

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem 1.5rem',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.1)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(139, 92, 246, 0.2)',
              color: '#c4b5fd',
              display: 'flex',
            }}
          >
            <Sparkles size={18} />
          </div>
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-white)' }}>
              Proactive AI Insights & Anomaly Alerts
            </h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Autonomous detection derived from membership and expense patterns
            </p>
          </div>
        </div>

        <Link
          href="/analytics"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: '#c4b5fd',
          }}
        >
          <span>View Full AI Intelligence</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Expense Anomaly Card */}
        {topLeak ? (
          <div
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                <AlertTriangle size={14} />
                <span>HIGHER THAN USUAL SPENDING</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                {topLeak.category} +{topLeak.percentageIncrease}% vs usual
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {topLeak.detectionReason}
              </p>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
              Tip: {topLeak.suggestedAction.length > 95 ? `${topLeak.suggestedAction.slice(0, 95)}…` : topLeak.suggestedAction}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {leaks.hasEnoughHistory
                ? 'Spending is in line with your usual months.'
                : 'Spending checks start once you have 2 months of expenses recorded.'}
            </div>
          </div>
        )}

        {/* Churn Risk Card */}
        {topChurnMember ? (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.3rem' }}>
                <UserX size={14} />
                <span>MEMBERSHIP CHURN ALERT</span>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                {topChurnMember.memberName} ({topChurnMember.riskLevel} Risk)
              </div>
              <p style={{ fontSize: '0.775rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Has not visited in {topChurnMember.daysSinceLastVisit} days. Membership expires in {topChurnMember.daysUntilExpiration} days.
              </p>
            </div>
            <div style={{ marginTop: '0.75rem', fontSize: '0.725rem', color: 'var(--text-dim)' }}>
              Action: {topChurnMember.suggestedAction}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All member attendance frequencies healthy.</div>
          </div>
        )}
      </div>
    </div>
  );
};
