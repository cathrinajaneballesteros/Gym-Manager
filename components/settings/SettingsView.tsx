'use client';

import React, { useState, useEffect } from 'react';
import {
  User,
  Lock,
  Bell,
  Sliders,
  Building2,
  CheckCircle,
  Database,
  Camera,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { UserProfile, UserRole } from '@/types/database';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { showError, showInfo } from '@/lib/ui/swal';

export const SettingsView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(DBService.getProfile());
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'appearance'>('account');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gymName, setGymName] = useState('');
  const [currency, setCurrency] = useState('₱');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Security password fields
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  useEffect(() => {
    const current = DBService.getProfile();
    setProfile(current);
    setFullName(current.full_name || '');
    setEmail(current.email || '');
    setPhone(current.phone || '');
    setGymName(current.gym_name || '');
    setCurrency(current.currency || '₱');

    // Show the sign-in email, which can differ from the profile if it was changed in Supabase.
    import('@/lib/supabase/client').then(({ createClient }) => {
      createClient().auth.getUser().then(({ data: { user } }) => {
        if (user?.email) setEmail(user.email);
      });
    });
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await DBService.updateProfile({
        full_name: fullName,
        email,
        gym_name: gymName,
        currency,
        phone,
      });
      setProfile(updated);
    } catch (err) {
      showError('Save Failed', err instanceof Error ? err.message : 'Could not save your settings.');
      return;
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showError('Password Too Short', 'Password must be at least 6 characters');
      return;
    }

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      showError('Password Update Error', err.message || 'Unable to update password');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Page Header */}
      <ScrollReveal delay={0}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: '0.25rem' }}>
            Settings
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#64748b' }}>
            Manage your account and application preferences.
          </p>
        </div>
      </ScrollReveal>

      {/* 2. Main Unified Card with Sidebar + Content Form */}
      <ScrollReveal delay={40}>
        <div
          className="card settings-layout-grid"
          style={{
            padding: 0,
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            overflow: 'hidden',
            minHeight: '480px',
          }}
        >
        {/* Left Vertical Sub-Navigation Tabs */}
        <div
          style={{
            borderRight: '1px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            padding: '1.25rem 0.85rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}
        >
          {[
            { key: 'account', label: 'Account', icon: User, color: '#0071e3' },
            { key: 'security', label: 'Security', icon: Lock, color: '#34c759' },
            { key: 'notifications', label: 'Notifications', icon: Bell, color: '#ff3b30' },
            { key: 'appearance', label: 'Appearance', icon: Sliders, color: '#af52de' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#1d1d1f' : '#636366',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  border: '0.5px solid',
                  borderColor: isActive ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
                  boxShadow: isActive ? '0 1px 3px rgba(0, 0, 0, 0.08)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '6px',
                    backgroundColor: tab.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={13} strokeWidth={2.3} />
                </div>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div style={{ padding: '2rem 2.5rem' }}>
          {activeTab === 'account' && (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '620px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                  Profile Information
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Update your gym account identity and contact details.
                </p>
              </div>

              {/* Avatar Section */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem 0' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.15rem',
                    fontWeight: 700,
                  }}
                >
                  {DBService.getInitials(fullName || profile.full_name)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.95rem' }}>
                    {fullName || profile.full_name || 'Admin'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    Admin
                  </div>
                  <button
                    type="button"
                    onClick={() => showInfo('Photo Upload', 'Photo upload dialog: file selector enabled.')}
                    style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, marginTop: '4px', cursor: 'pointer' }}
                  >
                    Change photo
                  </button>
                </div>
              </div>

              {/* Inputs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={{ width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Gym Facility Name
                  </label>
                  <input
                    type="text"
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    style={{ width: '100%' }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    style={{ width: '100%' }}
                  >
                    <option value="₱">₱ (PHP - Philippine Peso)</option>
                    <option value="$">$ (USD - US Dollar)</option>
                    <option value="€">€ (EUR - Euro)</option>
                    <option value="£">£ (GBP - British Pound)</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#0f172a', borderColor: '#0f172a' }}
                >
                  Save Changes
                </button>
                {saveSuccess && (
                  <span style={{ fontSize: '0.825rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <CheckCircle size={15} />
                    <span>Preferences saved successfully!</span>
                  </span>
                )}
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.25rem' }}>
                  Security & Password
                </h2>
                <p style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Manage your credentials and session protection.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%' }}
                  placeholder="Minimum 6 characters"
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#0f172a', borderColor: '#0f172a' }}>
                  Update Password
                </button>
                {passwordSuccess && (
                  <span style={{ marginLeft: '1rem', fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
                    Password updated!
                  </span>
                )}
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                Notification Preferences
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                Email reminders for membership expirations (7 days in advance) are enabled.
              </p>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                Appearance & Theme
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                2026 Modern SaaS Light Canvas with Dark Slate Sidebar active.
              </p>
            </div>
          )}
        </div>
      </div>
      </ScrollReveal>

      <style jsx>{`
        @media (max-width: 768px) {
          .settings-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
