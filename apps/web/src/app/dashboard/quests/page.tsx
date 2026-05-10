'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_DATA, GET_ME } from '../../../lib/queries';

const PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

type Pillar = keyof typeof PILLAR_COLORS;
type QuestStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

type Quest = {
  id: string;
  title: string;
  pillar: Pillar;
  status: QuestStatus;
  xpReward: number;
  coinReward: number;
  progress: number;
  dueDate: string;
  isChunk: boolean;
};

var FALLBACK_QUESTS: Quest[] = [
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

function clampInt(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export default function QuestsPage() {
  var { data: dashData, loading } = useQuery(GET_DASHBOARD_DATA);
  var [filter, setFilter] = useState<FilterType>('ALL');
  var [showNewQuest, setShowNewQuest] = useState(false);
  var [newTitle, setNewTitle] = useState('');
  var [newPillar, setNewPillar] = useState('ACADEMIC');

  var [quests, setQuests] = useState<Quest[]>(FALLBACK_QUESTS);
  var [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  var [progressModal, setProgressModal] = useState<{ questId: string } | null>(null);
  var [progressDraft, setProgressDraft] = useState(0);

  useEffect(function() {
    if (dashData?.dashboardData?.quests) {
      setQuests(dashData.dashboardData.quests);
    }
  }, [dashData]);

  var showToast = function(title: string, body?: string) {
    setToast({ title, body });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(function() { setToast(null); }, 2600);
  };

  var filtered = quests.filter(function(q) { return filter === 'ALL' || q.status === filter; });

  const createQuest = () => {
    const title = newTitle.trim() || 'New Quest';
    const pillar = (newPillar as Pillar) || 'ACADEMIC';
    const newQuest: Quest = {
      id: `q-${Date.now()}`,
      title,
      pillar,
      status: 'PENDING',
      xpReward: 120,
      coinReward: 60,
      progress: 0,
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().slice(0, 10),
      isChunk: false,
    };
    setQuests((prev) => [newQuest, ...prev]);
    setShowNewQuest(false);
    setNewTitle('');
    setNewPillar('ACADEMIC');
    showToast('Quest created', `${title} • ${pillar.toLowerCase()}`);
  };

  const startQuest = (questId: string) => {
    setQuests((prev) =>
      prev.map((q) => (q.id === questId ? { ...q, status: 'IN_PROGRESS', progress: Math.max(q.progress, 5) } : q)),
    );
    const q = quests.find((x) => x.id === questId);
    showToast('Quest started', q?.title);
  };

  const submitEvidence = (questId: string) => {
    const ok = window.confirm('Submit evidence for review? (Demo: marks as Submitted)');
    if (!ok) return;
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, status: 'SUBMITTED', progress: 100 } : q)));
    const q = quests.find((x) => x.id === questId);
    showToast('Evidence submitted', q?.title);
  };

  const openProgress = (questId: string) => {
    const q = quests.find((x) => x.id === questId);
    if (!q) return;
    setProgressDraft(q.progress);
    setProgressModal({ questId });
  };

  const saveProgress = () => {
    const questId = progressModal?.questId;
    if (!questId) return;
    const pct = clampInt(progressDraft, 0, 100);
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, progress: pct } : q)));
    const q = quests.find((x) => x.id === questId);
    setProgressModal(null);
    showToast('Progress updated', `${q?.title ?? 'Quest'} • ${pct}%`);
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">⚔️ My Quests</h1>
          <p className="page-subtitle">
            {quests.filter(q => q.status === 'IN_PROGRESS').length} active · {quests.filter(q => q.status === 'APPROVED').length} completed this week
          </p>
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
            {f === 'ALL' ? 'All' : f.replace('_', ' ')} {f === 'ALL' ? `(${quests.length})` : `(${quests.filter(q => q.status === f).length})`}
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
                <button id="create-quest-submit" className="btn btn-primary" style={{ flex: 2 }} onClick={createQuest}>Create Quest</button>
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
                  <button className="btn btn-primary btn-sm" id={`submit-quest-${q.id}`} onClick={() => submitEvidence(q.id)}>📤 Submit Evidence</button>
                  <button className="btn btn-ghost btn-sm" id={`update-progress-${q.id}`} onClick={() => openProgress(q.id)}>✏️ Update Progress</button>
                </div>
              )}
              {q.status === 'PENDING' && (
                <button className="btn btn-secondary btn-sm" style={{ marginTop: 16 }} id={`start-quest-${q.id}`} onClick={() => startQuest(q.id)}>▶️ Start Quest</button>
              )}
              {q.status === 'APPROVED' && (
                <div className="badge badge-success" style={{ marginTop: 12, display: 'inline-flex' }}>✓ Completed — XP & Coins awarded!</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Update Progress Modal */}
      {progressModal && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            zIndex: 200,
          }}
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setProgressModal(null);
          }}
        >
          <div className="glass-card" style={{ width: 'min(560px, 100%)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Update progress</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Demo mode</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setProgressModal(null)} aria-label="Close modal">✕</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>Progress</span>
                <span style={{ color: 'var(--color-primary-light)', fontWeight: 800 }}>{clampInt(progressDraft, 0, 100)}%</span>
              </label>
              <input
                id="progress-range"
                type="range"
                min={0}
                max={100}
                value={progressDraft}
                onChange={(e) => setProgressDraft(clampInt(Number(e.target.value), 0, 100))}
              />
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${clampInt(progressDraft, 0, 100)}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setProgressModal(null)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={saveProgress} id="save-progress-btn">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 250, maxWidth: 360 }}>
          <div className="glass-card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{toast.title}</div>
            {toast.body && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{toast.body}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
