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

export default function DashboardPage() {
  var { data: meData, loading: meLoading, error: meError } = useQuery(GET_ME);
  var { data: dashData, loading: dashLoading } = useQuery(GET_DASHBOARD_DATA);

  if (meLoading || dashLoading) return <LoadingSkeleton />;

  var user = meData?.me;
  var role = user?.role || 'CHILD';

  var childData = {
    user: user || { displayName: 'User', role: 'CHILD', avatarUrl: '' },
    doter: dashData?.myDoter || { name: 'Doter', state: 'EGG', level: 1, xp: 0, xpNext: 1000, coinBalance: 0, streakDays: 0, isEnergetic: false, isSluggy: false },
    quests: [],
    goals: dashData?.myGoals || [],
    biometric: { sleepHours: 8, focusScore: 80, stressLevel: 20, steps: 5000 },
    notifications: dashData?.unreadNotifications || [],
  };

  var parentData = {
    user: user || { displayName: 'Parent', role: 'PARENT', avatarUrl: '' },
    children: dashData?.myChildren || [],
    pendingApprovals: [],
  };

  if (role === 'PARENT') {
    return <ParentDashboard data={parentData} />;
  }

  return <ChildDashboard data={childData} />;
}
