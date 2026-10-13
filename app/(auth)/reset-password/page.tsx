'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { showToast } from '@/lib/ui/swal';

// Opened from the password reset email: /auth/callback has already signed the person in with the link.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'ready' | 'expired'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setStatus(data.user ? 'ready' : 'expired'));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setSaving(true);
    const { error: updateError } = await createClient().auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    sessionStorage.setItem('sgfm_authenticated', 'true');
    showToast('Password updated');
    router.replace('/dashboard');
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '0.4rem',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-app)',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '2.25rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-white)' }}>Choose a New Password</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
            You&apos;ll use it the next time you sign in.
          </p>
        </div>

        {status === 'checking' && (
          <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Checking your link…</p>
        )}

        {status === 'expired' && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              This reset link has expired or was already used. Request a new one.
            </p>
            <Link href="/forgot-password" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }}>
              Send a New Link
            </Link>
          </div>
        )}

        {status === 'ready' && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {error && (
              <div style={{ padding: '0.75rem 0.9rem', borderRadius: '10px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.825rem' }}>
                {error}
              </div>
            )}
            <div>
              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  autoFocus
                  required
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '2.5rem' }}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={saving}>
              {saving ? 'Saving…' : 'Save New Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
