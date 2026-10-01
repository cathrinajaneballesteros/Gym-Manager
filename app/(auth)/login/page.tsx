'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, Eye, EyeOff, ArrowLeft, Building2, User, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { DBService } from '@/lib/data/db-service';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [gymName, setGymName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClient();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlMode = params.get('mode');
      const isAuth = sessionStorage.getItem('sgfm_authenticated') === 'true';

      if (urlMode === 'signin') {
        setMode('signin');
      } else if (urlMode === 'signup') {
        setMode('signup');
      } else if (isAuth) {
        setMode('signin');
      } else {
        setMode('signup');
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signin') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          throw new Error(signInError.message);
        }

        if (data.user) {
          // Sync profile if available
          try {
            const { data: prof } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (prof) {
              DBService.updateProfile({
                id: prof.id,
                email: prof.email,
                full_name: prof.full_name || 'Gym Administrator',
                gym_name: prof.gym_name || 'My Fitness Gym',
                currency: prof.currency || '₱',
                phone: prof.phone || '',
              });
            } else {
              DBService.updateProfile({
                id: data.user.id,
                email: data.user.email || '',
                full_name: 'Gym Administrator',
                gym_name: 'My Fitness Gym',
              });
            }
          } catch (pErr) {
            console.warn('Profile fetch note:', pErr);
          }

          if (typeof window !== 'undefined') {
            sessionStorage.setItem('sgfm_authenticated', 'true');
          }
          router.push('/dashboard');
        }
      } else {
        // Mode: Sign Up (Create fresh admin account)
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Gym Administrator',
              gym_name: gymName.trim() || 'My Fitness Gym',
            },
          },
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (data.user) {
          // Create or link profile in Supabase table
          try {
            await supabase.from('profiles').upsert({
              id: data.user.id,
              email: data.user.email || email.trim(),
              full_name: fullName.trim() || 'Gym Administrator',
              gym_name: gymName.trim() || 'My Fitness Gym',
              currency: '₱',
              role: 'admin',
            });

            DBService.updateProfile({
              id: data.user.id,
              email: data.user.email || email.trim(),
              full_name: fullName.trim() || 'Gym Administrator',
              gym_name: gymName.trim() || 'My Fitness Gym',
              currency: '₱',
            });
          } catch (pErr) {
            console.warn('Profile setup note:', pErr);
          }

          // If session is already created (auto-confirm enabled in Supabase)
          if (data.session) {
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('sgfm_authenticated', 'true');
            }
            router.push('/dashboard');
            return;
          }

          // If email confirmation is required by Supabase settings
          setSuccessMessage(
            'Account created successfully! If email confirmation is enabled in your Supabase project, check your inbox to confirm before signing in.'
          );
          setMode('signin');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      const { error: oAuthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined,
        },
      });
      if (oAuthError) throw oAuthError;
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setLoading(false);
    }
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
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(5, 150, 105, 0.09) 0%, rgba(0, 113, 227, 0.04) 40%, rgba(245, 245, 247, 0) 70%)',
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

      {/* Centered Card */}
      <div
        className="apple-glass-card"
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
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
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
              letterSpacing: '-0.03em',
              marginBottom: '0.25rem',
            }}
          >
            {mode === 'signin' ? 'Gym Manager Portal' : 'Create Gym Account'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#86868b' }}>
            {mode === 'signin'
              ? 'Sign in to access your gym operations ledger'
              : 'Register your administrator credentials'}
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'rgba(118, 118, 128, 0.12)',
            padding: '3px',
            borderRadius: '10px',
            marginBottom: '1.5rem',
            gap: '2px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError('');
              setSuccessMessage('');
            }}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: mode === 'signin' ? 600 : 500,
              backgroundColor: mode === 'signin' ? '#ffffff' : 'transparent',
              color: mode === 'signin' ? '#1d1d1f' : '#636366',
              boxShadow: mode === 'signin' ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError('');
              setSuccessMessage('');
            }}
            style={{
              flex: 1,
              padding: '0.45rem',
              borderRadius: '8px',
              fontSize: '0.825rem',
              fontWeight: mode === 'signup' ? 600 : 500,
              backgroundColor: mode === 'signup' ? '#ffffff' : 'transparent',
              color: mode === 'signup' ? '#1d1d1f' : '#636366',
              boxShadow: mode === 'signup' ? '0 1px 3px rgba(0, 0, 0, 0.12)' : 'none',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            Create Account
          </button>
        </div>

        {/* Error Message */}
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

        {/* Success Message */}
        {successMessage && (
          <div
            style={{
              padding: '0.75rem 0.9rem',
              backgroundColor: '#ecfdf5',
              border: '1px solid #d1fae5',
              borderRadius: '10px',
              color: '#065f46',
              fontSize: '0.825rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          {/* Sign Up Fields: Full Name & Gym Name */}
          {mode === 'signup' && (
            <>
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
                  Your Name
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
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
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
                  Gym / Fitness Center Name
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
                    <Building2 size={16} />
                  </div>
                  <input
                    type="text"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="e.g. IronPeak Fitness Club"
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
            </>
          )}

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
                placeholder="admin@yourgym.com"
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
              {mode === 'signin' && (
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
              )}
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
          {mode === 'signin' && (
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
                Remember this device
              </label>
            </div>
          )}

          {/* Submit Button */}
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
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <span>
              {loading
                ? mode === 'signin'
                  ? 'Verifying...'
                  : 'Creating Account...'
                : mode === 'signin'
                ? 'Sign In'
                : 'Create Gym Account'}
            </span>
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
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="apple-btn-secondary"
          style={{
            width: '100%',
            height: '42px',
            borderRadius: '11px',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
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
        <span>© 2026 Smart Gym Finance Manager. All rights reserved.</span>
      </div>
    </div>
  );
}
