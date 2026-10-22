'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, CreditCard, Calendar, LogIn, Menu } from 'lucide-react';
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
          <div className="gym-loader" role="status" aria-live="polite">
            <div className="gym-loader-badge">
              <svg className="gym-loader-dumbbell" viewBox="0 0 64 24" width="44" height="17" aria-hidden="true">
                <rect x="17" y="10" width="30" height="4" rx="2" fill="#ffffff" />
                <rect x="11" y="3" width="6" height="18" rx="2" fill="#ffffff" />
                <rect x="4" y="6" width="5" height="12" rx="2" fill="#ffffff" />
                <rect x="47" y="3" width="6" height="18" rx="2" fill="#ffffff" />
                <rect x="55" y="6" width="5" height="12" rx="2" fill="#ffffff" />
              </svg>
              <span className="gym-loader-shadow" aria-hidden="true" />
            </div>
            <p style={{ fontSize: '0.9rem', color: '#6e6e73' }}>
              Loading your gym
              <span className="gym-loader-dot" aria-hidden="true">.</span>
              <span className="gym-loader-dot" aria-hidden="true">.</span>
              <span className="gym-loader-dot" aria-hidden="true">.</span>
            </p>
          </div>
        )}
      </div>
    );
  }

  // Four tabs fit a phone; everything else is under More, which opens the full menu.
  const role = DBService.getRole();
  const mobileNavItems = [
    // Staff can't open the dashboard, so their home page (check-ins) takes its place.
    role === 'staff'
      ? { name: 'Check-in', href: STAFF_HOME, icon: LogIn }
      : { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Calendar', href: '/calendar', icon: Calendar },
  ].filter((item) => canOpen(role, item.href));
  const isTabActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
  const moreActive = !mobileNavItems.some((item) => isTabActive(item.href));

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
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, paddingBottom: 'calc(60px + env(safe-area-inset-bottom))' }} className="main-content-wrapper">
        <Header onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)} />
        <main style={{ flex: 1, padding: '2rem 2.25rem', overflowY: 'auto' }} className="main-content-inner">
          <div key={pathname} className="page-transition-content" style={{ maxWidth: '1320px', margin: '0 auto', width: '100%' }}>
            {children}
          </div>
        </main>
      </div>

      {/* iPhone iOS Frosted Glass Tab Bar */}
      <div className="ios-tab-bar-container">
        <nav className="ios-tab-bar">
          {mobileNavItems.map((item) => {
            const isActive = isTabActive(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`ios-tab-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={19} color={isActive ? '#059669' : '#8e8e93'} strokeWidth={isActive ? 2.2 : 1.9} />
                <span>{item.name}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className={`ios-tab-item ${moreActive ? 'active' : ''}`}
            aria-label="More pages"
          >
            <Menu size={19} color={moreActive ? '#059669' : '#8e8e93'} strokeWidth={moreActive ? 2.2 : 1.9} />
            <span>More</span>
          </button>
        </nav>
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
            /* Solid instead of frosted: a live blur on a fixed bar repaints on every scroll frame on phones. */
            background: rgba(255, 255, 255, 0.97);
            border-top: 0.5px solid rgba(0, 0, 0, 0.12);
            z-index: 40;
            padding-bottom: env(safe-area-inset-bottom);
          }
          .ios-tab-bar {
            display: flex;
            height: 52px;
            align-items: center;
            justify-content: space-around;
            padding: 0 0.25rem;
          }
          .ios-tab-item {
            flex: 1;
            min-width: 0;
            height: 100%;
            background: none;
            border: none;
            cursor: pointer;
            font-family: inherit;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2px;
            font-size: 0.65rem;
            font-weight: 500;
            color: #8e8e93;
            text-decoration: none;
            padding: 4px 2px;
            transition: color 0.12s ease;
          }
          .ios-tab-item span {
            max-width: 100%;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .ios-tab-item.active {
            color: #059669;
            font-weight: 600;
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
