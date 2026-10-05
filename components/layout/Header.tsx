'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, Bell } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { UserProfile } from '@/types/database';

interface HeaderProps {
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleMobileMenu }) => {
  const [hasUnread, setHasUnread] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(DBService.getProfile());
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
      </div>

      {/* Right: Notifications + Profile Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
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
            {initials}
          </div>
        </Link>
      </div>
    </header>
  );
};
