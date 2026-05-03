'use client';
import { useState } from 'react';

const PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

const MOCK_QUESTS = [
  { id: '1', title: 'Complete 10 Fraction Worksheets', pillar: 'ACADEMIC', status: 'IN_PROGRESS', xpReward: 200, coinReward: 100, progress: 60, dueDate: '2026-05-10', isChunk: false },
  { id: '2', title: 'Sleep 8+ Hours for 5 Days', pillar: 'BIOMETRIC', status: 'IN_PROGRESS', xpReward: 150, coinReward: 75, progress: 80, dueDate: '2026-05-08', isChunk: false },
  { id: '3', title: 'Read 1 Chapter of Your Book', pillar: 'ACADEMIC', status: 'PENDING', xpReward: 100, coinReward: 50, progress: 0, dueDate: '2026-05-04', isChunk: false },
  { id: '4', title: 'Make Your Bed for a Week', pillar: 'LIFE_SKILLS', status: 'APPROVED', xpReward: 120, coinReward: 60, progress: 100, dueDate: '2026-05-03', isChunk: false },
  { id: '5', title: 'Lemonade Stand Business Plan', pillar: 'ENTREPRENEURSHIP', status: 'SUBMITTED', xpReward: 300, coinReward: 150, progress: 100, dueDate: '2026-05-07', isChunk: false },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Pending', color: '#A78BFA', bg: 'rgba(167,139,250,0.15)' },
  IN_PROGRESS: { label: 'In Progress', color: '#67E8F9', bg: 'rgba(103,232,249,0.15)' },
  SUBMITTED: { label: 'Submitted', color: '#FCD34D', bg: 'rgba(252,211,77,0.15)' },
  APPROVED: { label: 'Approved', color: '#6EE7B7', bg: 'rgba(110,231,183,0.15)' },
  REJECTED: { label: 'Rejected', color: '#FCA5A5', bg: 'rgba(252,165,165,0.15)' },
};

type FilterType = 'ALL' | 'IN_PROGRESS' | 'PENDING' | 'SUBMITTED' | 'APPROVED';

export default function QuestsPage() {
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showNewQuest, setShowNewQuest] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPillar, setNewPillar] = useState('ACADEMIC');

  const filtered = MOCK_QUESTS.filter(q => filter === 'ALL' || q.status === filter);

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">⚔️ My Quests</h1>
          <p className="page-subtitle">{MOCK_QUESTS.filter(q => q.status === 'IN_PROGRESS').length} active · {MOCK_QUESTS.filter(q => q.status === 'APPROVED').length} completed this week</p>
        </div>
        <button id="new-quest-btn" className="btn btn-primary" onClick={() => setShowNewQuest(true)}>+ New Quest</button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {(['ALL', 'IN_PROGRESS', 'PENDING', 'SUBMITTED', 'APPROVED'] as FilterType[]).map(f => (
          <button key={f} id={`filter-${f.toLowerCase()}`}
            onClick={() => setFilter(f)}
            style={{ padding: '8px 16px', borderRadius: 99, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.8125rem', transition: 'all 0.2s',
              background: filter === f ? 'var(--gradient-primary)' : 'var(--bg-glass)',
              color: filter === f ? 'white' : 'var(--text-secondary)',
              boxShadow: filter === f ? '0 4px 12px rgba(124,58,237,0.35)' : 'none',
            }}
          >
            {f === 'ALL' ? 'All' : f.replace('_', ' ')} {f === 'ALL' ? `(${MOCK_QUESTS.length})` : `(${MOCK_QUESTS.filter(q => q.status === f).length})`}
          </button>
        ))}
      </div>

      {/* New Quest Modal */}
      {showNewQuest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(8px)' }}>
          <div className="glass-card scale-in" style={{ padding: 36, maxWidth: 480, width: '90%' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 20 }}>Create New Quest</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Quest Title</label>
                <input id="quest-title-input" className="input" placeholder="What will you accomplish?" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 8 }}>Pillar</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {Object.entries(PILLAR_COLORS).map(([p, c]) => (
                    <button key={p} id={`pillar-${p.toLowerCase()}`} onClick={() => setNewPillar(p)}
                      style={{ padding: '10px 8px', border: `2px solid ${newPillar === p ? c : 'var(--bg-glass-border)'}`, borderRadius: 'var(--radius-md)', background: newPillar === p ? `${c}20` : 'var(--bg-glass)', cursor: 'pointer', color: newPillar === p ? c : 'var(--text-secondary)', fontSize: '0.8125rem', fontWeight: 600, transition: 'all 0.2s' }}>
                      {p.toLowerCase().replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowNewQuest(false)}>Cancel</button>
                <button id="create-quest-submit" className="btn btn-primary" style={{ flex: 2 }} onClick={() => setShowNewQuest(false)}>Create Quest</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered.map(q => {
          const sc = STATUS_CONFIG[q.status];
          return (
            <div key={q.id} className="glass-card" style={{ padding: 24 }} id={`quest-card-${q.id}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, marginRight: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{q.title}</h3>
                    <span style={{ padding: '2px 10px', borderRadius: 99, background: sc.bg, color: sc.color, fontSize: '0.75rem', fontWeight: 600, flexShrink: 0 }}>{sc.label}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[q.pillar] }}>{q.pillar.toLowerCase().replace('_', ' ')}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>📅 Due {q.dueDate}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gold)' }}>+{q.xpReward} XP</div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>+{q.coinReward} 🪙</div>
                </div>
              </div>

              {q.progress > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Progress</span><span style={{ color: PILLAR_COLORS[q.pillar], fontWeight: 600 }}>{q.progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${q.progress}%`, background: PILLAR_COLORS[q.pillar] }} />
                  </div>
                </div>
              )}

              {/* Actions */}
              {q.status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" id={`submit-quest-${q.id}`}>📤 Submit Evidence</button>
                  <button className="btn btn-ghost btn-sm">✏️ Update Progress</button>
                </div>
              )}
              {q.status === 'PENDING' && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} id={`start-quest-${q.id}`}>▶️ Start Quest</button>
              )}
              {q.status === 'APPROVED' && (
                <div className="badge badge-success" style={{ marginTop: 12, display: 'inline-flex' }}>✓ Completed — XP & Coins awarded!</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
