'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  FileBarChart2,
  Sparkles,
  Settings,
  LogOut,
} from 'lucide-react';
import { DBService } from '@/lib/data/db-service';
import { UserProfile } from '@/types/database';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const router = useRouter();
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

  const adminName = profile?.full_name || 'Admin';
  const initials = DBService.getInitials(profile?.full_name);

  const navItems = [
    { section: 'OVERVIEW', items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }] },
    {
      section: 'MANAGEMENT',
      items: [
        { name: 'Members', href: '/members', icon: Users },
        { name: 'Payments', href: '/payments', icon: CreditCard },
        { name: 'Expenses', href: '/expenses', icon: Receipt },
      ],
    },
    {
      section: 'INTELLIGENCE',
      items: [
        { name: 'Reports', href: '/reports', icon: FileBarChart2 },
        { name: 'AI Analytics', href: '/analytics', icon: Sparkles },
      ],
    },
    { section: 'SYSTEM', items: [{ name: 'Settings', href: '/settings', icon: Settings }] },
  ];

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('sgfm_authenticated');
    }
    router.push('/login');
  };

  return (
    <aside
      style={{
        width: '245px',
        backgroundColor: '#14171f',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        userSelect: 'none',
      }}
    >
      {/* 1. macOS Window Traffic Lights Header */}
      <div
        style={{
          padding: '1.25rem 1.25rem 0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#ff5f56',
            border: '0.5px solid #e0443e',
            display: 'inline-block',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          }}
          title="Close Window"
        />
        <span
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#ffbd2e',
            border: '0.5px solid #dea123',
            display: 'inline-block',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          }}
          title="Minimize Window"
        />
        <span
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: '#27c93f',
            border: '0.5px solid #1aab29',
            display: 'inline-block',
            boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          }}
          title="Zoom / Fullscreen"
        />
      </div>

      {/* 2. Apple App Brand Tile */}
      <div
        style={{
          padding: '0.85rem 1.25rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <img
          src="/logo.png"
          alt="Smart Gym Logo"
          width={32}
          height={32}
          style={{
            borderRadius: '8px',
            objectFit: 'contain',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.25)',
          }}
        />
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.015em', color: '#ffffff', lineHeight: 1.15 }}>
            Smart Gym
          </div>
          <div style={{ fontSize: '0.675rem', color: '#8e8e93', fontWeight: 500 }}>
            Finance Manager
          </div>
        </div>
      </div>

      {/* 3. Navigation Sections (Apple macOS Sidebar List Style) */}
      <nav
        style={{
          padding: '0.5rem 0.75rem',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          overflowY: 'auto',
        }}
      >
        {navItems.map((group) => (
          <div key={group.section}>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#6e7681',
                padding: '0 0.75rem 0.35rem',
                letterSpacing: '0.06em',
              }}
            >
              {group.section}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '7px',
                      fontSize: '0.825rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive ? '#ffffff' : '#a1a1a6',
                      backgroundColor: isActive ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                      transition: 'all 0.12s ease',
                      boxShadow: isActive ? 'inset 0 0.5px 0.5px rgba(255, 255, 255, 0.2)' : 'none',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = '#e5e5ea';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#a1a1a6';
                      }
                    }}
                  >
                    <Icon
                      size={16}
                      color={isActive ? '#34c759' : '#8e8e93'}
                      strokeWidth={isActive ? 2.2 : 1.9}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* 4. Bottom macOS User Tile */}
      <div
        style={{
          padding: '0.85rem 1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/settings"
          onClick={onClose}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flex: 1,
            minWidth: 0,
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: '#272b38',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f9fafb',
              fontWeight: 700,
              fontSize: '0.75rem',
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f5f5f7', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {adminName}
            </div>
            <div style={{ fontSize: '0.685rem', color: '#8e8e93', whiteSpace: 'nowrap' }}>
              Administrator
            </div>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          title="Sign out"
          style={{
            padding: '0.4rem',
            color: '#8e8e93',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.12s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ff453a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#8e8e93')}
          aria-label="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};
