'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, Settings, LogOut } from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { UserProfile } from '@/types/database';
import { signOut } from '@/lib/ui/sign-out';

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

  const displayName = DBService.displayName(profile);
  const initials = DBService.getInitials(displayName);

  // Account menu under the avatar: Settings and Sign out.
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut(profile.email);
    router.push('/login');
  };

  return (
    <header
      className="app-header"
      style={{
        height: '56px',
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

      {/* Right: Profile Avatar with the account menu */}
      <div ref={menuRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Account menu"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: 0,
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
              boxShadow: menuOpen ? '0 0 0 3px rgba(0, 113, 227, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
            }}
          >
            {initials}
          </div>
        </button>

        {menuOpen && (
          <div
            role="menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              minWidth: '220px',
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              boxShadow: '0 16px 36px -6px rgba(0, 0, 0, 0.14), 0 6px 16px -2px rgba(0, 0, 0, 0.05)',
              padding: '0.35rem',
              zIndex: 50,
            }}
          >
            <div style={{ padding: '0.6rem 0.75rem 0.7rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.3rem' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {profile.email}
              </div>
            </div>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              style={menuItemStyle}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <Settings size={15} color="#64748b" />
              <span>Settings</span>
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              style={{ ...menuItemStyle, color: '#dc2626' }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.65rem',
  width: '100%',
  padding: '0.55rem 0.75rem',
  fontSize: '0.825rem',
  fontWeight: 500,
  color: '#1e293b',
  borderRadius: '7px',
  border: 'none',
  backgroundColor: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
  textDecoration: 'none',
};
