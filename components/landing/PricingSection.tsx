'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ArrowRight } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const PricingSection: React.FC = () => {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: 'Starter Club',
      tagline: 'Ideal for independent gyms and boutique fitness studios.',
      monthlyPrice: '₱1,890',
      annualPrice: '₱1,490',
      popular: false,
      features: [
        'Up to 300 active members',
        'Payment ledger (GCash / Cash)',
        'Expense tracker & category breakdown',
        'Basic revenue trends & analytics',
        'Executive PDF report exports',
        '1 Administrator account',
      ],
      cta: 'Create Account',
    },
    {
      name: 'Professional',
      tagline: 'For high-volume athletic facilities requiring automated intelligence.',
      monthlyPrice: '₱3,490',
      annualPrice: '₱2,790',
      popular: true,
      features: [
        'Unlimited active members',
        'AI Predictive Cashflow Engine (90-day forecast)',
        'Member Churn Early Warning Radar',
        'Categorical Expense Leak Sentinel',
        'Audited Excel & PDF financial workbooks',
        'Up to 5 staff accounts with permission roles',
        'Priority 24/7 technical concierge',
      ],
      cta: 'Create Account',
    },
    {
      name: 'Enterprise Franchise',
      tagline: 'Multi-branch fitness networks and commercial gym chains.',
      monthlyPrice: '₱6,890',
      annualPrice: '₱5,490',
      popular: false,
      features: [
        'Multi-club consolidated dashboard',
        'Custom linear regression weighting models',
        'Cross-branch member roaming synchronization',
        'Dedicated database instance with Supabase',
        'Custom ERP / POS integration support',
        'Unlimited administrator & cashier seats',
        'Custom Service Level Agreement (SLA)',
      ],
      cta: 'Create Account',
    },
  ];

  return (
    <section
      id="pricing"
      style={{
        padding: '120px 0',
        backgroundColor: '#f5f5f7',
        position: 'relative',
      }}
    >
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Header */}
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
              TRANSPARENT VALUE
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
              Simple, predictable investment.
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: '#636366',
                maxWidth: '560px',
                margin: '0 auto 2rem',
                lineHeight: 1.55,
              }}
            >
              Every plan includes a 14-day risk-free trial. Upgrade, downgrade, or cancel anytime with zero lock-in contracts.
            </p>

            {/* Apple Billing Interval Toggle */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                padding: '3px',
                borderRadius: '9999px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setAnnual(false)}
                style={{
                  padding: '0.45rem 1.15rem',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: !annual ? 600 : 500,
                  backgroundColor: !annual ? '#ffffff' : 'transparent',
                  color: !annual ? '#1d1d1f' : '#86868b',
                  boxShadow: !annual ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Monthly Billing
              </button>
              <button
                onClick={() => setAnnual(true)}
                style={{
                  padding: '0.45rem 1.15rem',
                  borderRadius: '9999px',
                  fontSize: '0.825rem',
                  fontWeight: annual ? 600 : 500,
                  backgroundColor: annual ? '#ffffff' : 'transparent',
                  color: annual ? '#1d1d1f' : '#86868b',
                  boxShadow: annual ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Annual Billing</span>
                <span
                  style={{
                    backgroundColor: '#ecfdf5',
                    color: '#065f46',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                  }}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </ScrollReveal>
        </div>

        {/* 3 Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1.5rem',
            alignItems: 'stretch',
          }}
          className="pricing-grid"
        >
          {plans.map((p, index) => (
            <ScrollReveal key={p.name} delay={index * 60} direction="up" distance={20} style={{ height: '100%' }}>
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: p.popular ? '2px solid #059669' : '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: '24px',
                  padding: '2.5rem 2rem',
                  boxShadow: p.popular
                    ? '0 20px 45px -12px rgba(5, 150, 105, 0.15), 0 2px 6px rgba(0, 0, 0, 0.04)'
                    : '0 4px 18px -2px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '100%',
                  position: 'relative',
                }}
              >
                {p.popular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '-12px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: '#059669',
                      color: '#ffffff',
                      fontSize: '0.725rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      padding: '3px 12px',
                      borderRadius: '9999px',
                      boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                    }}
                  >
                    Recommended Choice
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1d1d1f', marginBottom: '0.35rem' }}>
                    {p.name}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#636366', minHeight: '40px', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                    {p.tagline}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#1d1d1f', letterSpacing: '-0.03em', lineHeight: 1 }}>
                      {annual ? p.annualPrice : p.monthlyPrice}
                    </span>
                    <span style={{ fontSize: '0.875rem', color: '#86868b' }}>/ month</span>
                  </div>

                  {/* Feature Checklist */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginBottom: '2.5rem' }}>
                    {p.features.map((feat) => (
                      <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
                        <div style={{ width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                          <Check size={11} color="#059669" strokeWidth={3} />
                        </div>
                        <span style={{ fontSize: '0.85rem', color: '#424245', lineHeight: 1.4 }}>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link
                  href="/login"
                  className={p.popular ? 'apple-btn-emerald' : 'apple-btn-secondary'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                  }}
                >
                  <span>{p.cta}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 960px) {
          .pricing-grid {
            grid-template-columns: 1fr !important;
            max-width: 480px;
            margin: 0 auto;
          }
        }
      `}</style>
    </section>
  );
};
