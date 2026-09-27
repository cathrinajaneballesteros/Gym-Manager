'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ArrowLeft, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@sgfm.com');
  const [password, setPassword] = useState('admin2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    setTimeout(() => {
      if (!email || !password) {
        setError('Please enter both email and password.');
        setLoading(false);
        return;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('sgfm_authenticated', 'true');
      }
      router.push('/dashboard');
    }, 400);
  };

  const handleQuickDemo = () => {
    setEmail('admin@sgfm.com');
    setPassword('admin2026!');
  };

  return (
    <div
      className="auth-page-transition"
      style={{
        minHeight: '100vh',
        backgroundColor: '#f5f5f7',
        color: '#1d1d1f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle Ambient Radial Highlight */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '700px',
          height: '500px',
          background: 'radial-gradient(ellipse at 50% 30%, rgba(5, 150, 105, 0.09) 0%, rgba(0, 113, 227, 0.04) 40%, rgba(245, 245, 247, 0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Top Back-to-Home Nav */}
      <div
        style={{
          position: 'absolute',
          top: '1.75rem',
          left: '2rem',
          zIndex: 10,
        }}
      >
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            color: '#636366',
            fontSize: '0.85rem',
            fontWeight: 500,
            textDecoration: 'none',
            padding: '0.45rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.15s ease',
          }}
        >
          <ArrowLeft size={15} />
          <span>Back to Home</span>
        </Link>
      </div>

      {/* Centered Apple Glass Card */}
      <div
        className="apple-glass-card"
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'rgba(255, 255, 255, 0.82)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -15px rgba(0, 0, 0, 0.07), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
          padding: '2.5rem 2.25rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Brand Icon & Heading */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="Smart Gym Logo"
            width={48}
            height={48}
            style={{
              borderRadius: '12px',
              objectFit: 'contain',
              marginBottom: '0.85rem',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
            }}
          />

          <h1
            style={{
              fontSize: '1.65rem',
              fontWeight: 700,
              color: '#1d1d1f',
              letterSpacing: '-0.025em',
              marginBottom: '0.4rem',
            }}
          >
            Sign in to Smart Gym
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#86868b' }}>
            Cloud Financial Management for Fitness Centers
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '0.75rem 0.9rem',
              backgroundColor: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '10px',
              color: '#991b1b',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Email Input */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.825rem',
                fontWeight: 600,
                color: '#424245',
                marginBottom: '0.45rem',
              }}
            >
              Email address
            </label>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#86868b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Mail size={16} />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sgfm.com"
                required
                style={{
                  width: '100%',
                  paddingLeft: '2.4rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '11px',
                  color: '#1d1d1f',
                  fontSize: '0.875rem',
                  height: '42px',
                }}
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.45rem',
              }}
            >
              <label style={{ fontSize: '0.825rem', fontWeight: 600, color: '#424245' }}>
                Password
              </label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: '0.8rem',
                  color: '#059669',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                Forgot password?
              </Link>
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#86868b',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  paddingLeft: '2.4rem',
                  paddingRight: '2.4rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  borderRadius: '11px',
                  color: '#1d1d1f',
                  fontSize: '0.875rem',
                  height: '42px',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#86868b',
                  display: 'flex',
                  alignItems: 'center',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: '16px',
                height: '16px',
                accentColor: '#059669',
                cursor: 'pointer',
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: '0.825rem',
                color: '#636366',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              Remember this device for 30 days
            </label>
          </div>

          {/* Sign In Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="apple-btn-emerald"
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '11px',
              fontSize: '0.9rem',
              marginTop: '0.35rem',
            }}
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0' }}>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />
          <span style={{ fontSize: '0.75rem', color: '#86868b', textTransform: 'lowercase' }}>or continue with</span>
          <span style={{ flex: 1, height: '1px', backgroundColor: 'rgba(0, 0, 0, 0.08)' }} />
        </div>

        {/* Google Continue Button */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('sgfm_authenticated', 'true');
            }
            router.push('/dashboard');
          }}
          className="apple-btn-secondary"
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '11px',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Demo Credentials Quick Pill */}
        <div
          onClick={handleQuickDemo}
          style={{
            marginTop: '1.25rem',
            padding: '0.65rem 0.9rem',
            backgroundColor: '#ecfdf5',
            border: '1px solid #d1fae5',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Sparkles size={14} color="#059669" />
            <span style={{ fontSize: '0.785rem', color: '#065f46', fontWeight: 600 }}>
              Demo Admin Account
            </span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 500 }}>
            admin@sgfm.com
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div
        style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.785rem',
          color: '#86868b',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span>© 2026 Smart Gym Finance Manager Inc. All rights reserved.</span>
      </div>
    </div>
  );
}
