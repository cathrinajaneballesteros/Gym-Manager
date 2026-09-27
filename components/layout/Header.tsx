'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Menu, Search, Calendar, Bell, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const [hasUnread, setHasUnread] = useState(true);

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'rgba(255, 255, 255, 0.82)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.75rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Left: Mobile Toggle + Apple-style Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, maxWidth: '420px' }}>
        <button
          onClick={onToggleMobileMenu}
          style={{
            display: 'none',
            padding: '0.4rem',
            color: '#636366',
            borderRadius: '8px',
            backgroundColor: 'rgba(118, 118, 128, 0.08)',
          }}
          className="mobile-menu-btn"
          aria-label="Toggle navigation"
        >
          <Menu size={17} />
        </button>

        {/* macOS Search Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            backgroundColor: 'rgba(118, 118, 128, 0.08)',
            borderRadius: '8px',
            padding: '0.35rem 0.75rem',
            width: '100%',
            maxWidth: '300px',
            transition: 'background-color 0.15s ease',
          }}
        >
          <Search size={14} color="#8e8e93" />
          <input
            type="text"
            placeholder="Search"
            style={{
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: '0.825rem',
              color: '#1d1d1f',
              width: '100%',
              padding: 0,
            }}
          />
        </div>
      </div>

      {/* Right: Date Picker Pill + Notifications + Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Apple Segmented Date Pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(118, 118, 128, 0.08)',
            fontSize: '0.785rem',
            color: '#3a3a3c',
            fontWeight: 500,
            cursor: 'pointer',
          }}
          className="header-date-pill"
        >
          <Calendar size={13} color="#636366" />
          <span>Apr 1 – Apr 30, 2026</span>
          <ChevronDown size={12} color="#8e8e93" />
        </div>

        {/* Notification Bell */}
        <button
          onClick={() => setHasUnread(false)}
          style={{
            position: 'relative',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#636366',
            cursor: 'pointer',
            transition: 'background-color 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(118, 118, 128, 0.08)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Notifications"
        >
          <Bell size={16} />
          {hasUnread && (
            <span
              style={{
                position: 'absolute',
                top: '5px',
                right: '6px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#ff3b30',
              }}
            />
          )}
        </button>

        {/* Profile Avatar */}
        <Link
          href="/settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              backgroundColor: '#1d1d1f',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            AJ
          </div>
        </Link>
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          .header-date-pill {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
