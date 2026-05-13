'use client';
import { useQuery, useMutation } from '@apollo/client';
import { GET_UNREAD_NOTIFICATIONS, MARK_ALL_READ } from '../../../lib/queries';

export default function NotificationsPage() {
  var { data: notifData, loading, error } = useQuery(GET_UNREAD_NOTIFICATIONS);
  var [markAllRead] = useMutation(MARK_ALL_READ);

  var notifications = notifData?.unreadNotifications || [];

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-subtitle">Your latest updates</p>
        </div>
        {notifications.length > 0 && (
          <button className="btn btn-ghost" onClick={function() { markAllRead(); }}>Mark all as read</button>
        )}
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading notifications...</div>
      ) : error ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-danger)' }}>Failed to load notifications.</div>
      ) : notifications.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔔</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>All caught up!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>No new notifications.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {notifications.map(function(n: any) {
            var timeAgo = n.createdAt ? (function() {
              var diff = Date.now() - new Date(n.createdAt).getTime();
              var mins = Math.floor(diff / 60000);
              if (mins < 1) return 'Just now';
              if (mins < 60) return mins + 'm ago';
              var hrs = Math.floor(mins / 60);
              if (hrs < 24) return hrs + 'h ago';
              var days = Math.floor(hrs / 24);
              return days + 'd ago';
            })() : '';

            return (
              <div key={n.id} className="glass-card" style={{ padding: '20px 24px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: n.type === 'SAFETY_ALERT' ? 'var(--color-danger)' : 'var(--color-primary-light)' }} />
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{n.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginTop: 4 }}>{n.body}</p>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{timeAgo}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
