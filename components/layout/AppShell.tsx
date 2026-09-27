'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const mobileNavItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Members', href: '/members', icon: Users },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'AI', href: '/analytics', icon: Sparkles },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

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
