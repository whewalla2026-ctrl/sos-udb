'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_GOALS, CREATE_GOAL } from '../../../lib/queries';

type Goal = {
  id: string;
  title: string;
  pillar: 'ACADEMIC' | 'BIOMETRIC' | 'GAMIFICATION' | 'ENTREPRENEURSHIP' | 'SOCIAL' | 'LIFE_SKILLS';
  currentWeight: number;
  targetWeight: number;
  dueDate: string;
};

const PILLAR_COLORS: Record<Goal['pillar'], string> = {
  ACADEMIC: '#06B6D4',
  BIOMETRIC: '#10B981',
  GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B',
  SOCIAL: '#EC4899',
  LIFE_SKILLS: '#6366F1',
};

var FALLBACK_GOALS: Goal[] = [
  { id: '1', title: 'Math Proficiency', pillar: 'ACADEMIC', currentWeight: 35, targetWeight: 100, dueDate: '2026-06-30' },
  { id: '2', title: 'Healthy Habits Master', pillar: 'BIOMETRIC', currentWeight: 68, targetWeight: 100, dueDate: '2026-05-30' },
];

function clampInt(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export default function GoalsPage() {
  var { data: goalsData, loading } = useQuery(GET_MY_GOALS);
  var [createGoalMutation] = useMutation(CREATE_GOAL);
  var [goals, setGoals] = useState<Goal[]>(FALLBACK_GOALS);
  var [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  var [isModalOpen, setIsModalOpen] = useState(false);
  var [draft, setDraft] = useState<Omit<Goal, 'id' | 'currentWeight'>>({
    title: '',
    pillar: 'ACADEMIC',
    targetWeight: 100,
    dueDate: '2026-06-30',
  });

  useEffect(function() {
    if (goalsData?.myGoals) {
      setGoals(goalsData.myGoals);
    }
  }, [goalsData]);

  var showToast = function(title: string, body?: string) {
    setToast({ title, body });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(function() { setToast(null); }, 2600);
  };

  var summary = useMemo(function() {
    var avg = goals.length
      ? Math.round(goals.reduce(function(acc, g) { return acc + (g.targetWeight ? (g.currentWeight / g.targetWeight) * 100 : 0); }, 0) / goals.length)
      : 0;
    return { count: goals.length, avgPct: avg };
  }, [goals]);

  var createGoal = function() {
    var safeTitle = draft.title.trim() || 'New Goal';
    var safeTarget = clampInt(Number(draft.targetWeight), 10, 1000);
    var safeDue = draft.dueDate || new Date().toISOString().slice(0, 10);
    var newGoal: Goal = {
      id: 'goal-' + Date.now(),
      title: safeTitle,
      pillar: draft.pillar,
      currentWeight: 0,
      targetWeight: safeTarget,
      dueDate: safeDue,
    };
    createGoalMutation({ variables: { pillar: draft.pillar, title: safeTitle } }).catch(function(e) { console.error(e); });
    setGoals(function(prev) { return [newGoal, ...prev]; });
    setIsModalOpen(false);
    setDraft({ title: '', pillar: 'ACADEMIC', targetWeight: 100, dueDate: safeDue });
    showToast('Goal created', newGoal.title + ' • due ' + newGoal.dueDate);
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🎯 My Goals</h1>
          <p className="page-subtitle">
            Long term milestones. Complete linked quests to gain mastery weight. ({summary.count} goals · {summary.avgPct}% avg)
          </p>
        </div>
        <button className="btn btn-primary" id="new-goal-btn" onClick={() => setIsModalOpen(true)}>+ New Goal</button>
      </div>

      <div className="grid-cards">
        {goals.map(g => {
          const pct = Math.round((g.currentWeight / g.targetWeight) * 100);
          return (
            <div key={g.id} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{g.title}</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 4 }}>Due {g.dueDate}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary-light)' }}>{pct}%</div>
              </div>
              <div className="progress-track" style={{ height: 12 }}>
                <div className="progress-fill" style={{ width: `${pct}%`, background: PILLAR_COLORS[g.pillar] }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>{g.currentWeight} mastery</span>
                <span>{g.targetWeight} target</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* New Goal Modal (demo) */}
      {isModalOpen && (
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
            if (e.currentTarget === e.target) setIsModalOpen(false);
          }}
        >
          <div className="glass-card" style={{ width: 'min(560px, 100%)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>Create a new goal</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Saved to database via API</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)} aria-label="Close modal">✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Goal title</label>
                <input
                  className="input"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                  placeholder="e.g., Improve reading speed"
                  autoFocus
                  id="goal-title-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Due date</label>
                <input
                  className="input"
                  type="date"
                  value={draft.dueDate}
                  onChange={(e) => setDraft((d) => ({ ...d, dueDate: e.target.value }))}
                  id="goal-due-input"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Target mastery</label>
                <input
                  className="input"
                  type="number"
                  min={10}
                  max={1000}
                  value={draft.targetWeight}
                  onChange={(e) => setDraft((d) => ({ ...d, targetWeight: clampInt(Number(e.target.value), 10, 1000) }))}
                  id="goal-target-input"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Pillar</label>
                <select
                  className="input"
                  value={draft.pillar}
                  onChange={(e) => setDraft((d) => ({ ...d, pillar: e.target.value as Goal['pillar'] }))}
                  id="goal-pillar-select"
                >
                  {Object.keys(PILLAR_COLORS).map((p) => (
                    <option key={p} value={p}>
                      {p.toLowerCase().replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={createGoal} id="goal-create-submit">Create goal</button>
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
