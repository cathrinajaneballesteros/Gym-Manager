'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  UserX,
  PhoneCall,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  Send,
  PiggyBank,
  Zap,
  CheckCircle2,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { calculateRevenueForecast } from '@/lib/ai/forecasting';
import { predictMemberChurn } from '@/lib/ai/churn-detector';
import { detectExpenseLeaks } from '@/lib/ai/leak-detector';
import { RevenueForecastResult, ChurnPredictionResult, ExpenseLeakResult, CostSavingPlaybook } from '@/types/ai';
import { DBService } from '@/lib/data/db-service';
import { UserProfile } from '@/types/database';
import { showAlert, showToast, showError } from '@/lib/ui/swal';
import { escapeHtml } from '@/lib/ui/escape';
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
  const [checkedPlaybookTasks, setCheckedPlaybookTasks] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setProfile(DBService.getProfile());
    setForecast(calculateRevenueForecast(false));
    setChurn(predictMemberChurn());
    setLeaks(detectExpenseLeaks());
  }, []);

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
          gymName: profile?.gym_name || 'IronPeak Fitness & Gym',
          currency,
          totalRevenue: kpis.totalRevenue,
          totalExpenses: kpis.totalExpenses,
          netProfit: kpis.netProfit,
          profitMargin: kpis.profitMargin,
          activeMembers: kpis.activeMembers,
          churnRiskCount: churn?.highRiskCount || 0,
          topExpenseCategory: topCat,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate AI executive brief');
      }

      const formattedHtml = escapeHtml(data.report)
        .replace(/### (.*?)\n/g, '<h4 style="font-weight:700; color:#0f172a; margin-top:1rem; margin-bottom:0.4rem; font-size:1rem;">$1</h4>')
        .replace(/#### (.*?)\n/g, '<h5 style="font-weight:600; color:#334155; margin-top:0.75rem; margin-bottom:0.25rem; font-size:0.9rem;">$1</h5>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*?)\n/g, '<li style="margin-bottom:0.35rem; color:#475569;">$1</li>')
        .replace(/\n\n/g, '<br/>');

      showAlert({
        icon: 'success',
        title: 'Executive AI Brief (Gemini)',
        html: `
          <div style="text-align: left; font-size: 0.875rem; line-height: 1.6; max-height: 60vh; overflow-y: auto; padding: 0.5rem 0.25rem;">
            ${formattedHtml}
          </div>
        `,
        confirmButtonText: 'Done',
        confirmButtonColor: '#6366f1',
      });
    } catch (err: any) {
      showError('AI Generation Notice', err.message || 'Unable to generate brief at this time.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiDraftMessage = async (member: any) => {
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
          gymName: profile?.gym_name || 'IronPeak Fitness',
        }),
      });
      const data = await res.json();
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
    } catch (err: any) {
      handleContactMember(member.memberId);
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
          gymName: profile?.gym_name || 'Fitness Center',
          currency,
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate cost-saving action plan');
      }

      const formattedHtml = escapeHtml(data.report)
        .replace(/### (.*?)\n/g, '<h4 style="font-weight:700; color:#0f172a; margin-top:1rem; margin-bottom:0.4rem; font-size:1rem;">$1</h4>')
        .replace(/#### (.*?)\n/g, '<h5 style="font-weight:600; color:#334155; margin-top:0.75rem; margin-bottom:0.25rem; font-size:0.9rem;">$1</h5>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* (.*?)\n/g, '<li style="margin-bottom:0.35rem; color:#475569;">$1</li>')
        .replace(/\n\n/g, '<br/>');

      showAlert({
        icon: 'success',
        title: 'Gemini Cost-Cutting Roadmap',
        html: `
          <div style="text-align: left; font-size: 0.875rem; line-height: 1.6; max-height: 60vh; overflow-y: auto; padding: 0.5rem 0.25rem;">
            ${formattedHtml}
          </div>
        `,
        confirmButtonText: 'Adopt Plan',
        confirmButtonColor: '#059669',
      });
    } catch (err: any) {
      showError('AI Optimization Notice', err.message || 'Unable to generate cost-saving plan at this time.');
    } finally {
      setIsCostSavingAiLoading(false);
    }
  };

  const togglePlaybookTask = (taskId: string) => {
    setCheckedPlaybookTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  if (!forecast || !churn || !leaks) return null;

  const currency = profile?.currency || '₱';

  // Chart data blending historical and projected
  const chartData =
    forecast.trendSeries && forecast.trendSeries.length > 0
      ? forecast.trendSeries.map((pt) => ({
          month: pt.period,
          historical: pt.isForecast ? null : pt.projectedRevenue,
          forecast: pt.isForecast ? pt.projectedRevenue : null,
        }))
      : [
          { month: 'Apr', historical: 0, forecast: null },
          { month: 'May', historical: 0, forecast: null },
          { month: 'Jun', historical: 0, forecast: null },
          { month: 'Jul', historical: 0, forecast: 0 },
          { month: 'Aug', historical: null, forecast: 0 },
          { month: 'Sep', historical: null, forecast: 0 },
        ];

  const handleContactMember = (memberId: string) => {
    setContactedMemberId(memberId);
    showToast('Message copied to clipboard!');
    setTimeout(() => setContactedMemberId(null), 3000);
  };

  const handleViewForecastDetails = () => {
    if (!forecast.hasSufficientData) {
      showAlert({
        icon: 'info',
        title: 'AI Revenue Forecast Model',
        html: `
          <div style="text-align: left; font-size: 0.9rem; color: #475569; line-height: 1.6;">
            <div style="margin-bottom: 0.85rem; padding: 0.5rem 0.75rem; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; color: #92400e; font-weight: 600; font-size: 0.85rem;">
              ⚠️ Status: Awaiting Historical Records
            </div>
            <p style="margin-bottom: 0.75rem; color: #1e293b;">
              The AI forecasting engine utilizes linear regression and moving average modeling calculated from real member payments and renewal cycles.
            </p>
            <p style="margin-bottom: 0.75rem;">
              Since this system is running with zero initial data, no payment transactions have been logged yet to train the projection model.
            </p>
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.85rem; color: #334155;">
              💡 <strong>Next Step:</strong> Register gym members in the <em>Members</em> tab and record their subscription payments. Once payments are recorded, forward projections and confidence intervals will calculate automatically.
            </div>
          </div>
        `,
        confirmButtonText: 'Understood',
        confirmButtonColor: '#059669',
      });
      return;
    }

    const forecastPoints = forecast.trendSeries.filter((p) => p.isForecast);
    const minBound =
      forecastPoints.length > 0
        ? Math.min(...forecastPoints.map((p) => p.lowerConfidence))
        : Math.round(forecast.forecastedNextMonthRevenue * 0.9);
    const maxBound =
      forecastPoints.length > 0
        ? Math.max(...forecastPoints.map((p) => p.upperConfidence))
        : Math.round(forecast.forecastedNextMonthRevenue * 1.1);

    const formatVal = (val: number) => {
      if (val >= 1000) return `${currency}${(val / 1000).toFixed(0)}k`;
      return `${currency}${val.toLocaleString()}`;
    };

    showAlert({
      icon: 'info',
      title: 'AI Revenue Forecast Model',
      html: `
        <div style="text-align: left; font-size: 0.9rem; color: #475569; line-height: 1.6;">
          <div style="margin-bottom: 0.85rem; padding: 0.5rem 0.75rem; background-color: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; color: #065f46; font-weight: 600; font-size: 0.85rem;">
            ✓ Active Model • ${forecast.confidenceScore}% Confidence Level
          </div>
          <p style="margin-bottom: 0.6rem; color: #1e293b;">
            <strong>3-Month Projection:</strong> Based on linear regression trend across ${forecast.dataPointsCount} recorded period(s).
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
        <div style={{ display: 'inline-flex', backgroundColor: 'rgba(118, 118, 128, 0.12)', padding: '3px', borderRadius: '10px', gap: '2px', width: 'fit-content' }}>
          {[
            { key: 'forecast', label: 'Revenue Forecast' },
            { key: 'churn', label: 'Churn Prediction' },
            {
              key: 'leaks',
              label: `Cost Optimization & Leaks ${
                leaks.potentialMonthlySavings > 0
                  ? `(Save ${currency}${(leaks.potentialMonthlySavings / 1000).toFixed(0)}k/mo)`
                  : ''
              }`,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              style={{
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
              Based on historical data, memberships, and seasonal trends
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
                  Next 3 months
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
                  <span style={{ color: '#475569', fontWeight: 500 }}>Historical</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ width: '16px', height: '2px', borderTop: '2px dashed #0284c7' }} />
                  <span style={{ color: '#475569', fontWeight: 500 }}>Forecast</span>
                </div>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={{ stroke: '#f1f5f9' }} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `${currency}${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    formatter={(val: any) => [`${currency}${Number(val).toLocaleString()}`, '']}
                  />
                  <Line type="monotone" dataKey="historical" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: '#0284c7' }} />
                  <Line type="monotone" dataKey="forecast" stroke="#0284c7" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4, fill: '#ffffff', stroke: '#0284c7', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
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
                    Model weights and growth factors will calibrate once members and payments are recorded.
                  </p>
                </div>
              ) : (
                [
                  { factor: 'Renewal retention', impact: `${Math.round(forecast.confidenceScore * 0.9)}%` },
                  { factor: 'Growth trajectory', impact: `${forecast.projectedGrowthPercent >= 0 ? '+' : ''}${forecast.projectedGrowthPercent}%` },
                  { factor: 'Predicted new signups', impact: `+${forecast.predictedNewMembers}` },
                  { factor: 'Expected renewals', impact: `${forecast.expectedRenewals}` },
                ].map((item) => (
                  <div key={item.factor} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#64748b' }}>{item.factor}</span>
                    <span style={{ fontWeight: 600, color: '#059669' }}>{item.impact}</span>
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
              Members Requiring Retention Attention
            </h2>
            <p style={{ fontSize: '0.825rem', color: '#64748b', marginTop: '2px' }}>
              Identified by inactivity frequency, visit gaps, and imminent expiration dates
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f1f5f9', color: '#64748b', fontSize: '0.785rem', fontWeight: 600, textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.9rem 1.5rem' }}>Member</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Risk Level</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Days Inactive</th>
                  <th style={{ padding: '0.9rem 1.25rem' }}>Primary Factor</th>
                  <th style={{ padding: '0.9rem 1.5rem', textAlign: 'right' }}>Outreach</th>
                </tr>
              </thead>
              <tbody>
                {churn.highRiskMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '3rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                      No members at risk. All active memberships are in good standing or no members are registered yet.
                    </td>
                  </tr>
                ) : (
                  churn.highRiskMembers.map((m) => (
                    <tr key={m.memberId} style={{ borderBottom: '1px solid #f8fafc' }}>
                      <td style={{ padding: '1rem 1.5rem', fontWeight: 600, color: '#0f172a' }}>
                        {m.memberName}
                      </td>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span className="badge badge-danger">High Risk</span>
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#ef4444', fontWeight: 600 }}>
                        {m.daysSinceLastVisit} days
                      </td>
                      <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>
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
                            <span>AI Draft</span>
                          </button>
                          <button
                            onClick={() => handleContactMember(m.memberId)}
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

      {/* 5. Tab: Cost Optimization & Leaks */}
      {activeTab === 'leaks' && (
        <ScrollReveal delay={70}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* A. Money-Saving Action Center Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
                color: '#ffffff',
                borderRadius: '14px',
                padding: '1.75rem',
                boxShadow: '0 8px 24px rgba(6, 78, 59, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.5rem',
              }}
            >
              <div style={{ maxWidth: '640px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.75rem', borderRadius: '999px', backgroundColor: 'rgba(255, 255, 255, 0.18)', backdropFilter: 'blur(8px)', fontSize: '0.785rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                  <PiggyBank size={14} style={{ color: '#6ee7b7' }} />
                  <span>AI Profit Maximizer & Cost Control</span>
                </div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '0.4rem', color: '#ffffff' }}>
                  Potential Savings: {currency}{leaks.potentialMonthlySavings.toLocaleString()}/mo
                </h2>
                <p style={{ fontSize: '0.875rem', color: '#d1fae5', lineHeight: 1.5 }}>
                  {leaks.alertSummary}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', fontSize: '0.825rem' }}>
                  <div>
                    <span style={{ color: '#a7f3d0', display: 'block', fontSize: '0.75rem' }}>Annualized Profit Boost</span>
                    <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>{currency}{leaks.potentialAnnualSavings.toLocaleString()}/yr</strong>
                  </div>
                  <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  <div>
                    <span style={{ color: '#a7f3d0', display: 'block', fontSize: '0.75rem' }}>Anomalies Flagged</span>
                    <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>{leaks.anomalies.length} Categories</strong>
                  </div>
                  <div style={{ width: '1px', height: '24px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                  <div>
                    <span style={{ color: '#a7f3d0', display: 'block', fontSize: '0.75rem' }}>Categories Monitored</span>
                    <strong style={{ fontSize: '1.15rem', color: '#ffffff' }}>{leaks.totalCategoriesAnalyzed} Expense Types</strong>
                  </div>
                </div>
              </div>

              <div>
                <button
                  onClick={handleGenerateCostSavingPlan}
                  disabled={isCostSavingAiLoading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#ffffff',
                    color: '#064e3b',
                    padding: '0.75rem 1.4rem',
                    borderRadius: '10px',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                    cursor: isCostSavingAiLoading ? 'wait' : 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <Sparkles size={16} style={{ color: '#059669' }} />
                  <span>{isCostSavingAiLoading ? 'Generating Plan...' : 'Generate Gemini Cost-Cutting Plan'}</span>
                </button>
              </div>
            </div>

            {/* B. Actionable Cost-Saving Playbooks */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Interactive Cost-Saving Playbooks
                  </h3>
                  <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                    Actionable operational playbooks to help gym owners reduce recurring expenses and prevent revenue leaks.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                  gap: '1rem',
                }}
              >
                {leaks.savingOpportunities.map((playbook) => {
                  const completedCount = playbook.actionChecklist.filter(
                    (_, idx) => checkedPlaybookTasks[`${playbook.id}-${idx}`]
                  ).length;
                  const totalCount = playbook.actionChecklist.length;
                  const isAllDone = completedCount === totalCount;

                  return (
                    <div
                      key={playbook.id}
                      className="card"
                      style={{
                        padding: '1.35rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        border: isAllDone ? '1px solid #10b981' : '1px solid #e2e8f0',
                        backgroundColor: isAllDone ? '#f0fdf4' : '#ffffff',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div>
                        {/* Playbook Tags & Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.55rem',
                              borderRadius: '6px',
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                            }}
                          >
                            {playbook.category}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.5rem',
                                borderRadius: '6px',
                                backgroundColor: playbook.difficulty === 'Easy' ? '#ecfdf5' : '#fef3c7',
                                color: playbook.difficulty === 'Easy' ? '#047857' : '#b45309',
                              }}
                            >
                              {playbook.difficulty}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              ⏱ {playbook.timeline}
                            </span>
                          </div>
                        </div>

                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.4rem' }}>
                          {playbook.title}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.45, marginBottom: '0.85rem' }}>
                          {playbook.description}
                        </p>

                        {/* Financial Return Callout */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: '#f8fafc',
                            padding: '0.6rem 0.85rem',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            marginBottom: '1rem',
                            fontSize: '0.8rem',
                          }}
                        >
                          <div>
                            <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block' }}>Monthly Savings</span>
                            <strong style={{ color: '#059669', fontSize: '0.95rem' }}>+{currency}{playbook.estimatedMonthlySavings.toLocaleString()}/mo</strong>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ color: '#64748b', fontSize: '0.725rem', display: 'block' }}>Annualized ROI</span>
                            <strong style={{ color: '#0284c7', fontSize: '0.95rem' }}>+{currency}{playbook.estimatedAnnualSavings.toLocaleString()}/yr</strong>
                          </div>
                        </div>

                        {/* Interactive Checklist */}
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Implementation Checklist
                            </span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: isAllDone ? '#059669' : '#64748b' }}>
                              {completedCount}/{totalCount} Done
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            {playbook.actionChecklist.map((task, idx) => {
                              const taskId = `${playbook.id}-${idx}`;
                              const isChecked = Boolean(checkedPlaybookTasks[taskId]);

                              return (
                                <label
                                  key={idx}
                                  onClick={() => togglePlaybookTask(taskId)}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: '0.5rem',
                                    fontSize: '0.785rem',
                                    lineHeight: 1.35,
                                    color: isChecked ? '#94a3b8' : '#334155',
                                    textDecoration: isChecked ? 'line-through' : 'none',
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    padding: '0.25rem 0',
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {}} // Controlled via label click
                                    style={{
                                      marginTop: '2px',
                                      accentColor: '#059669',
                                      cursor: 'pointer',
                                    }}
                                  />
                                  <span>{task}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* C. Detected Expense Anomalies & Overages */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Spending Leaks & Historical Anomalies
                </h3>
                <p style={{ fontSize: '0.825rem', color: '#64748b' }}>
                  Categories where active month expenditures exceed historical baselines by 20% or more.
                </p>
              </div>

              {leaks.anomalies.length === 0 ? (
                <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem' }}>
                    <CheckCircle2 size={24} />
                  </div>
                  <p style={{ fontWeight: 600, color: '#334155', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                    Zero Spending Leaks Detected
                  </p>
                  <p style={{ fontSize: '0.825rem', color: '#64748b', maxWidth: '460px', margin: '0 auto' }}>
                    All operating expense categories are tracking cleanly within their multi-month averages. Execute the playbooks above to unlock additional baseline profit.
                  </p>
                </div>
              ) : (
                leaks.anomalies.map((leak) => (
                  <div key={leak.id} className="card" style={{ padding: '1.5rem', borderLeft: leak.severity === 'critical' ? '4px solid #ef4444' : '4px solid #f59e0b' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ maxWidth: '720px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span className={leak.severity === 'critical' ? 'badge badge-danger' : 'badge badge-warning'}>
                            {leak.severity.toUpperCase()} LEAK
                          </span>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>
                            Category: {leak.category}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>
                            +{leak.percentageIncrease}% vs Baseline
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.35rem' }}>
                          {leak.category} Surge Detected
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5, marginBottom: '0.6rem' }}>
                          {leak.detectionReason}
                        </p>
                        <div style={{ backgroundColor: '#f8fafc', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155' }}>
                          <strong style={{ color: '#0f172a' }}>Recommended Action:</strong> {leak.suggestedAction}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Active Outlay</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
                          {currency}{leak.currentAmount.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.785rem', color: '#64748b', marginTop: '2px' }}>
                          Baseline: {currency}{leak.historicalAverage.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.785rem', color: '#059669', fontWeight: 600, marginTop: '4px' }}>
                          Recoverable: {currency}{leak.differenceAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
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
