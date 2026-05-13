'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_ME } from '../lib/queries';
import {
  LayoutDashboard, Gamepad2, Bell, Crosshair, Target, Calendar, CalendarRange,
  GraduationCap, Brain, Image, Heart, Landmark, Briefcase, Users, MessageSquare,
  Shield, Sparkles, Award, Globe, Store, Settings, LogOut, BarChart3, Smartphone,
} from 'lucide-react';

var ICON_MAP: Record<string, any> = {
  Dashboard: LayoutDashboard,
  'My Doter': Gamepad2,
  Analytics: BarChart3,
  Notifications: Bell,
  Quests: Crosshair,
  Goals: Target,
  Calendar: Calendar,
  'Weekly Plan': CalendarRange,
  Academic: GraduationCap,
  'AI Tutor': Brain,
  'Evidence Gallery': Image,
  'Health & Biometrics': Heart,
  'My Bank': Landmark,
  Ventures: Briefcase,
  'Family Hub': Users,
  Messages: MessageSquare,
  Safety: Shield,
  'Future Self': Sparkles,
  Achievements: Award,
  'Joon World': Globe,
  Marketplace: Store,
  Sync: Smartphone,
  Settings: Settings,
  'Sign Out': LogOut,
};

var NAV_ITEMS = [
  { section: 'OVERVIEW', items: [
    { href: '/dashboard', icon: 'Dashboard', label: 'Dashboard' },
    { href: '/dashboard/doter', icon: 'My Doter', label: 'My Doter' },
    { href: '/dashboard/analytics', icon: 'BarChart3', label: 'Analytics' },
    { href: '/dashboard/notifications', icon: 'Notifications', label: 'Notifications' },
  ]},
  { section: 'GROWTH', items: [
    { href: '/dashboard/quests', icon: 'Quests', label: 'Quests' },
    { href: '/dashboard/goals', icon: 'Goals', label: 'Goals' },
    { href: '/dashboard/calendar', icon: 'Calendar', label: 'Calendar' },
    { href: '/dashboard/weekly-plan', icon: 'Weekly Plan', label: 'Weekly Plan' },
  ]},
  { section: 'LEARNING', items: [
    { href: '/dashboard/academic', icon: 'Academic', label: 'Academic' },
    { href: '/dashboard/tutor', icon: 'AI Tutor', label: 'AI Tutor' },
    { href: '/dashboard/evidence', icon: 'Evidence Gallery', label: 'Evidence Gallery' },
  ]},
  { section: 'HEALTH', items: [
    { href: '/dashboard/biometric', icon: 'Health & Biometrics', label: 'Health & Biometrics' },
  ]},
  { section: 'MONEY', items: [
    { href: '/dashboard/bank', icon: 'My Bank', label: 'My Bank' },
    { href: '/dashboard/ventures', icon: 'Ventures', label: 'Ventures' },
    { href: '/dashboard/billing', icon: 'Landmark', label: 'Billing' },
  ]},
  { section: 'FAMILY', items: [
    { href: '/dashboard/family', icon: 'Family Hub', label: 'Family Hub' },
    { href: '/dashboard/messages', icon: 'Messages', label: 'Messages' },
    { href: '/dashboard/safety', icon: 'Safety', label: 'Safety' },
  ]},
  { section: 'FUTURE', items: [
    { href: '/dashboard/future-self', icon: 'Future Self', label: 'Future Self' },
    { href: '/dashboard/achievements', icon: 'Achievements', label: 'Achievements' },
    { href: '/dashboard/joon-world', icon: 'Joon World', label: 'Joon World' },
    { href: '/dashboard/marketplace', icon: 'Marketplace', label: 'Marketplace' },
  ]},
  { section: 'SYSTEM', items: [
    { href: '/dashboard/sync', icon: 'Sync', label: 'Sync & Devices' },
  ]},
];

var ADMIN_ITEMS = [
  { href: '/dashboard/admin', icon: 'Dashboard', label: 'Admin Dashboard' },
  { href: '/dashboard/admin/tenants', icon: 'Briefcase', label: 'Tenant Management' },
  { href: '/dashboard/admin/users', icon: 'Users', label: 'User Management' },
  { href: '/dashboard/admin/billing', icon: 'Landmark', label: 'Billing Overview' },
  { href: '/dashboard/admin/audit', icon: 'Shield', label: 'Audit Log' },
  { href: '/dashboard/admin/health', icon: 'Heart', label: 'System Health' },
  { href: '/dashboard/admin/features', icon: 'Sparkles', label: 'Feature Flags' },
];

function NavIcon({ name, size = 18 }: { name: string; size?: number }) {
  var Icon = ICON_MAP[name];
  return Icon ? <Icon size={size} /> : <span style={{ fontSize: '1rem', width: 18, textAlign: 'center', flexShrink: 0 }}>{name}</span>;
}

export default function Sidebar() {
  var pathname = usePathname();
  var { data, loading, error } = useQuery(GET_ME);
  var user = data?.me;
  var doter = user?.doterProfile;
  var unreadCount = 0;

  if (loading) {
    return (
      <nav className="sidebar" id="sidebar-nav">
        <div className="sidebar-logo">🌟 UDB</div>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Loading...</div>
      </nav>
    );
  }

  if (error) {
    return (
      <nav className="sidebar" id="sidebar-nav">
        <div className="sidebar-logo">🌟 UDB</div>
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)', fontSize: '0.8125rem' }}>Failed to load</div>
      </nav>
    );
  }

  return (
    <nav className="sidebar" id="sidebar-nav">
      {/* Logo */}
      <Link href="/dashboard" style={{ textDecoration: 'none' }}>
        <div className="sidebar-logo">🌟 UDB</div>
      </Link>

      {/* User mini-card */}
      <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} /> : <Users size={16} style={{ color: 'white' }} />}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.displayName || 'User'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            {doter ? 'Level ' + doter.level + ' · ' + doter.coinBalance + ' coins' : (user?.role || 'Account')}
          </div>
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
                <Link key={item.href} href={item.href as any} style={{ textDecoration: 'none' }}>
                  <div id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <span style={{ width: 20, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <NavIcon name={item.icon} />
                    </span>
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

        {/* ADMIN Section */}
        {user?.role === 'ADMIN' && (
          <div>
            <div className="nav-section-label" style={{ color: 'var(--color-gold)', marginTop: 8 }}>ADMIN</div>
            {ADMIN_ITEMS.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`} className={`nav-item ${isActive ? 'active' : ''}`}>
                    <span style={{ width: 20, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <NavIcon name={item.icon} />
                    </span>
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom */}
      <div style={{ borderTop: '1px solid var(--bg-glass-border)', paddingTop: 16, marginTop: 8 }}>
        <Link href="/dashboard/settings" style={{ textDecoration: 'none' }}>
          <div className="nav-item" id="nav-settings">
            <span style={{ width: 20, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={18} />
            </span>
            Settings
          </div>
        </Link>
        <Link href="/auth/login" style={{ textDecoration: 'none' }}>
          <div className="nav-item" id="nav-logout" style={{ color: 'var(--color-danger)' }}>
            <span style={{ width: 20, textAlign: 'center', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <LogOut size={18} />
            </span>
            Sign Out
          </div>
        </Link>
      </div>
    </nav>
  );
}
