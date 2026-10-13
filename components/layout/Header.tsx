'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { UserProfile } from '@/types/database';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  // AppShell only renders the header once the gym's data has loaded.
  const [profile, setProfile] = useState<UserProfile>(() => DBService.getProfile());

  useEffect(() => {
    const handleProfileUpdate = () => {
      setProfile(DBService.getProfile());
    };
    window.addEventListener('sgfm_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('sgfm_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  const initials = DBService.getInitials(profile?.full_name);

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
      {/* Left: Mobile Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          onClick={onToggleMobileMenu}
          style={{
            display: 'none',
            width: '40px',
            height: '40px',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#636366',
            borderRadius: '8px',
            backgroundColor: 'rgba(118, 118, 128, 0.08)',
          }}
          className="mobile-menu-btn"
          aria-label="Toggle navigation"
        >
          <Menu size={17} />
        </button>
      </div>

      {/* Right: Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        {/* Profile Avatar */}
        <Link
          href="/settings"
          aria-label="Account settings"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
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
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
};
