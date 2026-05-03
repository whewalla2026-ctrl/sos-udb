'use client';

const PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

export function ParentDashboard({ data }: { data: any }) {
  const { user, children, pendingApprovals } = data;

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" id="dashboard-greeting">
            Welcome to the Command Center, {user.displayName.split(' ')[0]} 🛡️
          </h1>
          <p className="page-subtitle">Here is the developmental overview of your family.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        
        {/* Main Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Children Overview */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>👨‍👩‍👧‍👦 Family Snapshot</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {children.map((child: any) => (
                <div key={child.id} className="glass-card" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                    <img src={child.avatarUrl} alt={child.name} style={{ width: 60, height: 60, borderRadius: '50%' }} />
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{child.name}</h3>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Doter: {child.doterName} (Lv {child.doterLevel})</div>
                    </div>
                  </div>
                  
                  {/* Quick Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="stat-card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Last Sleep</div>
                      <div style={{ fontWeight: 600, color: '#10B981' }}>{child.sleepHours}h</div>
                    </div>
                    <div className="stat-card" style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Total Points</div>
                      <div style={{ fontWeight: 600, color: '#F59E0B' }}>{child.points} 🪙</div>
                    </div>
                  </div>

                  <a href={`/dashboard/family/${child.id}`} style={{ display: 'block', marginTop: 16, textAlign: 'center', padding: '8px', background: 'var(--bg-glass-hover)', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'var(--color-primary-light)', fontSize: '0.875rem', fontWeight: 500 }}>
                    View Full Profile →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Evidence / Quests */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>🔍 Action Required: Approvals</h2>
            </div>
            
            {pendingApprovals.length === 0 ? (
              <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
                All caught up! No pending items to review.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingApprovals.map((item: any) => (
                  <div key={item.id} className="glass-card" style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      {item.evidenceUrl && <img src={item.evidenceUrl} alt="evidence" style={{ width: 48, height: 48, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{item.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>Submitted by {item.childName} • {item.timeAgo}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>Reject</button>
                      <button className="btn btn-primary" style={{ padding: '6px 12px', fontSize: '0.8125rem' }}>Approve (+{item.xpReward} XP)</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Actions & Compliance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Quick Actions */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>⚡ Command Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <a href="/dashboard/weekly-plan" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 12, textDecoration: 'none' }}>
                🗓️ Draft Weekly Plan
              </a>
              <a href="/dashboard/quests/new" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 12, textDecoration: 'none' }}>
                ⚔️ Assign Custom Quest
              </a>
              <a href="/dashboard/ventures/escrow" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 12, textDecoration: 'none' }}>
                💰 Review Escrow Holds
              </a>
              <a href="/dashboard/safety" className="btn btn-outline" style={{ display: 'flex', justifyContent: 'flex-start', padding: 12, textDecoration: 'none' }}>
                🛡️ AI Safety Monitor
              </a>
            </div>
          </div>

          {/* Compliance & Audit */}
          <div className="glass-card" style={{ padding: 24, background: 'rgba(236,72,153,0.05)', border: '1px solid rgba(236,72,153,0.2)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>🔐</span> Security & Ledger
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
              UDB strictly follows COPPA and GDPR. All approvals, family links, and point ledger transactions are permanently logged to the WORM audit log.
            </p>
            <a href="/dashboard/family/audit" style={{ color: '#EC4899', fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
              View Immutable Audit Log →
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
