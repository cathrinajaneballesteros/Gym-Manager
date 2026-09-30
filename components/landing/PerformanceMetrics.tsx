'use client';

import React from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const PerformanceMetrics: React.FC = () => {
  const metrics = [
    {
      value: '98.4%',
      label: 'Predictive Precision',
      description: 'Historical quarterly revenue forecasts match actual ledger receipts within 1.6% margin.',
    },
    {
      value: '3.2x',
      label: 'Faster Closing',
      description: 'Automated multi-method payment verification reduces month-end bookkeeping from days to hours.',
    },
    {
      value: '42%',
      label: 'Churn Reduction',
      description: 'Early inactivity alerts enable front-desk staff to re-engage members before contracts lapse.',
    },
    {
      value: '₱0',
      label: 'Hidden Leakage',
      description: 'Category standard-deviation monitoring instantly highlights utility surges and duplicate vendor drafts.',
    },
  ];

  return (
    <section
      id="metrics"
      style={{
        padding: '120px 0',
        backgroundColor: '#ffffff',
        borderTop: '1px solid rgba(0, 0, 0, 0.05)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
      }}
    >
      <div className="container" style={{ maxWidth: '1120px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '3rem',
          }}
          className="metrics-grid"
        >
          {metrics.map((m, index) => (
            <ScrollReveal key={m.label} delay={index * 50} direction="up" distance={20}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div
                  style={{
                    fontSize: 'clamp(2.75rem, 5vw, 4rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: '#1d1d1f',
                    lineHeight: 1,
                    marginBottom: '0.75rem',
                  }}
                >
                  {m.value}
                </div>
                <div
                  style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#1d1d1f',
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {m.label}
                </div>
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: '#636366',
                    lineHeight: 1.55,
                    fontWeight: 400,
                  }}
                >
                  {m.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2.5rem !important;
          }
        }
        @media (max-width: 540px) {
          .metrics-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
