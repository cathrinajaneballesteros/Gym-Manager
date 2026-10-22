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
              BUILT-IN INSIGHTS
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
              Know what&apos;s coming.
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
              More than a spreadsheet. Smart Gym looks at your payments, check-ins and expenses and tells you what needs attention.
            </p>
          </ScrollReveal>

          {/* Apple Segmented Interactive Navigation Pills */}
          <ScrollReveal delay={80} direction="up">
            <div
              className="showcase-tabs"
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
                { id: 'forecast', label: 'Forecast' },
                { id: 'churn', label: 'At-risk members' },
                { id: 'leaks', label: 'Expense alerts' },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="showcase-tab"
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
                    Based on your past months
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Forecast the next three months of revenue.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    See slow months coming. Smart Gym uses your past payments, renewals and new sign-ups to estimate how much money comes in over the next three months.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Picks up busy and slow seasons</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Explains what each forecast is based on</span>
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
                      // Full height so each bar's percentage resolves against the 110px row (otherwise it renders 0px tall).
                      <div key={bar.month} style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '100%', height: `${bar.height}%`, flex: 'none', backgroundColor: bar.color, borderRadius: '6px' }} />
                        <span style={{ fontSize: '0.725rem', color: '#64748b' }}>{bar.month}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '0.725rem', color: '#86868b', marginTop: '0.75rem', textAlign: 'center' }}>
                    *May is a forecast based on the months before it
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
                    Check-ins & expiry dates
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Reach members before they quit.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Members usually stop showing up before they stop paying. Smart Gym flags people who haven&apos;t checked in lately or whose plan is about to end, so your staff can reach out in time.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>AI-written reminder message, ready to send</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>High or medium risk for each member</span>
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
                    Compared with your usual months
                  </div>
                  <h3 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.2, marginBottom: '1rem' }}>
                    Spot spending that&apos;s higher than usual.
                  </h3>
                  <p style={{ color: '#424245', fontSize: '1rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                    Power bills, repairs and supplies go up and down. Smart Gym compares each category with your usual months and warns you when one is more than 20% higher.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Compared with your own past spending</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.875rem', color: '#1d1d1f' }}>
                      <CheckCircle size={16} color="#059669" />
                      <span>Broken down by expense category</span>
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
                      Higher than usual
                    </span>
                  </div>

                  <div style={{ padding: '1rem', backgroundColor: '#fffbeb', borderRadius: '12px', border: '1px solid #fef3c7', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>Utilities & Power</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>₱38,400</span>
                    </div>
                    <div style={{ fontSize: '0.725rem', color: '#b45309' }}>
                      Usual: ₱24,000 (60% higher)
                    </div>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748b', lineHeight: 1.5 }}>
                    Tip: check the aircon timers and the shower water heaters.
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
          .showcase-tabs {
            display: flex !important;
            width: 100%;
          }
          .showcase-tab {
            flex: 1;
            padding: 0.55rem 0.5rem !important;
            font-size: 0.78rem !important;
          }
        }
      `}</style>
    </section>
  );
};
