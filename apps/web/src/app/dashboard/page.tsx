'use client';

import { useQuery } from '@apollo/client';
import { ChildDashboard } from '../../components/ChildDashboard';
import { ParentDashboard } from '../../components/ParentDashboard';
import { GET_ME, GET_DASHBOARD_DATA } from '../../lib/queries';

function LoadingSkeleton() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ width: 300, height: 32, background: 'var(--bg-glass)', borderRadius: 8, marginBottom: 8 }} />
        <div style={{ width: 200, height: 20, background: 'var(--bg-glass)', borderRadius: 8 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 28, height: 200 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[1,2,3,4].map(function(i) { return <div key={i} className="glass-card" style={{ padding: 20, height: 100 }} />; })}
        </div>
      </div>
    </div>
  );
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="glass-card" style={{ padding: 32, textAlign: 'center', marginTop: 24 }}>
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠️</div>
      <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Failed to load dashboard</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{message}</p>
    </div>
  );
}

export default function DashboardPage() {
  var { data: meData, loading: meLoading, error: meError } = useQuery(GET_ME);
  var { data: dashData, loading: dashLoading, error: dashError } = useQuery(GET_DASHBOARD_DATA);

  if (meLoading || dashLoading) return <LoadingSkeleton />;
  if (meError) return <ErrorDisplay message={meError.message} />;
  if (dashError) return <ErrorDisplay message={dashError.message} />;

  var user = meData?.me;
  if (!user) return <ErrorDisplay message="User not found. Please log in again." />;

  var role = user.role;

  var childData = {
    user: user,
    doter: dashData?.myDoter || { name: 'Doter', state: 'EGG', level: 1, xp: 0, xpNext: 1000, coinBalance: 0, streakDays: 0, isEnergetic: false, isSluggy: false },
    quests: dashData?.myGoals || [],
    goals: dashData?.myGoals || [],
    biometric: dashData?.biometricHistory || {},
    notifications: dashData?.unreadNotifications || [],
  };

  var parentData = {
    user: user,
    children: [],
    pendingApprovals: [],
  };

  if (role === 'PARENT') {
    return <ParentDashboard data={parentData} />;
  }

  return <ChildDashboard data={childData} />;
}
