'use client';

export default function FamilyPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">👨‍👩‍👧 Family Hub</h1>
        <p className="page-subtitle">Manage family links, permissions, and COPPA compliance</p>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>Linked Accounts</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: 16, border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: '2rem' }}>👦</div>
              <div>
                <div style={{ fontWeight: 600 }}>Leo Johnson</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Child Account</div>
              </div>
            </div>
            <div className="badge badge-success">✓ COPPA Verified</div>
          </div>
        </div>
        <button className="btn btn-secondary mt-6">+ Link Another Child</button>
      </div>
    </div>
  );
}
