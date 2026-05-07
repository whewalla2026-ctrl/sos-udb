'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { section: 'OVERVIEW', items: [
    { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
    { href: '/dashboard/doter', icon: '🐣', label: 'My Doter' },
    { href: '/dashboard/notifications', icon: '🔔', label: 'Notifications' },
    { href: '/dashboard/family', icon: '👨‍👩‍👧', label: 'Family' },
  ]},
  { section: 'PLANNING', items: [
    { href: '/dashboard/weekly-plan', icon: '🗓️', label: 'Weekly Plan' },
    { href: '/dashboard/goals', icon: '🎯', label: 'Goals' },
    { href: '/dashboard/evidence', icon: '📸', label: 'Evidence' },
  ]},
  { section: 'REWARDS', items: [
    { href: '/dashboard/bank', icon: '🏦', label: 'My Bank' },
  ]},
];

export default function Sidebar({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="sidebar" id="sidebar-nav">
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo">🌟 UDB</div>
      </Link>

      {/* User mini-card */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>👤</div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', truncate: true }}>Family Account</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Level 8 · 1,250 coins</div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        {NAV_ITEMS.map(section => (
          <div key={section.section}>
            <div className="nav-section-label">{section.section}</div>
            {section.items.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <span style={{ fontSize: '1rem', width: 20, textAlign: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span>{item.label}</span>
                    {item.label === 'Notifications' && unreadCount > 0 && (
                      <span style={{ marginLeft: 'auto', background: 'var(--color-danger)', color: 'white', fontSize: '0.6875rem', fontWeight: 700, borderRadius: 99, padding: '1px 7px', minWidth: 18, textAlign: 'center' }}>{unreadCount}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--bg-glass-border)', paddingTop: 16, marginTop: 8 }}>
        <Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
          <div className="nav-item" id="nav-settings"><span>⚙️</span> Settings</div>
        </Link>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <div className="nav-item" id="nav-logout" style={{ color: 'var(--color-danger)' }}><span>🚪</span> Sign Out</div>
        </Link>
      </div>
    </nav>
  );
}
