'use client';

export default function DoterPage() {
  const doter = { name: 'Sparky', state: 'JUVENILE', level: 8, xp: 7200, xpNext: 8000, streakDays: 12, isEnergetic: true };
  const xpPct = Math.round((doter.xp / doter.xpNext) * 100);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🐣 My Doter</h1>
        <p className="page-subtitle">Your digital companion. As you grow, {doter.name} evolves.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 24, alignItems: 'start' }}>
        {/* Main Doter Display */}
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', background: 'var(--gradient-card)' }}>
          <div className="doter-container doter-state-energetic" style={{ marginBottom: 40, transform: 'scale(1.2)' }}>
            <div className="doter-orb" style={{ width: 160, height: 160, fontSize: '4rem' }}>🐣</div>
          </div>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: 4 }}>{doter.name}</h2>
          <div className="badge badge-primary" style={{ marginBottom: 24, fontSize: '0.875rem', padding: '4px 12px' }}>{doter.state} · Level {doter.level}</div>

          <div style={{ textAlign: 'left', marginBottom: 24 }}>
            <div className="xp-bar-label">
              <span className="xp-bar-level">XP Progress</span>
              <span className="xp-bar-text">{doter.xp.toLocaleString()} / {doter.xpNext.toLocaleString()}</span>
            </div>
            <div className="progress-track" style={{ height: 12 }}>
              <div className="progress-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 8, textAlign: 'center' }}>
              Only {doter.xpNext - doter.xp} XP to reach ADOLESCENT state!
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>🔥</div>
              <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{doter.streakDays} Days</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Streak</div>
            </div>
            <div style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', padding: 12, borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>⚡</div>
              <div style={{ fontWeight: 700, color: 'var(--color-accent)' }}>Energetic</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Current Buff</div>
            </div>
          </div>
        </div>

        {/* Info & Shop */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Evolution Path */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 20 }}>Evolution Path</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 20, left: 20, right: 20, height: 4, background: 'var(--bg-glass-border)', zIndex: 0 }} />
              <div style={{ position: 'absolute', top: 20, left: 20, width: '40%', height: 4, background: 'var(--gradient-primary)', zIndex: 1 }} />
              
              {[
                { s: 'EGG', icon: '🥚', done: true }, { s: 'HATCHLING', icon: '🐥', done: true },
                { s: 'JUVENILE', icon: '🐣', active: true }, { s: 'ADOLESCENT', icon: '🦅', future: true },
                { s: 'ADULT', icon: '🦁', future: true }, { s: 'LEGENDARY', icon: '🐉', future: true }
              ].map(st => (
                <div key={st.s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 2 }}>
                  <div style={{ 
                    width: 44, height: 44, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
                    background: st.active ? 'var(--gradient-primary)' : st.done ? 'var(--bg-elevated)' : 'var(--bg-base)',
                    border: `2px solid ${st.active ? 'var(--color-primary-light)' : st.done ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`,
                    boxShadow: st.active ? 'var(--shadow-glow-primary)' : 'none',
                    opacity: st.future ? 0.5 : 1
                  }}>
                    {st.icon}
                  </div>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: st.active ? 'var(--color-primary-light)' : 'var(--text-muted)' }}>{st.s}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Buffs & Debuffs */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12 }}>Active Effects</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 16, background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '2rem' }}>⚡</div>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--color-accent)' }}>Energetic Buff Applied!</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>You slept over 8 hours last night. All XP earned today is boosted by 10%!</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
