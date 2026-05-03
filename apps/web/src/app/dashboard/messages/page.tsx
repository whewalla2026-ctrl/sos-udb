'use client';

export default function MessagesPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">💬 Messages</h1>
        <p className="page-subtitle">Secure, AI-monitored messaging</p>
      </div>

      <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontSize: '1.25rem', marginBottom: 8 }}>Safe Inbox</h2>
        <p style={{ color: 'var(--text-secondary)' }}>No new messages. Every message sent and received is scanned by the Guardian Protocol.</p>
      </div>
    </div>
  );
}
