'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Activity,
  Zap,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const AppleHero: React.FC = () => {
  const [activeView, setActiveView] = useState<'revenue' | 'expenses'>('revenue');

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
              FINANCIAL INTELLIGENCE FOR FITNESS CENTERS
            </span>
          </div>
        </ScrollReveal>

        {/* 2. Large Headline */}
        <ScrollReveal delay={50} direction="up" distance={20}>
          <h1
            style={{
              fontSize: 'clamp(2.75rem, 6.5vw, 4.75rem)',
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
            The financial operating system engineered for athletic clubs and gym franchises. Real-time cashflow intelligence, predictive churn defense, and automated reconciliation in one calm, unified interface.
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
            <Link href="/login" className="apple-btn-emerald">
              <span>Start Free 14-Day Pilot</span>
              <ArrowRight size={16} />
            </Link>

            <Link href="/login" className="apple-btn-secondary">
              <span>Explore Interactive Demo</span>
              <ChevronRight size={16} color="#86868b" />
            </Link>
          </div>

          <div style={{ fontSize: '0.8rem', color: '#86868b', marginBottom: '4rem' }}>
            No credit card required • Instant setup with sample club data
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

                <div style={{ fontSize: '0.75rem', color: '#86868b', fontWeight: 500, letterSpacing: '0.01em' }}>
                  Smart Gym Finance Manager • Live Executive View
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759' }} />
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>Sync Active</span>
                </div>
              </div>

              {/* Main Window Dashboard Body */}
              <div style={{ padding: '1.75rem 2rem', backgroundColor: '#fafafc' }}>
                {/* 4 Metric Cards Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '1rem',
                    marginBottom: '1.5rem',
                  }}
                  className="hero-mockup-kpis"
                >
                  {[
                    { label: 'Total Revenue', value: '₱245,820', change: '+12.5%', icon: DollarSign, color: '#059669' },
                    { label: 'Active Members', value: '328', change: '+18 this mo', icon: Users, color: '#0071e3' },
                    { label: 'Net Profit Margin', value: '61.6%', change: '+3.4%', icon: TrendingUp, color: '#5856d6' },
                    { label: 'Churn Risk Radar', value: '2.4%', change: 'Lowest ever', icon: ShieldCheck, color: '#34c759' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={stat.label}
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
                        <div style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: '0.25rem' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1d1d1f' }}>
                          Cashflow Trajectory & AI Projections
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#86868b' }}>
                          Historical performance blended with predictive linear models
                        </div>
                      </div>

                      {/* Interactive Segmented Pill Switcher */}
                      <div
                        style={{
                          display: 'inline-flex',
                          backgroundColor: 'rgba(0, 0, 0, 0.05)',
                          padding: '2px',
                          borderRadius: '8px',
                        }}
                      >
                        <button
                          onClick={() => setActiveView('revenue')}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: activeView === 'revenue' ? 600 : 500,
                            backgroundColor: activeView === 'revenue' ? '#ffffff' : 'transparent',
                            color: activeView === 'revenue' ? '#1d1d1f' : '#86868b',
                            boxShadow: activeView === 'revenue' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Revenue
                        </button>
                        <button
                          onClick={() => setActiveView('expenses')}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            fontSize: '0.725rem',
                            fontWeight: activeView === 'expenses' ? 600 : 500,
                            backgroundColor: activeView === 'expenses' ? '#ffffff' : 'transparent',
                            color: activeView === 'expenses' ? '#1d1d1f' : '#86868b',
                            boxShadow: activeView === 'expenses' ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Outlays
                        </button>
                      </div>
                    </div>

                    {/* Simulated Clean Vector Curve */}
                    <div style={{ height: '140px', width: '100%', position: 'relative' }}>
                      <svg viewBox="0 0 600 140" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.2" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path
                          d={
                            activeView === 'revenue'
                              ? 'M0,110 C80,95 160,80 240,65 C320,50 400,35 480,25 C540,18 600,10 600,10 L600,140 L0,140 Z'
                              : 'M0,120 C80,110 160,115 240,95 C320,100 400,85 480,80 C540,75 600,70 600,70 L600,140 L0,140 Z'
                          }
                          fill="url(#heroGradient)"
                          style={{ transition: 'd 0.4s ease' }}
                        />
                        <path
                          d={
                            activeView === 'revenue'
                              ? 'M0,110 C80,95 160,80 240,65 C320,50 400,35 480,25 C540,18 600,10'
                              : 'M0,120 C80,110 160,115 240,95 C320,100 400,85 480,80 C540,75 600,70'
                          }
                          fill="none"
                          stroke={activeView === 'revenue' ? '#059669' : '#0284c7'}
                          strokeWidth="3"
                          style={{ transition: 'all 0.4s ease' }}
                        />
                        {/* Projected Dotted Extension */}
                        <circle cx="480" cy={activeView === 'revenue' ? 25 : 80} r="4.5" fill="#059669" />
                      </svg>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.725rem', color: '#86868b', marginTop: '0.5rem' }}>
                      <span>Jan</span>
                      <span>Feb</span>
                      <span>Mar</span>
                      <span>Apr (Current)</span>
                      <span style={{ color: '#059669', fontWeight: 600 }}>May (AI Forecast)</span>
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
                          Neural Insights
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ padding: '0.65rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #dcfce7' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#166534', marginBottom: '2px' }}>
                            Renewal Acceleration
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#15803d' }}>
                            42 members due this week. Automated SMS reminder queued.
                          </div>
                        </div>

                        <div style={{ padding: '0.65rem', backgroundColor: '#eff6ff', borderRadius: '10px', border: '1px solid #dbeafe' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#1e40af', marginBottom: '2px' }}>
                            Utility Leak Detected
                          </div>
                          <div style={{ fontSize: '0.725rem', color: '#1d4ed8' }}>
                            Electricity surge 18% higher than historical baseline.
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.75rem', color: '#636366', marginTop: '0.75rem' }}>
                      <CheckCircle2 size={13} color="#34c759" />
                      <span>Ledger synchronized with Supabase</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Glass Chips with Real Depth */}
            <div
              className="floating-glass-chip chip-left"
              style={{
                position: 'absolute',
                top: '25%',
                left: '-28px',
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
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Zap size={16} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d1d1f' }}>98.4% Accuracy</div>
                <div style={{ fontSize: '0.685rem', color: '#86868b' }}>Linear regression model</div>
              </div>
            </div>

            <div
              className="floating-glass-chip chip-right"
              style={{
                position: 'absolute',
                bottom: '12%',
                right: '-28px',
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
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d1d1f' }}>Instant PDF / Excel</div>
                <div style={{ fontSize: '0.685rem', color: '#86868b' }}>Board-ready financial audits</div>
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
      `}</style>
    </section>
  );
};
