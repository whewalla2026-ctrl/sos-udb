'use client';

export default function SafetyPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🛡️ Safety Guardian</h1>
        <p className="page-subtitle">AI monitoring for bullying, grooming, and mental health risks</p>
      </div>

      <div className="glass-card" style={{ padding: 24, borderTop: '4px solid var(--color-success)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Safety Score: 100/100</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>No flags detected in recent messages.</p>
          </div>
          <div style={{ fontSize: '3rem' }}>✅</div>
        </div>
      </div>
    </div>
  );
}
