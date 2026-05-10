'use client';

import Sidebar from '../../components/Sidebar';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { AuthGuard } from '../../components/AuthGuard';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  var pathname = usePathname();

  var breadcrumbs = pathname.split('/').filter(Boolean).slice(1).map((seg, i, arr) => ({
    label: seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    href: '/dashboard/' + arr.slice(0, i + 1).join('/'),
    isLast: i === arr.length - 1,
  }));

  var showBreadcrumbs = breadcrumbs.length > 0 && breadcrumbs[0].label !== 'Dashboard';

  return (
    <AuthGuard>
      <div className="main-layout">
        <Sidebar unreadCount={3} />
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
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
