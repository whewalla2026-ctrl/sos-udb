'use client';
import { useQuery, useMutation } from '@apollo/client';
import { INBOX } from '../../../lib/queries';

export default function MessagesPage() {
  var { data: inboxData, loading } = useQuery(INBOX);

  var messages = inboxData?.inbox || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Messages</h1>
        <p className="page-subtitle">Secure, AI-monitored messaging</p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading messages...</div>
      ) : messages.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Safe Inbox</h2>
          <p style={{ color: 'var(--text-secondary)' }}>No new messages. Every message sent and received is scanned by the Guardian Protocol.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.map(function(m: any) {
            return (
              <div key={m.id} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{m.senderId?.slice(0, 8) || 'Unknown'}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : ''}</div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 400 }}>{m.content}</p>
                </div>
                {m.isSafe === false && <div style={{ fontSize: '0.75rem', color: 'var(--color-danger)', fontWeight: 600 }}>⚠ Flagged</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
