'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GET_ME } from '../../../lib/queries';
import { Shield, Users, Building2, CreditCard, FileSearch, Activity, Flag, ChevronRight, LayoutDashboard } from 'lucide-react';

const ADMIN_NAV = [
  { href: '/dashboard/admin', icon: LayoutDashboard, label: 'Overview' },
  { href: '/dashboard/admin/tenants', icon: Building2, label: 'Tenants' },
  { href: '/dashboard/admin/users', icon: Users, label: 'Users' },
  { href: '/dashboard/admin/billing', icon: CreditCard, label: 'Billing' },
  { href: '/dashboard/admin/audit', icon: FileSearch, label: 'Audit Log' },
  { href: '/dashboard/admin/health', icon: Activity, label: 'System Health' },
  { href: '/dashboard/admin/features', icon: Flag, label: 'Feature Flags' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  var router = useRouter();
  var pathname = usePathname();
  var { data, loading } = useQuery(GET_ME);
  var user = data?.me;
  var role = user?.role;

  useEffect(() => {
    if (!loading && role && role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [loading, role, router]);

  if (loading) {
    return (
      <div className="fade-in" style={{ padding: 32 }}>
        <div style={{ width: 300, height: 32, background: 'var(--bg-glass)', borderRadius: 8, marginBottom: 16 }} />
        <div style={{ width: 200, height: 20, background: 'var(--bg-glass)', borderRadius: 8 }} />
      </div>
    );
  }

  if (role !== 'ADMIN') return null;

  var breadcrumbs = pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1),
    href: '/' + arr.slice(0, i + 1).join('/'),
    isLast: i === arr.length - 1,
  }));

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <Shield size={20} style={{ color: 'var(--color-gold)' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-gold)' }}>
            Admin Panel
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Dashboard</Link>
          {breadcrumbs.map((crumb) => (
            <span key={crumb.href} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChevronRight size={14} />
              {crumb.isLast ? (
                <span style={{ color: 'var(--text-primary)' }}>{crumb.label}</span>
              ) : (
                <Link href={crumb.href} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{crumb.label}</Link>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Admin Navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap', background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
        {ADMIN_NAV.map(function(item) {
          var active = pathname === item.href;
          var Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 500,
                background: active ? 'var(--gradient-primary)' : 'transparent',
                color: active ? 'white' : 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
                <Icon size={16} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
