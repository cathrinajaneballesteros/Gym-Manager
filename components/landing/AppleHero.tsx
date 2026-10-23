'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

// The last 6 months ending with this one, like the dashboard's Revenue vs Expenses chart.
const recentMonthLabels = (): string[] => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) =>
    new Date(now.getFullYear(), now.getMonth() - 5 + i, 1).toLocaleString('en-US', { month: 'short' })
  );
};

export const AppleHero: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [monthLabels, setMonthLabels] = useState(recentMonthLabels);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage and the URL are only readable in the browser
      setIsLoggedIn(sessionStorage.getItem('sgfm_authenticated') === 'true');
      // The page may have been built in an earlier month; use the visitor's own date.
      setMonthLabels(recentMonthLabels());
    }
  }, []);

  return (
    <section
      id="overview"
      style={{
        paddingTop: '140px',
        paddingBottom: '80px',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}
    >
      {/* Subtle Ambient Background Light Diffusion Fields */}
      <div
        style={{
          position: 'absolute',
          top: '60px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '500px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(5, 150, 105, 0.08) 0%, rgba(0, 113, 227, 0.04) 40%, rgba(245, 245, 247, 0) 75%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1120px' }}>
        {/* 1. Eyebrow Badge */}
        <ScrollReveal delay={0} direction="up" distance={16}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              marginBottom: '1.75rem',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#34c759',
                display: 'inline-block',
                boxShadow: '0 0 8px rgba(52, 199, 89, 0.6)',
              }}
            />
            <span
              style={{
                fontSize: '0.785rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: '#1d1d1f',
              }}
            >
              MONEY & MEMBERS FOR GYMS
            </span>
          </div>
        </ScrollReveal>

        {/* 2. Large Headline */}
        <ScrollReveal delay={50} direction="up" distance={20}>
          <h1
            style={{
              fontSize: 'clamp(2.1rem, 6.5vw, 4.75rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 1.08,
              color: '#1d1d1f',
              marginBottom: '1.5rem',
              maxWidth: '920px',
              margin: '0 auto 1.5rem',
            }}
          >
            Built for the way <br />
            <span style={{ color: '#059669' }}>modern gyms grow.</span>
          </h1>
        </ScrollReveal>

        {/* 3. Short Supporting Paragraph */}
        <ScrollReveal delay={100} direction="up" distance={20}>
          <p
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: '#636366',
              lineHeight: 1.6,
              maxWidth: '680px',
              margin: '0 auto 2.5rem',
              fontWeight: 400,
            }}
          >
            Track members, cash and GCash payments, expenses and check-ins in one place, and see which members need a reminder before they stop coming.
          </p>
        </ScrollReveal>

        {/* 4. Action CTAs */}
        <ScrollReveal delay={150} direction="up" distance={20}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}
          >
            <Link
              href={isLoggedIn ? '/dashboard' : '/login?mode=signup'}
              className="apple-btn-primary"
              style={{
                fontSize: '0.95rem',
                padding: '0.85rem 2.25rem',
                borderRadius: '9999px',
                fontWeight: 600,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>Launch App</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#86868b', marginBottom: '4rem' }}>
            Works on phone and desktop • Your data synced in the cloud
          </div>
        </ScrollReveal>

        {/* 5. Apple-Grade Product Mockup Presentation */}
        <ScrollReveal delay={200} direction="up" distance={30}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1020px',
              margin: '0 auto',
            }}
          >
            {/* Ambient Shadow Diffusion */}
            <div
              style={{
                position: 'absolute',
                inset: '20px',
                background: 'rgba(5, 150, 105, 0.1)',
                filter: 'blur(50px)',
                borderRadius: '32px',
                zIndex: 0,
              }}
            />

            {/* Hardware/Software Glass Window Frame */}
            <div
              style={{
                position: 'relative',
                zIndex: 1,
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.09)',
                borderRadius: '24px',
                boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
                textAlign: 'left',
              }}
            >
              {/* macOS Window Chrome Header */}
              <div
                style={{
                  height: '42px',
                  backgroundColor: 'rgba(245, 245, 247, 0.8)',
                  backdropFilter: 'blur(20px)',
                  borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 1.25rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#ff5f56', border: '0.5px solid #e0443e', display: 'inline-block' }} />
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#ffbd2e', border: '0.5px solid #dea123', display: 'inline-block' }} />
                  <span style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#27c93f', border: '0.5px solid #1aab29', display: 'inline-block' }} />
                </div>

                <div className="hero-window-title" style={{ fontSize: '0.75rem', color: '#86868b', fontWeight: 500, letterSpacing: '0.01em' }}>
                  Smart Gym • Dashboard
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759' }} />
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Synced</span>
                </div>
              </div>

              {/* Main Window Dashboard Body */}
              <div className="hero-window-body" style={{ padding: '1.75rem 2rem', backgroundColor: '#fafafc' }}>
                {/* 4 Metric Cards Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                  className="hero-mockup-kpis"
                >
                  {/* The same four cards as the real dashboard, in the same order and colours. */}
                  {[
                    { label: 'Total Revenue', value: '₱245,820', change: '↗ +12.5%', icon: TrendingUp, color: '#059669', valueColor: '#059669' },
                    { label: 'Total Expenses', value: '₱94,400', change: '↘ -3.1%', icon: Receipt, color: '#ef4444', valueColor: '#ef4444' },
                    { label: 'Net Profit', value: '+₱151,420', change: '↗ +18.2%', icon: CreditCard, color: '#059669', valueColor: '#059669' },
                    { label: 'Active Members', value: '328', change: '↗ +18 this mo', icon: Users, color: '#5856d6', valueColor: '#1d1d1f' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
                        className="hero-kpi-card"
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid rgba(0, 0, 0, 0.06)',
                          borderRadius: '16px',
                          padding: '1.15rem 1.25rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.785rem', color: '#86868b', fontWeight: 500 }}>{stat.label}</span>
                          <div style={{ width: '28px', height: '28px', borderRadius: '8px', backgroundColor: `${stat.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Icon size={14} color={stat.color} />
                          </div>
                        </div>
                        <div className="hero-kpi-value" style={{ fontSize: '1.45rem', fontWeight: 700, color: stat.valueColor, letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.25rem' }}>
                          {stat.value}
                        </div>
                        <span style={{ fontSize: '0.725rem', color: '#059669', fontWeight: 600 }}>{stat.change}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Split Interactive Chart & Intelligence Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.6fr 1fr',
                    gap: '1.25rem',
                  }}
                  className="hero-mockup-bottom"
                >
                  {/* Left: Financial Trajectory Graph Card */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: '18px',
                      padding: '1.35rem 1.5rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d1d1f' }}>
                          Revenue vs Expenses
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#86868b' }}>
                          Money in and out over the last 6 months
                        </div>
                      </div>

                      {/* Legend, same colours as the dashboard chart */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', fontSize: '0.725rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284c7' }} />
                          <span style={{ color: '#475569', fontWeight: 500 }}>Revenue</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
                          <span style={{ color: '#475569', fontWeight: 500 }}>Expenses</span>
                        </div>
                      </div>
                    </div>

                    {/* Simulated chart: revenue climbing over steady running costs */}
                    <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                      <svg viewBox="0 0 600 140" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="heroRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.15" />
                            <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                          </linearGradient>
                          <linearGradient id="heroExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.08" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[35, 70, 105].map((y) => (
                          <line key={y} x1="0" x2="600" y1={y} y2={y} stroke="#f1f5f9" strokeDasharray="3 3" />
                        ))}
                        <path
                          d="M0,85 C40,82 80,78 120,75 C160,72 200,70 240,68 C280,64 320,60 360,55 C400,50 440,46 480,42 C520,38 560,33 600,30 L600,140 L0,140 Z"
                          fill="url(#heroRevenueGradient)"
                        />
                        <path
                          d="M0,105 C40,104 80,103 120,103 C160,103 200,104 240,104 C280,103 320,101 360,100 C400,100 440,102 480,102 C520,101 560,100 600,99 L600,140 L0,140 Z"
                          fill="url(#heroExpenseGradient)"
                        />
                        <path
                          d="M0,105 C40,104 80,103 120,103 C160,103 200,104 240,104 C280,103 320,101 360,100 C400,100 440,102 480,102 C520,101 560,100 600,99"
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d="M0,85 C40,82 80,78 120,75 C160,72 200,70 240,68 C280,64 320,60 360,55 C400,50 440,46 480,42 C520,38 560,33 600,30"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="2.5"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                      {monthLabels.map((label, i) => (
                        <span key={label}>{i === monthLabels.length - 1 ? `${label} (so far)` : label}</span>
                      ))}
                    </div>
                  </div>

                  {/* Right: AI Sentinel Feed */}
                  <div
                    style={{
                      backgroundColor: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: '18px',
                      padding: '1.35rem 1.5rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem' }}>
                        <Sparkles size={15} color="#059669" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1d1d1f' }}>
                          Insights
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '2px' }}>
                            Renewals due
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#15803d' }}>
                            42 members due this week. Send them a reminder.
                          </div>
                        </div>

                        <div style={{ padding: '0.65rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: '2px' }}>
                            Spending alert
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#1d4ed8' }}>
                            Electricity is 28% higher than your usual months.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#636366', marginTop: '0.75rem' }}>
                      <CheckCircle2 size={13} color="#34c759" />
                      <span>All payments synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Glass Chip with Real Depth */}
            <div
              className="floating-glass-chip chip-right"
              style={{
                position: 'absolute',
                // Hangs off the bottom edge of the preview so it doesn't cover the cards.
                bottom: '-26px',
                right: '32px',
                zIndex: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '14px',
                padding: '0.75rem 1rem',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem',
              }}
            >
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={16} color="#0071e3" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d1d1f' }}>PDF & Excel</div>
                <div style={{ fontSize: '0.685rem', color: '#86868b' }}>Monthly reports</div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .hero-mockup-kpis {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .hero-mockup-bottom {
            grid-template-columns: 1fr !important;
          }
          .floating-glass-chip {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .hero-window-title {
            display: none;
          }
          .hero-window-body {
            padding: 1rem !important;
          }
          .hero-mockup-kpis {
            gap: 0.6rem !important;
          }
          .hero-kpi-card {
            padding: 0.8rem !important;
          }
          .hero-kpi-value {
            font-size: 1.1rem !important;
          }
        }
      `}</style>
    </section>
  );
};
