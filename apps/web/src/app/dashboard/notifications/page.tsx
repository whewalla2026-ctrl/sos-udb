'use client';

export default function NotificationsPage() {
  const notifications = [
    { id: '1', type: 'QUEST_REMINDER', title: '📚 Quest Due Tomorrow!', body: 'Fraction Worksheets — 4 more to go!', time: '2 hours ago' },
    { id: '2', type: 'LEVEL_UP', title: '🎉 You Reached Level 8!', body: 'Sparky is evolving!', time: '1 day ago' },
    { id: '3', type: 'SAFETY_ALERT', title: '🛡️ Safety Alert', body: 'A message was flagged for review in your child\'s inbox.', time: '2 days ago' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🔔 Notifications</h1>
          <p className="page-subtitle">Your latest updates</p>
        </div>
        <button className="btn btn-ghost">Mark all as read</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notifications.map(n => (
          <div key={n.id} className="glass-card" style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: n.type === 'SAFETY_ALERT' ? 'var(--color-danger)' : 'var(--color-primary-light)' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{n.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: 4 }}>{n.body}</p>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{n.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
