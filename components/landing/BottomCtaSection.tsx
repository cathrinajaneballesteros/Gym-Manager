'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { ScrollReveal } from '@/components/ui/ScrollReveal';

export const BottomCtaSection: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage and the URL are only readable in the browser
      setIsLoggedIn(sessionStorage.getItem('sgfm_authenticated') === 'true');
    }
  }, []);
  return (
    <section
      style={{
        padding: '64px 0 96px',
        backgroundColor: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container" style={{ maxWidth: '1040px' }}>
        <ScrollReveal delay={0} direction="up" distance={25}>
          {/* Cinematic Dark Glass Panel */}
          <div
            className="apple-glass-dark"
            style={{
              padding: 'clamp(3rem, 6vw, 5rem) clamp(2rem, 5vw, 4rem)',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Subtle Ambient Radial Highlight */}
            <div
              style={{
                position: 'absolute',
                top: '-20%',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '600px',
                height: '400px',
                background: 'radial-gradient(ellipse at 50% 30%, rgba(5, 150, 105, 0.22) 0%, rgba(0, 113, 227, 0.08) 45%, transparent 70%)',
                filter: 'blur(50px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto' }}>
              <span
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#34d399',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: '1rem',
                  display: 'block',
                }}
              >
                READY WHEN YOU ARE
              </span>

              <h2
                style={{
                  fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
                  fontWeight: 800,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.12,
                  color: '#ffffff',
                  marginBottom: '1.25rem',
                }}
              >
                Know where your gym&apos;s money goes.
              </h2>

              <p
                style={{
                  fontSize: '1.05rem',
                  color: '#94a3b8',
                  lineHeight: 1.6,
                  marginBottom: '2.5rem',
                }}
              >
                Set up your gym, add your members and start recording payments today.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  marginBottom: '2rem',
                }}
              >
                <Link
                  href={isLoggedIn ? '/dashboard' : '/login?mode=signup'}
                  className="apple-btn-emerald"
                  style={{
                    padding: '0.85rem 2.25rem',
                    fontSize: '0.95rem',
                    boxShadow: '0 6px 24px rgba(5, 150, 105, 0.4)',
                  }}
                >
                  <span>Launch App</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '1.75rem',
                  fontSize: '0.8rem',
                  color: '#64748b',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={15} color="#34d399" />
                  <span>Secure sign-in</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <Zap size={15} color="#34d399" />
                  <span>Set up in minutes</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
