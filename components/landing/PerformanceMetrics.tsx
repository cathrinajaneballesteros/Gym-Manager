'use client';

import React from 'react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const PerformanceMetrics: React.FC = () => {
  // What the app actually does, not measured results.
  const metrics = [
    {
      value: 'Cash + GCash',
      label: 'Payments Tracked',
      description: 'Record on-site cash and GCash payments, and check GCash receipts against their reference numbers.',
    },
    {
      value: '1 click',
      label: 'PDF & Excel Reports',
      description: 'Export income, expenses and profit for any month as a PDF report or an Excel workbook.',
    },
    {
      value: 'Early',
      label: 'Churn Alerts',
      description: 'Members who stop visiting or are close to expiring are flagged so staff can reach out in time.',
    },
    {
      value: 'Owner + Staff',
      label: 'Team Access',
      description: 'Owners see the finances; staff handle check-ins, members and payments.',
    },
  ];

  return (
    <section
      id="metrics"
      style={{
        padding: '72px 0',
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
                    fontSize: 'clamp(1.75rem, 3vw, 2.4rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: '#1d1d1f',
                    lineHeight: 1,
                    marginBottom: '0.6rem',
                    whiteSpace: 'nowrap',
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
