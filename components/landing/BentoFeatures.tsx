'use client';

import React from 'react';
import {
  FileText,
  FileSpreadsheet,
  Lock,
  Database,
  CreditCard,
  Check,
  Shield,
  Zap,
} from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const BentoFeatures: React.FC = () => {
  return (
    <section
      id="architecture"
      style={{
        padding: '100px 0',
        backgroundColor: '#f5f5f7',
        position: 'relative',
      }}
    >
      <div className="container" style={{ maxWidth: '1120px' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
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
              ENGINEERED FOR SCALE
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
              Enterprise precision. <br />
              Zero unnecessary friction.
            </h2>
            <p
              style={{
                fontSize: '1.1rem',
                color: '#636366',
                maxWidth: '600px',
                margin: '0 auto',
                lineHeight: 1.55,
              }}
            >
              Architected with PostgreSQL, modern edge encryption, and continuous squircle clarity.
            </p>
          </ScrollReveal>
        </div>

        {/* Asymmetric Apple Bento Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(12, 1fr)',
            gap: '1.5rem',
          }}
          className="bento-container"
        >
          {/* Card 1: Wide Multi-Payment Sync (8 Cols) */}
          <div
            style={{
              gridColumn: 'span 8',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            className="bento-span-8"
          >
            <ScrollReveal delay={0} direction="up">
              <div style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <CreditCard size={20} color="#059669" />
                </div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Unified Multi-Channel Payment Ledger
                </h3>
                <p style={{ color: '#636366', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '520px' }}>
                  Accept payments via GCash or on-site Cash. Transactions reconcile in real-time with automatic plan activation and receipt generation.
                </p>
              </div>

              {/* Visual Simulated Payment Pills */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '1rem',
                  backgroundColor: '#f8fafc',
                  padding: '1.25rem',
                  borderRadius: '16px',
                  border: '1px solid #f1f5f9',
                }}
                className="payment-pills-grid"
              >
                {[
                  { method: 'GCash', status: 'Instant Verified', amount: '₱1,500' },
                  { method: 'On-site Cash', status: 'Logged by Staff', amount: '₱750' },
                ].map((item) => (
                  <div key={item.method} style={{ backgroundColor: '#ffffff', padding: '0.85rem', borderRadius: '10px', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)' }}>
                    <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#1d1d1f' }}>{item.method}</div>
                    <div style={{ fontSize: '0.725rem', color: '#059669', fontWeight: 500 }}>{item.status}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#1d1d1f', marginTop: '4px' }}>{item.amount}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Card 2: Executive Reports & Audits (4 Cols) */}
          <div
            style={{
              gridColumn: 'span 4',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            className="bento-span-4"
          >
            <ScrollReveal delay={50} direction="up">
              <div>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#eff6ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.25rem',
                  }}
                >
                  <FileText size={20} color="#0071e3" />
                </div>
                <h3 style={{ fontSize: '1.45rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                  Board-Ready Financial Exports
                </h3>
                <p style={{ color: '#636366', fontSize: '0.925rem', lineHeight: 1.6 }}>
                  One-click generation of PDF statements and Excel audit workbooks formatted to international accounting standards.
                </p>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                  <FileText size={15} color="#0284c7" />
                  <span>Executive P&L Statement (PDF)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 0.85rem', backgroundColor: '#f8fafc', borderRadius: '10px', fontSize: '0.8rem', color: '#334155', fontWeight: 500 }}>
                  <FileSpreadsheet size={15} color="#10b981" />
                  <span>Audited General Ledger (.xlsx)</span>
                </div>
              </div>
            </ScrollReveal>
          </div>

          {/* Card 3: Enterprise Role Security (6 Cols) */}
          <div
            style={{
              gridColumn: 'span 6',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
            }}
            className="bento-span-6"
          >
            <ScrollReveal delay={80} direction="up">
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Lock size={20} color="#7c3aed" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Role-Based Permission Governance
              </h3>
              <p style={{ color: '#636366', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Protect sensitive payroll, owner draws, and net profits with granular permission layers. Front desk staff can log entries without viewing executive bottom lines.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['Administrator', 'Club General Manager', 'Front Desk Receptionist', 'Accountant'].map((role) => (
                  <span key={role} style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.3rem 0.65rem', borderRadius: '9999px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569' }}>
                    {role}
                  </span>
                ))}
              </div>
            </ScrollReveal>
          </div>

          {/* Card 4: High-Performance Cloud Architecture (6 Cols) */}
          <div
            style={{
              gridColumn: 'span 6',
              backgroundColor: '#ffffff',
              borderRadius: '24px',
              padding: '2.5rem',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
            }}
            className="bento-span-6"
          >
            <ScrollReveal delay={110} direction="up">
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#ecfeff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem',
                }}
              >
                <Database size={20} color="#0891b2" />
              </div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
                Low-Latency Cloud PostgreSQL
              </h3>
              <p style={{ color: '#636366', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Hosted on enterprise Supabase infrastructure. Encrypted in transit and at rest, offering automated point-in-time recovery and 99.99% uptime guarantees.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
                <Zap size={14} />
                <span>Sub-50ms query response on 50,000+ member databases</span>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          .bento-span-8,
          .bento-span-4,
          .bento-span-6 {
            grid-column: span 12 !important;
          }
          .payment-pills-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
};
