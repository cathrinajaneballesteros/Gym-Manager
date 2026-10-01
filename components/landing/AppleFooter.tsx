'use client';

import React from 'react';
import Link from 'next/link';

export const AppleFooter: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: '#f5f5f7',
        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        padding: '60px 0 40px',
        color: '#86868b',
        fontSize: '0.785rem',
        lineHeight: 1.6,
      }}
    >
      <div className="container" style={{ maxWidth: '1060px' }}>
        {/* Footnote Disclaimers */}
        <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(0, 0, 0, 0.08)', marginBottom: '2.5rem' }}>
          <p style={{ marginBottom: '0.75rem' }}>
            1. Predictive accuracy metrics are based on backtested historical linear regressions of 12-month fitness club billing cycles across Philippine fitness hubs. Actual cash flow performance may vary depending on local membership renewal policies.
          </p>
          <p>
            2. Smart Gym is completely free to use. All forecasting models, automated payment reconciliations, and member analytics are available with zero subscription fees or locked tiers.
          </p>
        </div>

        {/* Directory Columns */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '2rem',
            marginBottom: '3rem',
          }}
          className="footer-columns"
        >
          <div>
            <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: '0.85rem' }}>Platform</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
              <li><a href="#overview" style={{ color: 'inherit', textDecoration: 'none' }}>Overview</a></li>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Cashflow Intelligence</Link></li>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Member Churn Radar</Link></li>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Expense Leak Sentinel</Link></li>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Automated Reports</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: '0.85rem' }}>Solutions</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
              <li><span style={{ color: 'inherit' }}>Boutique Fitness Studios</span></li>
              <li><span style={{ color: 'inherit' }}>Commercial 24/7 Gyms</span></li>
              <li><span style={{ color: 'inherit' }}>CrossFit & Strength Boxes</span></li>
              <li><span style={{ color: 'inherit' }}>Multi-Branch Franchises</span></li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: '0.85rem' }}>Account</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Sign In</Link></li>
              <li><Link href="/login" style={{ color: 'inherit', textDecoration: 'none' }}>Create Account</Link></li>
              <li><Link href="/forgot-password" style={{ color: 'inherit', textDecoration: 'none' }}>Password Recovery</Link></li>
              <li><Link href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Open Workspace</Link></li>
            </ul>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: '0.85rem' }}>About Smart Gym</div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: 0 }}>
              <li><span style={{ color: 'inherit' }}>IronPeak Fitness System</span></li>
              <li><span style={{ color: 'inherit' }}>Privacy Policy</span></li>
              <li><span style={{ color: 'inherit' }}>Terms of Service</span></li>
              <li><span style={{ color: 'inherit' }}>Philippines (PHP ₱)</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom Legal Copyright Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(0, 0, 0, 0.08)',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/logo.png" alt="Smart Gym" width={18} height={18} style={{ borderRadius: '4px' }} />
            <span>Copyright © 2026 Smart Gym Finance Manager Inc. All rights reserved.</span>
          </div>

          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Legal Notices</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Site Map</a>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .footer-columns {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </footer>
  );
};
