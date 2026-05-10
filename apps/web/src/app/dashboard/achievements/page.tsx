'use client';

import { useQuery } from '@apollo/client';
import { GET_ME } from '../../../lib/queries';

export default function AchievementsPage() {
  var { data, loading } = useQuery(GET_ME);

  var achievements = [
    { icon: '🏆', title: 'First Quest', desc: 'Complete your first quest', unlocked: true },
    { icon: '⭐', title: 'Perfect Week', desc: 'Complete all weekly goals', unlocked: true },
    { icon: '🔥', title: 'Streak Master', desc: 'Maintain a 30-day streak', unlocked: false },
    { icon: '🧠', title: 'Scholar', desc: 'Master 10 skill gaps', unlocked: false },
    { icon: '💪', title: 'Health Nut', desc: 'Log biometrics for 30 days', unlocked: false },
    { icon: '💰', title: 'Entrepreneur', desc: 'Launch your first venture', unlocked: false },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Achievements</h1>
        <p className="page-subtitle">Badges and milestones earned on your journey.</p>
      </div>
      {loading ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading achievements...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {achievements.map(function(a, i) {
            return (
              <div key={i} className={'glass-card' + (a.unlocked ? '' : ' dimmed')} style={{ padding: 24, textAlign: 'center', opacity: a.unlocked ? 1 : 0.5 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>{a.icon}</div>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{a.title}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{a.desc}</div>
                {a.unlocked && <div className="badge badge-success" style={{ marginTop: 12 }}>Unlocked</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
