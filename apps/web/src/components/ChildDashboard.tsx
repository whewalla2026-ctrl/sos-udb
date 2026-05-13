'use client';

const PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

export function ChildDashboard({ data }: { data: any }) {
  const d = data;
  const doter = d.doter || { name: 'Doter', state: 'EGG', level: 1, xp: 0, xpNext: 1000, coinBalance: 0, streakDays: 0, isEnergetic: false, isSluggy: false };
  const user = d.user || { displayName: 'User', role: 'CHILD' };
  const xpPct = doter.xpNext > 0 ? Math.round((doter.xp / doter.xpNext) * 100) : 0;
  const biometric = d.biometric || {};
  const quests = d.quests || [];
  const goals = d.goals || [];
  const notifications = d.notifications || [];

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title" id="dashboard-greeting">
            Good morning, {user.displayName.split(' ')[0]}! 👋
          </h1>
          <p className="page-subtitle">Here's your developmental snapshot for today.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="badge badge-success">🔥 {doter.streakDays || 0} Day Streak</div>
          <div className="badge badge-gold">🪙 {(doter.coinBalance || 0).toLocaleString()} Coins</div>
        </div>
      </div>

      {/* ── Top Row: Doter + Stats ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, marginBottom: 24 }}>
        {/* Doter Card */}
        <div className="glass-card" style={{ padding: 28, textAlign: 'center' }} id="doter-card">
          <div className={`doter-container ${doter.isEnergetic ? 'doter-state-energetic' : ''} ${doter.isSluggy ? 'doter-state-slug' : ''}`}>
            <div className="doter-orb">🐣</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700 }}>{doter.name}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textTransform: 'capitalize', marginTop: 2 }}>{(doter.state || 'egg').toLowerCase()} · Lv {doter.level}</div>
            </div>
            {doter.isEnergetic && <div className="badge badge-success" style={{ fontSize: '0.75rem' }}>⚡ Energetic</div>}
            {doter.isSluggy && <div className="badge badge-danger" style={{ fontSize: '0.75rem' }}>😴 Sluggish</div>}
          </div>

          {/* XP Bar */}
          <div style={{ marginTop: 20 }}>
            <div className="xp-bar-label">
              <span className="xp-bar-level">LV {doter.level}</span>
              <span className="xp-bar-text">{(doter.xp || 0).toLocaleString()} / {(doter.xpNext || 1000).toLocaleString()} XP</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${xpPct}%` }} />
            </div>
            <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(doter.xpNext || 1000) - (doter.xp || 0)} XP to evolve</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[
            { icon: '😴', label: 'Sleep Last Night', value: `${biometric.sleepHours || '—'}h`, unit: '', color: '#10B981', note: (biometric.sleepHours || 0) >= 8 ? '✓ Excellent' : '⚠ Below 8h' },
            { icon: '🧠', label: 'Focus Score', value: biometric.focusScore || '—', unit: '/100', color: '#7C3AED', note: 'from latest reading' },
            { icon: '💆', label: 'Stress Level', value: biometric.stressLevel != null ? `${biometric.stressLevel}%` : '—', unit: '', color: '#06B6D4', note: 'from latest reading' },
            { icon: '👟', label: 'Steps Today', value: biometric.steps ? biometric.steps.toLocaleString() : '—', unit: '', color: '#F59E0B', note: biometric.steps ? 'tracking active' : 'no data' },
          ].map(stat => (
            <div key={stat.label} className="stat-card" id={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <span style={{ fontSize: '1.75rem' }}>{stat.icon}</span>
                <span style={{ fontSize: '0.6875rem', color: stat.color, fontWeight: 600, background: `${stat.color}20`, padding: '2px 8px', borderRadius: 99 }}>{stat.note}</span>
              </div>
              <div className="stat-value" style={{ color: stat.color }}>{stat.value}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{stat.unit}</span></div>
              <div className="stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Quests ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>⚔️ Active Quests</h2>
            <a href="/dashboard/quests" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {quests.map((q: any) => (
              <div key={q.id} className={`quest-card ${q.status.toLowerCase()}`} id={`quest-${q.id}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{q.title}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[q.pillar] }}>{q.pillar.toLowerCase()}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--color-gold)' }}>+{q.xpReward} XP</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{q.coinReward} 🪙</div>
                  </div>
                </div>
                {q.progress > 0 && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Progress</span><span>{q.progress}%</span>
                    </div>
                    <div className="progress-track" style={{ height: 5 }}>
                      <div className="progress-fill" style={{ width: `${q.progress}%`, background: PILLAR_COLORS[q.pillar] }} />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Goals */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>🎯 Goal Progress</h2>
            <a href="/dashboard/goals" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>View all →</a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {goals.map((g: any) => {
              const pct = g.targetWeight > 0 ? Math.round((g.currentWeight / g.targetWeight) * 100) : 0;
              return (
                <div key={g.id} className="glass-card" style={{ padding: 20 }} id={`goal-${g.id}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{g.title}</div>
                      <span className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[g.pillar], marginTop: 4, display: 'inline-flex' }}>{g.pillar.toLowerCase()}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: PILLAR_COLORS[g.pillar] }}>{pct}%</div>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: PILLAR_COLORS[g.pillar] }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>{g.currentWeight} / {g.targetWeight} mastery points</div>
                </div>
              );
            })}
            {d.skillGaps && Object.keys(d.skillGaps).length > 0 && (
              <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)', padding: 16 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#FCA5A5', marginBottom: 4 }}>
                  Critical Gap: {Object.entries(d.skillGaps).sort(([,a]: any, [,b]: any) => a - b).slice(0, 1).map(([k, v]: [string, any]) => `${k} (${Math.round(v * 100)}%)`)}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Recommended: Start a quest to improve this skill</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Notifications + Quick Actions ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Recent Notifications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notifications.length === 0 ? (
              <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>No notifications yet</div>
            ) : notifications.map((n: any) => (
              <div key={n.id} className="glass-card" style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }} id={`notif-${n.id}`}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-primary-light)', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{n.title}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 2 }}>{n.body}</div>
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>{n.createdAt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>⚡ Quick Actions</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { href: '/dashboard/tutor', icon: '🧠', label: 'Ask AI Tutor', color: '#7C3AED' },
              { href: '/dashboard/weekly-plan', icon: '🗓️', label: 'Plan My Week', color: '#06B6D4' },
              { href: '/dashboard/quests', icon: '⚔️', label: 'New Quest', color: '#10B981' },
              { href: '/dashboard/evidence', icon: '📸', label: 'Log Evidence', color: '#F59E0B' },
              { href: '/dashboard/biometric', icon: '💓', label: 'Log Health', color: '#EC4899' },
              { href: '/dashboard/future-self', icon: '🔮', label: 'Future Self', color: '#A78BFA' },
            ].map(a => (
              <a key={a.label} href={a.href} style={{ textDecoration: 'none' }} id={`quick-${a.label.toLowerCase().replace(/\s+/g, '-')}`}>
                <div style={{ background: `${a.color}15`, border: `1px solid ${a.color}30`, borderRadius: 'var(--radius-md)', padding: '16px 14px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', transition: 'all 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${a.color}25`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${a.color}15`)}>
                  <span style={{ fontSize: '1.25rem' }}>{a.icon}</span>
                  <span style={{ color: a.color, fontWeight: 600, fontSize: '0.875rem' }}>{a.label}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
