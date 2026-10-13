'use client';

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const InteractiveProductShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'churn' | 'leaks'>('forecast');

  return (
    <section
      id="intelligence"
      style={{
        padding: '100px 0',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Section Header with Apple Generous Whitespace */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <ScrollReveal delay={0} direction="up">
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: '#059669',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                marginBottom: '0.75rem',
                display: 'block',
              }}
            >
              PROPRIETARY MACHINE INTELLIGENCE
            </span>
            <h2
              style={{
                fontSize: 'clamp(2.25rem, 4.5vw, 3.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.03em',
                lineHeight: 1.15,
                color: '#1d1d1f',
                marginBottom: '1rem',
              }}
            >
              Three pillars of financial control.
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: '#636366',
                maxWidth: '620px',
                margin: '0 auto',
                lineHeight: 1.55,
              }}
            >
              Beyond basic spreadsheets and bookkeeping. SGFM continuously analyzes memberships, attendance telemetry, and recurring outlays.
            </p>
          </ScrollReveal>

          {/* Apple Segmented Interactive Navigation Pills */}
          <ScrollReveal delay={80} direction="up">
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '4px',
                borderRadius: '9999px',
                marginTop: '2.25rem',
                gap: '3px',
                maxWidth: '100%',
                overflowX: 'auto',
              }}
            >
              {([
                { id: 'forecast', label: '01 Predictive Cashflow' },
                { id: 'churn', label: '02 Churn Radar' },
                { id: 'leaks', label: '03 Expense Sentinel' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '0.55rem 1.35rem',
                    borderRadius: '9999px',
                    fontSize: '0.85rem',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    backgroundColor: activeTab === tab.id ? '#ffffff' : 'transparent',
                    color: activeTab === tab.id ? '#1d1d1f' : '#636366',
                    boxShadow: activeTab === tab.id ? '0 2px 8px rgba(0, 0, 0, 0.08)' : 'none',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* Dynamic Interactive Glass Panel Stage */}
        <ScrollReveal delay={120} direction="up">
          <div
            className="apple-glass-card showcase-panel"
            style={{
              padding: '2.5rem',
              backgroundColor: 'rgba(245, 245, 247, 0.65)',
              border: '1px solid rgba(0, 0, 0, 0.07)',
            }}
          >
            {activeTab === 'forecast' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
                className="showcase-grid"
              >
                <div>
                  <div style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', backgroundColor: '#ecfdf5', borderRadius: '8px', color: '#065f46', fontSize: '0.785rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Linear Regression with Seasonal Modifiers
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Forecast the next three months of revenue.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Never get surprised by seasonal gym dips. SGFM aggregates active plan expiries, new sign-up velocity, and historical retention curves to simulate your next 90 days of cash intake.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Accounting for January fitness surge & summer dips</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Automatic upper/lower confidence bound visualization</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Graphic Card */}
                <div
                  className="showcase-graphic"
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.75rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '0.8rem', color: '#86868b', fontWeight: 500, marginBottom: '0.25rem' }}>
                    Projected Revenue (Q3 2026)
                  </div>
                  <div style={{ fontSize: '2.25rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', marginBottom: '1.25rem' }}>
                    ₱298,750
                    <span style={{ fontSize: '0.9rem', color: '#059669', fontWeight: 600, marginLeft: '0.5rem' }}>+14.2%</span>
                  </div>

                  <div style={{ height: '110px', display: 'flex', alignItems: 'flex-end', gap: '1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>
                    {[
                      { month: 'Jan', height: 45, color: '#e2e8f0' },
                      { month: 'Feb', height: 55, color: '#cbd5e1' },
                      { month: 'Mar', height: 70, color: '#94a3b8' },
                      { month: 'Apr', height: 85, color: '#059669' },
                      { month: 'May*', height: 98, color: '#10b981' },
                    ].map((bar) => (
                      <div key={bar.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '100%', height: `${bar.height}%`, backgroundColor: bar.color, borderRadius: '6px' }} />
                        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{bar.month}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.725rem', color: '#86868b', marginTop: '0.75rem', textAlign: 'center' }}>
                    *May is projected using 120-day historical linear regression
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'churn' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
                className="showcase-grid"
              >
                <div>
                  <div style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', backgroundColor: '#fef2f2', borderRadius: '8px', color: '#991b1b', fontSize: '0.785rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Attendance Telemetry & Expiry Modeling
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Stop member drop-offs 14 days before they quit.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Members don&apos;t cancel on a whim—their check-in frequency decays first. SGFM flags unvisited passes and imminent contract expiries so your front desk can intervene immediately.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>One-click SMS/WhatsApp outreach triggers</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Individual risk score (High / Medium / Low)</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Churn Radar Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '1rem' }}>
                    At-Risk Members Flagged (Today)
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {[
                      { name: 'Marcus Vance', days: '16 days inactive', risk: 'High', color: '#ef4444' },
                      { name: 'Elena Rostova', days: '12 days inactive', risk: 'High', color: '#ef4444' },
                      { name: 'David Chen', days: 'Expires in 3 days', risk: 'Medium', color: '#f59e0b' },
                    ].map((m) => (
                      <div
                        key={m.name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.75rem',
                          backgroundColor: '#f8fafc',
                          borderRadius: '12px',
                          border: '1px solid #f1f5f9',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1d1d1f' }}>{m.name}</div>
                          <div style={{ fontSize: '0.725rem', color: '#64748b' }}>{m.days}</div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.725rem',
                            fontWeight: 600,
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            backgroundColor: `${m.color}15`,
                            color: m.color,
                          }}
                        >
                          {m.risk} Risk
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaks' && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 1fr',
                  gap: '3rem',
                  alignItems: 'center',
                }}
                className="showcase-grid"
              >
                <div>
                  <div style={{ display: 'inline-flex', padding: '0.35rem 0.75rem', backgroundColor: '#fffbeb', borderRadius: '8px', color: '#92400e', fontSize: '0.785rem', fontWeight: 600, marginBottom: '1rem' }}>
                    Category Standard Deviation Sentinel
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Catch utility surges and duplicate vendor outlays.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    HVAC repairs, equipment maintenance, and power bills fluctuate wildly. SGFM calculates dynamic statistical baselines and warns you when a category spikes by more than 20%.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Historical moving-average baseline comparisons</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Categorical breakdown by equipment, staff, rent, and power</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Leak Detection Card */}
                <div
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: '1.5rem',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                    <AlertTriangle size={16} color="#f59e0b" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d1d1f' }}>
                      Unusual Spending Anomaly
                    </span>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>Utilities & Power</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>₱38,400</span>
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#b45309' }}>
                      Baseline: ₱24,000 (+60.0% variance detected)
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                    Recommendation: Verify sub-meter on shower water heaters or AC unit timer in main workout floor.
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollReveal>
      </div>

      <style jsx>{`
        @media (max-width: 860px) {
          .showcase-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }
        }
        @media (max-width: 640px) {
          .showcase-panel {
            padding: 1.25rem !important;
          }
          .showcase-graphic {
            padding: 1.1rem !important;
          }
        }
      `}</style>
    </section>
  );
};
