'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';

export const AppleNavbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsLoggedIn(sessionStorage.getItem('sgfm_authenticated') === 'true');
    }
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Overview', href: '#overview' },
    { name: 'Intelligence', href: '#intelligence' },
    { name: 'Architecture', href: '#architecture' },
    { name: 'Metrics', href: '#metrics' },
  ];

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '0.85rem 1.25rem',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        className={`glass-nav ${scrolled ? 'glass-nav-scrolled' : ''}`}
        style={{
          width: '100%',
          maxWidth: '1060px',
          height: '52px',
          borderRadius: '9999px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 0.85rem 0 1.25rem',
          pointerEvents: 'auto',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            textDecoration: 'none',
          }}
        >
          <img
            src="/logo.svg"
            alt="Smart Gym Finance Manager"
            width={28}
            height={28}
            style={{
              borderRadius: '7px',
              objectFit: 'contain',
            }}
          />
          <span
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: '#1d1d1f',
            }}
          >
            Smart Gym
          </span>
        </Link>

        {/* Desktop Centered Navigation Items */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1.75rem',
          }}
          className="desktop-nav-links"
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              style={{
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#636366',
                textDecoration: 'none',
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#1d1d1f')}
              onMouseLeave={(e) => (e.currentTarget.style.color = '#636366')}
            >
              {link.name}
            </a>
          ))}
        </nav>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Link
            href="/login?mode=signin"
            style={{
              fontSize: '0.85rem',
              fontWeight: 500,
              color: '#424245',
              textDecoration: 'none',
              padding: '0.4rem 0.75rem',
              transition: 'color 0.15s ease',
            }}
            className="desktop-signin-link"
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1d1d1f')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#424245')}
          >
            Sign in
          </Link>

          <Link
            href={isLoggedIn ? '/dashboard' : '/login?mode=signup'}
            className="apple-btn-primary"
            style={{
              fontSize: '0.825rem',
              padding: '0.45rem 1.15rem',
              height: '34px',
            }}
          >
            <span>Launch App</span>
            <ArrowRight size={13} />
          </Link>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{
              display: 'none',
              padding: '0.4rem',
              color: '#1d1d1f',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
            className="mobile-toggle-btn"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          style={{
            position: 'fixed',
            top: '72px',
            left: '1.25rem',
            right: '1.25rem',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(30px)',
            WebkitBackdropFilter: 'blur(30px)',
            borderRadius: '20px',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.12)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            pointerEvents: 'auto',
            animation: 'appleCleanFade 0.2s ease forwards',
          }}
        >
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                fontSize: '1rem',
                fontWeight: 500,
                color: '#1d1d1f',
                textDecoration: 'none',
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(0, 0, 0, 0.04)',
              }}
            >
              {link.name}
            </a>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Link
              href="/login?mode=signin"
              onClick={() => setMobileOpen(false)}
              className="apple-btn-secondary"
              style={{ flex: 1, fontSize: '0.85rem', padding: '0.65rem' }}
            >
              Sign In
            </Link>
            <Link
              href={isLoggedIn ? '/dashboard' : '/login?mode=signup'}
              onClick={() => setMobileOpen(false)}
              className="apple-btn-primary"
              style={{ flex: 1, fontSize: '0.85rem', padding: '0.65rem' }}
            >
              Launch App
            </Link>
          </div>
        </div>
      )}

      <style jsx>{`
        @media (max-width: 768px) {
          .desktop-nav-links,
          .desktop-signin-link {
            display: none !important;
          }
          .mobile-toggle-btn {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
};
