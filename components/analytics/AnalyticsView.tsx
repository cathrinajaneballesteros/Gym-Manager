'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, PiggyBank, CheckCircle2 } from 'lucide-react';
import { calculateRevenueForecast } from '@/lib/ai/forecasting';
import { predictMemberChurn } from '@/lib/ai/churn-detector';
import { detectExpenseLeaks } from '@/lib/ai/leak-detector';
import { RevenueForecastResult, ChurnPredictionResult, ChurnPredictionMember, ExpenseLeakResult } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { useGymDataRefresh } from '@/lib/ui/use-gym-data-refresh';
import { UserProfile } from '@/types/database';
import { showAlert, showToast, showError } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';
import { formatCompactAmount } from '@/lib/ui/format';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const AnalyticsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'churn' | 'leaks'>('forecast');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [forecast, setForecast] = useState<RevenueForecastResult | null>(null);
  const [churn, setChurn] = useState<ChurnPredictionResult | null>(null);
  const [leaks, setLeaks] = useState<ExpenseLeakResult | null>(null);
  const [contactedMemberId, setContactedMemberId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isCostSavingAiLoading, setIsCostSavingAiLoading] = useState(false);

  const loadAnalytics = () => {
    setProfile(DBService.getProfile());
    setForecast(calculateRevenueForecast(false));
    setChurn(predictMemberChurn());
    setLeaks(detectExpenseLeaks());
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the gym data AppShell already loaded
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useGymDataRefresh(loadAnalytics);

  const handleGenerateAiBrief = async () => {
    setIsAiLoading(true);
    try {
      const kpis = DBService.getDashboardKPIs('this-month');
      const expenses = DBService.getExpenses();
      const totalsByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
      }, {});
      const topCat =
        Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Rent';

      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalRevenue: kpis.totalRevenue,
          totalExpenses: kpis.totalExpenses,
          netProfit: kpis.netProfit,
          profitMargin: kpis.profitMargin,
          activeMembers: kpis.activeMembers,
          churnRiskCount: churn?.highRiskCount || 0,
          topExpenseCategory: topCat,
        }),
      });

      // A timeout or crash page isn't JSON; fall through to the error message instead of "Unexpected token <".
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate AI executive brief');
      }

      const formattedHtml = escapeHtml(`${data.report}\n`) // trailing newline so the last line is formatted too
        .replace(/#### (.*?)\n/g, '<h5 style="font-weight:600; color:#334155; margin-top:0.75rem; margin-bottom:0.25rem; font-size:0.9rem;">$1</h5>')
        .replace(/#{2,3} (.*?)\n/g, '<h4 style="font-weight:700; color:#0f172a; margin-top:1rem; margin-bottom:0.4rem; font-size:1rem;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*?)\n/g, '<li style="margin-bottom:0.35rem; color:#475569;">$1</li>')
        .replace(/\n\n/g, '<br/>');

      showAlert({
        icon: 'success',
        title: 'Executive AI Brief (Gemini)',
        html: `
          <div style="text-align: left; font-size: 0.875rem; line-height: 1.6; max-height: 60vh; overflow-y: auto; padding: 0.5rem 0.25rem; white-space: pre-line;">${formattedHtml.trim()}</div>
        `,
        confirmButtonText: 'Done',
        confirmButtonColor: '#6366f1',
      });
    } catch (err) {
      showError('AI Generation Notice', err instanceof Error ? err.message : 'Unable to generate brief at this time.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDraftMessage = async (member: ChurnPredictionMember) => {
    try {
      showToast('Generating personalized message with Gemini...');
      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'retention-message',
          memberName: member.memberName,
          daysInactive: member.daysSinceLastVisit,
          daysUntilExpiry: member.daysUntilExpiration,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.error);

      showAlert({
        icon: 'info',
        title: `Retention Outreach • ${escapeHtml(member.memberName)}`,
        html: `
          <div style="text-align: left; font-size: 0.875rem; line-height: 1.5; color: #334155;">
            <p style="margin-bottom: 0.5rem; font-size: 0.75rem; text-transform: uppercase; color: #64748b; font-weight: 600;">
              ✨ AI Personalized Message (SMS / WhatsApp)
            </p>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1rem; font-style: italic; color: #0f172a; margin-bottom: 1rem;">
              "${escapeHtml(data.message)}"
            </div>
            <p style="font-size: 0.8rem; color: #64748b;">
              Click Copy to put this message on your clipboard.
            </p>
          </div>
        `,
        confirmButtonText: 'Copy to Clipboard',
        confirmButtonColor: '#059669',
      }).then((result) => {
        if (result.isConfirmed) {
          navigator.clipboard.writeText(data.message);
          showToast('Copied to clipboard!');
          setContactedMemberId(member.memberId);
        }
      });
    } catch {
      handleContactMember(member);
    }
  };

  const handleGenerateCostSavingPlan = async () => {
    setIsCostSavingAiLoading(true);
    try {
      const kpis = DBService.getDashboardKPIs('this-month');
      const expenses = DBService.getExpenses();
      const totalsByCategory = expenses.reduce<Record<string, number>>((acc, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
        return acc;
      }, {});
      const topCat =
        Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Utilities';

      const res = await fetch('/api/ai/narrative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cost-saving-plan',
          totalExpenses: kpis.totalExpenses,
          potentialMonthlySavings: leaks?.potentialMonthlySavings || 0,
          potentialAnnualSavings: leaks?.potentialAnnualSavings || 0,
          topExpenseCategory: topCat,
          anomalies: (leaks?.anomalies || []).map((a) => ({
            category: a.category,
            currentAmount: a.currentAmount,
            baseline: a.historicalAverage,
            difference: a.differenceAmount,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate cost-saving action plan');
      }

      const formattedHtml = escapeHtml(`${data.report}\n`) // trailing newline so the last line is formatted too
        .replace(/#### (.*?)\n/g, '<h5 style="font-weight:600; color:#334155; margin-top:0.75rem; margin-bottom:0.25rem; font-size:0.9rem;">$1</h5>')
        .replace(/#{2,3} (.*?)\n/g, '<h4 style="font-weight:700; color:#0f172a; margin-top:1rem; margin-bottom:0.4rem; font-size:1rem;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*?)\n/g, '<li style="margin-bottom:0.35rem; color:#475569;">$1</li>')
        .replace(/\n\n/g, '<br/>');

      showAlert({
        icon: 'success',
        title: 'Gemini Cost-Cutting Roadmap',
        html: `
          <div style="text-align: left; font-size: 0.875rem; line-height: 1.6; max-height: 60vh; overflow-y: auto; padding: 0.5rem 0.25rem; white-space: pre-line;">${formattedHtml.trim()}</div>
        `,
        confirmButtonText: 'Adopt Plan',
        confirmButtonColor: '#059669',
      });
    } catch (err) {
      showError('AI Optimization Notice', err instanceof Error ? err.message : 'Unable to generate cost-saving plan at this time.');
    } finally {
      setIsCostSavingAiLoading(false);
    }
  };

  if (!forecast || !churn || !leaks) return null;

  const currency = profile?.currency || '₱';

  // Chart data blending historical and projected
  // The last real month also starts the forecast line, so the dashed line joins the solid one.
  const lastHistoricalIndex = (forecast.trendSeries || []).filter((pt) => !pt.isForecast).length - 1;
  const chartData = (forecast.trendSeries || []).map((pt, i) => ({
    month: pt.period,
    historical: pt.isForecast ? null : pt.projectedRevenue,
    forecast: pt.isForecast || i === lastHistoricalIndex ? pt.projectedRevenue : null,
  }));

  const handleContactMember = async (member: ChurnPredictionMember) => {
    const gymName = profile?.gym_name || 'our gym';
    const message =
      member.daysUntilExpiration < 0
        ? `Hi ${member.memberName}, we miss you at ${gymName}! Your membership ended on ${member.expirationDate}. Come back and renew anytime.`
        : `Hi ${member.memberName}, this is ${gymName}. Your membership ends on ${member.expirationDate}. Renew early so you don't miss a session!`;
    try {
      await navigator.clipboard.writeText(message);
      setContactedMemberId(member.memberId);
      showToast('Message copied to clipboard!');
      setTimeout(() => setContactedMemberId(null), 3000);
    } catch {
      showError('Copy Failed', 'Could not copy the message. Please check your browser permissions.');
    }
  };

  const handleViewForecastDetails = () => {
    if (!forecast.hasSufficientData) {
      showAlert({
        icon: 'info',
        title: 'AI Revenue Forecast Model',
        html: `
          <div style="text-align: left; font-size: 0.9rem; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 0.85rem; padding: 0.5rem 0.75rem; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; color: #92400e; font-weight: 600; font-size: 0.85rem;">
              ⚠️ Not enough data yet
            </div>
            <p style="margin-bottom: 0.75rem; color: #1e293b;">
              The forecast uses your past monthly payments to estimate next month (linear regression).
            </p>
            <p style="margin-bottom: 0.75rem;">
              There are no payments yet, so there&apos;s nothing to learn from.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; color: #334155;">
              💡 <strong>Next step:</strong> add members in <em>Members</em> and record their payments. The forecast fills in by itself.
            </div>
          </div>
        `,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#059669',
      });
      return;
    }

    // Range for next month, the same month as the projection shown above it
    const nextPoint = forecast.trendSeries.find((p) => p.isForecast);
    const minBound = nextPoint ? nextPoint.lowerConfidence : Math.round(forecast.forecastedNextMonthRevenue * 0.9);
    const maxBound = nextPoint ? nextPoint.upperConfidence : Math.round(forecast.forecastedNextMonthRevenue * 1.1);

    const formatVal = (val: number) => formatCompactAmount(val, currency);

    showAlert({
      icon: 'info',
      title: 'AI Revenue Forecast Model',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #475569; line-height: 1.6;">
          <div style="margin-bottom: 0.85rem; padding: 0.5rem 0.75rem; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; color: #065f46; font-weight: 600; font-size: 0.85rem;">
            ✓ Active Model • ${forecast.confidenceScore}% Confidence Level
          </div>
          <p style="margin-bottom: 0.6rem; color: #1e293b;">
            ${nextPoint
              ? `<strong>3-Month Projection:</strong> Based on the trend across ${forecast.dataPointsCount} full month(s) of payments.`
              : '<strong>Early estimate:</strong> Next month is shown at the latest month&apos;s level until there are two full months of payments.'}
          </p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.75rem; font-size: 0.825rem;">
            <div style="background: #f8fafc; padding: 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; display: block;">Projected Next Month</span>
              <strong style="color: #059669; font-size: 1rem;">${currency}${forecast.forecastedNextMonthRevenue.toLocaleString()}</strong>
            </div>
            <div style="background: #f8fafc; padding: 0.6rem; border-radius: 6px; border: 1px solid #e2e8f0;">
              <span style="color: #64748b; display: block;">Confidence Range</span>
              <strong style="color: #0284c7; font-size: 1rem;">${formatVal(minBound)} – ${formatVal(maxBound)}</strong>
            </div>
          </div>
          <p style="font-size: 0.825rem; color: #64748b; margin-bottom: 0.5rem;">
            Expected renewals: <strong>${forecast.expectedRenewals}</strong> • Estimated new signups: <strong>${forecast.predictedNewMembers}</strong>
          </p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.65rem 0.85rem; font-size: 0.825rem; color: #334155;">
            ${forecast.explanation}
          </div>
        </div>
      `,
      confirmButtonText: 'Done',
      confirmButtonColor: '#059669',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
              AI Analytics
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Smarter insights for better decisions.
            </p>
          </div>

          <button
            onClick={handleGenerateAiBrief}
            disabled={isAiLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              padding: '0.55rem 1.25rem',
              borderRadius: '980px',
              fontSize: '0.825rem',
              fontWeight: 600,
              border: 'none',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
              cursor: isAiLoading ? 'wait' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <Sparkles size={15} style={{ color: '#a855f7' }} />
            <span>{isAiLoading ? 'Analyzing via Gemini AI...' : 'Executive AI Brief (Gemini)'}</span>
          </button>
        </div>
      </ScrollReveal>

      {/* 2. Apple macOS/iOS Segmented Navigation Controls */}
      <ScrollReveal delay={40}>
        <div style={{ display: 'inline-flex', backgroundColor: 'rgba(118, 118, 128, 0.12)', padding: '3px', borderRadius: '10px', gap: '2px', width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
          {([
            { key: 'forecast', label: 'Revenue Forecast' },
            { key: 'churn', label: 'Churn Prediction' },
            { key: 'leaks', label: 'Spending & Savings' },
          ] as const).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                whiteSpace: 'nowrap',
                flexShrink: 0,
                padding: '0.4rem 1.15rem',
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

      {/* 3. Tab: Revenue Forecast */}
      {activeTab === 'forecast' && (
        <ScrollReveal delay={70}>
          <div className="card" style={{ padding: '1.75rem' }}>
          {/* Header */}
          <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
              Revenue Forecast
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
              Based on your past payments and memberships
            </p>
          </div>

          {/* 3-Column Forecast Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr 1.25fr',
              gap: '2rem',
              alignItems: 'center',
            }}
            className="ai-forecast-grid"
          >
            {/* Column 1: Forecasted Revenue Value */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Forecasted Revenue
                </div>
                <div style={{ fontSize: '2.1rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {currency}{forecast.forecastedNextMonthRevenue.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                  Next month
                </div>
              </div>

              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.35rem 0.65rem', borderRadius: '6px', backgroundColor: forecast.hasSufficientData ? '#ecfdf5' : '#fef3c7', border: forecast.hasSufficientData ? '1px solid #d1fae5' : '1px solid #fde68a', color: forecast.hasSufficientData ? '#059669' : '#b45309', fontSize: '0.8rem', fontWeight: 600 }}>
                  <Sparkles size={13} />
                  <span>{forecast.hasSufficientData ? `Confidence Level: ${forecast.confidenceScore}%` : 'Awaiting Data'}</span>
                </div>
              </div>

              <div>
                <button
                  onClick={handleViewForecastDetails}
                  className="btn btn-primary btn-sm"
                  style={{ width: '100%' }}
                >
                  View Details
                </button>
              </div>
            </div>

            {/* Column 2: Historical vs Forecast Line Chart */}
            <div style={{ width: '100%', height: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '1.25rem', marginBottom: '0.5rem', fontSize: '0.785rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '16px', height: '2.5px', backgroundColor: '#0284c7' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Actual</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '16px', height: '2px', borderTop: '2px dashed #0284c7' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Forecast</span>
                </div>
              </div>

              {chartData.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #e2e8f0', borderRadius: '10px', padding: '1rem' }}>
                  Revenue trends appear after your first month of payments.
                </div>
              ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 12, right: 12, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" interval={0} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#f1f5f9' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, (dataMax: number) => Math.max(dataMax, 1000)]} tickFormatter={(val) => formatCompactAmount(val, currency)} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    formatter={(val) => [`${currency}${Number(val).toLocaleString()}`, '']}
                  />
                  {/* Forecast first so October's solid dot draws on top of where the dashed line starts */}
                  <Line type="monotone" dataKey="forecast" stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4, fill: '#ffffff', stroke: '#0284c7', strokeWidth: 2, strokeDasharray: '0' }} />
                  <Line type="monotone" dataKey="historical" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#0284c7' }} />
                </LineChart>
              </ResponsiveContainer>
              )}
            </div>

            {/* Column 3: Key Factors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                Key Factors
              </div>

              {!forecast.hasSufficientData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', color: '#64748b', fontSize: '0.8rem', padding: '0.25rem 0' }}>
                  <p style={{ fontWeight: 600, color: '#475569' }}>Awaiting initial activity</p>
                  <p style={{ color: '#94a3b8', fontSize: '0.75rem', lineHeight: 1.4 }}>
                    Shows up once you&apos;ve recorded members and payments.
                  </p>
                </div>
              ) : (
                [
                  { factor: 'Renewal retention', impact: `${DBService.getDashboardKPIs('this-month').renewalRate}%`, good: true },
                  {
                    factor: 'Growth trend',
                    impact: `${forecast.projectedGrowthPercent >= 0 ? '+' : ''}${forecast.projectedGrowthPercent}%`,
                    good: forecast.projectedGrowthPercent >= 0,
                  },
                  { factor: 'Predicted new signups', impact: `+${forecast.predictedNewMembers}`, good: true },
                  { factor: 'Expected renewals', impact: `${forecast.expectedRenewals}`, good: true },
                ].map((item) => (
                  <div key={item.factor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>{item.factor}</span>
                    <span style={{ fontWeight: 600, color: item.good ? '#059669' : '#ef4444' }}>{item.impact}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* 4. Tab: Churn Prediction */}
      {activeTab === 'churn' && (
        <ScrollReveal delay={70}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Members at Risk of Leaving
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
              Based on missed visits and memberships ending soon
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="phone-tight-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th className="hide-on-phone" style={{ padding: '0.9rem 1.25rem' }}>Risk Level</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Days Inactive</th>
                  <th className="hide-on-phone" style={{ padding: '0.9rem 1.25rem' }}>Visits (30 days)</th>
                  <th className="hide-on-phone" style={{ padding: '0.9rem 1.25rem' }}>Primary Factor</th>
                  <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Outreach</th>
                </tr>
              </thead>
              <tbody>
                {churn.highRiskMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No members at risk. All active memberships are in good standing or no members are registered yet.
                    </td>
                  </tr>
                ) : (
                  churn.highRiskMembers.map((m) => (
                    <tr key={m.memberId} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>
                        {m.memberName}
                      </td>
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem' }}>
                        <span className="badge badge-danger">High Risk</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#ef4444', fontWeight: 600 }}>
                        {m.daysSinceLastVisit} days
                      </td>
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#334155' }}>
                        {m.visitsLast30Days}
                      </td>
                      <td className="hide-on-phone" style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
                        {m.factors[0] || 'Prolonged attendance drop'}
                      </td>
                      <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleAiDraftMessage(m)}
                            className="btn btn-outline btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                            title="Generate personalized AI message"
                          >
                            <Sparkles size={12} style={{ color: '#a855f7' }} />
                            <span className="phone-icon-label">AI Draft</span>
                          </button>
                          <button
                            onClick={() => handleContactMember(m)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
                          >
                            {contactedMemberId === m.memberId ? 'Copied ✓' : 'Copy message'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        </ScrollReveal>
      )}

      {/* 5. Tab: Spending & Savings (spending checks + money-saving tips) */}
      {activeTab === 'leaks' && (
        <ScrollReveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* A. Clean, Compact Header Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #047857 100%)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '1.35rem 1.6rem',
                boxShadow: '0 4px 20px rgba(6, 78, 59, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0.65rem', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.18)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                  <PiggyBank size={13} style={{ color: '#a7f3d0' }} />
                  <span>Ways to Save</span>
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.25rem', color: '#ffffff' }}>
                  Save up to {currency}{leaks.potentialMonthlySavings.toLocaleString()} / month
                </h2>
                <p style={{ fontSize: '0.825rem', color: '#d1fae5', margin: 0, maxWidth: '580px', lineHeight: 1.45 }}>
                  {leaks.alertSummary}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={handleGenerateCostSavingPlan}
                  disabled={isCostSavingAiLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    backgroundColor: '#ffffff',
                    color: '#064e3b',
                    padding: '0.6rem 1.15rem',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    border: 'none',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
                    cursor: isCostSavingAiLoading ? 'wait' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Sparkles size={14} style={{ color: '#059669' }} />
                  <span>{isCostSavingAiLoading ? 'Analyzing...' : 'AI Action Plan'}</span>
                </button>
              </div>
            </div>

            {/* B. Spending checks: categories higher than the gym's usual months */}
            {leaks.anomalies.length === 0 ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '10px',
                  fontSize: '0.825rem',
                  color: '#166534',
                }}
              >
                <CheckCircle2 size={17} style={{ color: '#16a34a', flexShrink: 0 }} />
                <span>
                  {leaks.hasEnoughHistory ? (
                    <>
                      <strong>All {leaks.totalCategoriesAnalyzed} expense categories</strong> are in line with your usual months.
                    </>
                  ) : (
                    <>Spending checks start once you have 2 months of expenses recorded, so there&apos;s something to compare against.</>
                  )}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                  Higher Than Usual
                </h3>
                {leaks.anomalies.map((leak) => (
                  <div
                    key={leak.id}
                    className="card"
                    style={{
                      padding: '1rem 1.25rem',
                      borderLeft: leak.severity === 'critical' ? '4px solid #ef4444' : '4px solid #f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span className={leak.severity === 'critical' ? 'badge badge-danger' : 'badge badge-warning'}>
                          {leak.isOneOff ? 'ONE-TIME' : leak.severity === 'critical' ? 'MUCH HIGHER' : 'HIGHER'}
                        </span>
                        <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>{leak.category}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>
                          +{leak.percentageIncrease}% vs usual ({currency}{leak.historicalAverage.toLocaleString()})
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
                        {leak.detectionReason}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#0f172a', margin: '0.25rem 0 0', fontWeight: 500 }}>
                        Tip: {leak.suggestedAction}
                      </p>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ef4444' }}>
                        {currency}{leak.currentAmount.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                        {leak.isOneOff ? 'One-time purchase' : `+${currency}${leak.differenceAmount.toLocaleString()} over usual`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. Actionable Recommendations (Simplified Clean Grid) */}
            <div>
              <div style={{ marginBottom: '0.75rem' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                  Money-Saving Tips
                </h3>
                {leaks.savingOpportunities.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.35rem' }}>
                    Tips appear once you record utilities, supplies or maintenance expenses; savings are sized to what you actually spend.
                  </p>
                )}
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.85rem',
                }}
              >
                {leaks.savingOpportunities.map((item) => (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      padding: '1.1rem 1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div>
                      {/* Category & Savings Pill */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '5px',
                            backgroundColor:
                              item.category === 'Utilities'
                                ? '#fef3c7'
                                : item.category === 'Maintenance'
                                ? '#e0f2fe'
                                : item.category === 'Supplies'
                                ? '#ecfdf5'
                                : '#f1f5f9',
                            color:
                              item.category === 'Utilities'
                                ? '#92400e'
                                : item.category === 'Maintenance'
                                ? '#0369a1'
                                : item.category === 'Supplies'
                                ? '#065f46'
                                : '#475569',
                          }}
                        >
                          {item.category}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#059669',
                            backgroundColor: '#ecfdf5',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '5px',
                          }}
                        >
                          Save ~{currency}{item.estimatedMonthlySavings.toLocaleString()}/mo
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.925rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.35rem' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45, marginBottom: '0.65rem' }}>
                        {item.description}
                      </p>

                      {/* Bite-sized action items */}
                      <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.775rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {item.actionChecklist.map((task, idx) => (
                          <li key={idx} style={{ lineHeight: 1.35 }}>
                            {task}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      <style jsx>{`
        @media (max-width: 900px) {
          .ai-forecast-grid {
            grid-template-columns: 1fr !important;
            gap: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};
