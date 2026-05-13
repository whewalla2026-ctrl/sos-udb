'use client';

import { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home, Menu, X } from 'lucide-react';
import { AuthGuard } from '../../components/AuthGuard';
import { ErrorBoundary } from '../../components/ErrorBoundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  var pathname = usePathname();
  var [mobileNavOpen, setMobileNavOpen] = useState(false);

  var breadcrumbs = pathname.split('/').filter(Boolean).slice(1).map((seg, i, arr) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    href: '/dashboard/' + arr.slice(0, i + 1).join('/'),
    isLast: i === arr.length - 1,
  }));

  var showBreadcrumbs = breadcrumbs.length > 0 && breadcrumbs[0].label !== 'Dashboard';

  return (
    <AuthGuard>
      <div className="main-layout">
        {/* Mobile nav toggle */}
        <button className="mobile-nav-toggle" onClick={() => setMobileNavOpen(!mobileNavOpen)}
          style={{ position: 'fixed', top: 12, left: 12, zIndex: 1000, display: 'none', background: 'var(--bg-card)', border: '1px solid var(--bg-glass-border)', borderRadius: 8, padding: 8, cursor: 'pointer' }}>
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Sidebar with mobile overlay */}
        <div className={`sidebar-wrapper ${mobileNavOpen ? 'mobile-open' : ''}`}>
          <Sidebar />
        </div>
        {mobileNavOpen && <div className="mobile-overlay" onClick={() => setMobileNavOpen(false)} />}

        <main className="main-content" style={{ position: 'relative', zIndex: 1 }}>
          {showBreadcrumbs && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16, paddingTop: 4 }}>
              <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Home size={14} />
                Dashboard
              </Link>
              {breadcrumbs.map((crumb) => (
                <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ChevronRight size={14} />
                  {crumb.isLast ? (
                    <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{crumb.label}</Link>
                  )}
                </span>
              ))}
            </div>
          )}
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-nav-toggle { display: block !important; }
          .sidebar-wrapper {
            position: fixed; top: 0; left: -280px; width: 260px; height: 100vh;
            z-index: 999; transition: left 0.3s ease; background: var(--bg-card);
            border-right: 1px solid var(--bg-glass-border);
          }
          .sidebar-wrapper.mobile-open { left: 0; }
          .mobile-overlay {
            position: fixed; inset: 0; background: rgba(0,0,0,0.5);
            z-index: 998;
          }
          .main-content { margin-left: 0 !important; padding: 16px !important; }
        }
      `}</style>
    </AuthGuard>
  );
}
