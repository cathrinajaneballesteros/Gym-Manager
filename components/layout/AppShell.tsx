'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Settings,
  Sparkles,
  Calendar,
  LogIn,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DBService } from '@/lib/data/db-service';
import { STAFF_HOME, canOpen } from '@/lib/ui/roles';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [ready, setReady] = useState(() => DBService.isLoaded());
  const [loadError, setLoadError] = useState('');
  const pathname = usePathname();
  const router = useRouter();

  // Every page reads this gym's data, so load it before showing any of them.
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    DBService.load()
      .then(() => !cancelled && setReady(true))
      .catch((err: Error) => {
        if (cancelled) return;
        if (err.message === 'Not signed in') router.replace('/login?mode=signin');
        else setLoadError(err.message || 'Could not load your gym data.');
      });
    return () => {
      cancelled = true;
    };
  }, [ready, router]);

  // Pick up changes made on other devices: when the tab comes back into view (at most every 30s) and every 2 minutes.
  const [, setDataVersion] = useState(0);
  useEffect(() => {
    if (!ready) return;
    let lastRefresh = Date.now();
    const refresh = (minGapMs: number) => {
      if (document.visibilityState !== 'visible' || Date.now() - lastRefresh < minGapMs) return;
      lastRefresh = Date.now();
      DBService.refresh();
    };
    const onFocus = () => refresh(30_000);
    const timer = window.setInterval(() => refresh(0), 120_000);
    // Re-check redirects (e.g. a removed staff member) after each refresh.
    const onData = () => setDataVersion((v) => v + 1);
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('sgfm_data_updated', onData);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('sgfm_data_updated', onData);
    };
  }, [ready]);

  // A gym that isn't set up goes to onboarding; staff on an owner-only page go to their home page.
  const redirectTo = !ready
    ? null
    : DBService.needsOnboarding()
      ? '/onboarding'
      : !canOpen(DBService.getRole(), pathname)
        ? STAFF_HOME
        : null;

  useEffect(() => {
    if (redirectTo) router.replace(redirectTo);
  }, [redirectTo, router]);

  if (!ready || redirectTo) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7', padding: '1rem' }}>
        {loadError ? (
          <div style={{ textAlign: 'center', maxWidth: '360px' }}>
            <p style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: '0.5rem' }}>Couldn&apos;t load your gym data</p>
            <p style={{ fontSize: '0.875rem', color: '#6e6e73', marginBottom: '1rem' }}>{loadError}</p>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', color: '#6e6e73' }}>Loading your gym…</p>
        )}
      </div>
    );
  }

  const allMobileNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'AI', href: '/analytics', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];
  const role = DBService.getRole();
  const allowedMobileItems = allMobileNavItems.filter((item) => canOpen(role, item.href));
  // Staff lose the Dashboard tab, so their home page (check-ins) takes its place.
  const mobileNavItems =
    role === 'staff' ? [{ name: 'Check-in', href: STAFF_HOME, icon: LogIn }, ...allowedMobileItems] : allowedMobileItems;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f5f5f7' }}>
      {/* Desktop macOS Sidebar */}
      <div className="desktop-sidebar" style={{ display: 'flex' }}>
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(5px)',
            WebkitBackdropFilter: 'blur(5px)',
            zIndex: 49,
          }}
        />
      )}

      {/* Mobile Drawer */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 50,
          transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="mobile-drawer"
      >
        <Sidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: '75px' }} className="main-content-wrapper">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main style={{ flex: 1, padding: '2rem 2.25rem', overflowY: 'auto' }} className="main-content-inner">
          <div key={pathname} className="page-transition-content" style={{ maxWidth: '1320px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      {/* iPhone iOS Frosted Glass Tab Bar with Home Indicator */}
      <div className="ios-tab-bar-container">
        <nav className="ios-tab-bar">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ios-tab-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} color={isActive ? '#34c759' : '#8e8e93'} strokeWidth={isActive ? 2.2 : 1.9} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
        {/* iOS Home Indicator Bar */}
        <div className="ios-home-indicator" />
      </div>

      <style jsx global>{`
        .ios-tab-bar-container {
          display: none;
        }

        @media (max-width: 900px) {
          .desktop-sidebar {
            display: none !important;
          }
          .mobile-menu-btn {
            display: flex !important;
          }
          .main-content-inner {
            padding: 1.25rem 1rem !important;
          }
          .ios-tab-bar-container {
            display: flex;
            flex-direction: column;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border-top: 0.5px solid rgba(0, 0, 0, 0.12);
            z-index: 40;
            padding-bottom: 5px;
          }
          .ios-tab-bar {
            display: flex;
            height: 52px;
            align-items: center;
            justify-content: space-around;
            padding: 0 0.5rem;
          }
          .ios-tab-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-size: 0.65rem;
            font-weight: 500;
            color: #8e8e93;
            text-decoration: none;
            padding: 4px 6px;
            transition: color 0.12s ease;
          }
          .ios-tab-item.active {
            color: #34c759;
            font-weight: 600;
          }
          .ios-home-indicator {
            width: 134px;
            height: 4.5px;
            background-color: #000000;
            border-radius: 3px;
            margin: 2px auto 4px;
            opacity: 0.28;
          }
        }

        @media (min-width: 901px) {
          .main-content-wrapper {
            padding-bottom: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};
