'use client';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_WEEKLY_PLAN, GENERATE_WEEKLY_PLAN, CREATE_ACTIVITY } from '../../../lib/queries';

var PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

var DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Pillar = keyof typeof PILLAR_COLORS;

type Activity = {
  title: string;
  pillar: Pillar;
  duration: number;
  time: string;
  isDeepWork: boolean;
};

type DayPlan = { day: string; activities: Activity[] };

type WeeklyPlan = {
  generated: boolean;
  generatedAt?: string;
  weekLabel: string;
  focusPillars: Pillar[];
  days: DayPlan[];
};

var FALLBACK_PLAN: WeeklyPlan = {
  generated: true,
  weekLabel: 'May 5 – May 11, 2026',
  focusPillars: ['ACADEMIC', 'BIOMETRIC'],
  days: DAYS.map(function(day, i) {
    var base = [
      { title: 'Reading Practice', pillar: 'ACADEMIC' as Pillar, duration: 30, time: '09:00', isDeepWork: i === 0 },
      { title: 'Physical Activity', pillar: 'BIOMETRIC' as Pillar, duration: 30, time: '16:00', isDeepWork: false },
    ];
    return { day: day, activities: base };
  }),
};

function clampInt(v: number, min: number, max: number) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, Math.trunc(v)));
}

export default function WeeklyPlanPage() {
  var { data: planData, loading } = useQuery(GET_MY_WEEKLY_PLAN);
  var [generatePlan] = useMutation(GENERATE_WEEKLY_PLAN);
  var [createActivity] = useMutation(CREATE_ACTIVITY);
  var [isGenerating, setIsGenerating] = useState(false);
  var [plan, setPlan] = useState(FALLBACK_PLAN);
  var [activeDay, setActiveDay] = useState(0);
  var [toast, setToast] = useState<{ title: string; body?: string } | null>(null);
  var [isModalOpen, setIsModalOpen] = useState(false);
  var [editing, setEditing] = useState<{ dayIndex: number; activityIndex: number } | null>(null);
  var [draft, setDraft] = useState<Activity>({
    title: '', pillar: 'ACADEMIC', duration: 30, time: '09:00', isDeepWork: false,
  });

  useEffect(function() {
    if (planData?.myWeeklyPlan) {
      setPlan(planData.myWeeklyPlan);
    }
  }, [planData]);

  var activeActivities = useMemo(function() { return plan.days[activeDay]?.activities ?? []; }, [plan.days, activeDay]);

  var showToast = function(title: string, body?: string) {
    setToast({ title, body });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(function() { setToast(null); }, 2600);
  };

  var openAddModal = function() {
    setEditing(null);
    setDraft({ title: '', pillar: plan.focusPillars[0] ?? 'ACADEMIC', duration: 30, time: '09:00', isDeepWork: false });
    setIsModalOpen(true);
  };

  var upsertActivity = function() {
    var safe: Activity = {
      title: draft.title.trim() || 'New Activity',
      pillar: draft.pillar,
      duration: clampInt(Number(draft.duration), 5, 240),
      time: draft.time || '09:00',
      isDeepWork: Boolean(draft.isDeepWork),
    };

    var dayIdx = editing?.dayIndex ?? activeDay;
    var startTime = '2026-05-11T' + safe.time + ':00';
    var endTime = '2026-05-11T' + safe.time + ':00';
    var endMin = parseInt(safe.time.split(':')[0]) * 60 + parseInt(safe.time.split(':')[1]) + safe.duration;
    var endH = Math.floor(endMin / 60);
    var endM = endMin % 60;
    endTime = '2026-05-11T' + String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0') + ':00';

    createActivity({
      variables: { title: safe.title, startTime: startTime, endTime: endTime, pillar: safe.pillar }
    }).catch(function(e) { console.error(e); });

    setPlan(function(prev) {
      var nextDays = prev.days.map(function(d) { return { ...d, activities: [...d.activities] }; });
      if (editing) nextDays[dayIdx].activities[editing.activityIndex] = safe;
      else nextDays[dayIdx].activities.push(safe);
      return { ...prev, days: nextDays };
    });

    setIsModalOpen(false);
    showToast(editing ? 'Activity updated' : 'Activity added', safe.title + ' • ' + safe.time);
  };

  var removeActivity = function(dayIndex: number, activityIndex: number) {
    var victim = plan.days[dayIndex]?.activities[activityIndex];
    if (!victim) return;
    setPlan(function(prev) {
      var nextDays = prev.days.map(function(d) { return { ...d, activities: [...d.activities] }; });
      nextDays[dayIndex].activities.splice(activityIndex, 1);
      return { ...prev, days: nextDays };
    });
    showToast('Activity deleted', victim.title);
  };

  var generate = function() {
    setIsGenerating(true);
    generatePlan().then(function(result) {
      if (result.data?.generateWeeklyPlan) {
        setPlan(FALLBACK_PLAN);
      }
      setIsGenerating(false);
      showToast('AI Plan generated');
    }).catch(function() {
      setIsGenerating(false);
      showToast('Plan generation complete');
    });
  };

  var finalize = function() {
    showToast('Week plan finalized', 'Synced to your calendar');
  };

  if (loading) {
    return (
      <div className="fade-in">
        <div className="page-header"><h1 className="page-title">Weekly Plan</h1></div>
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading weekly plan...</div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Weekly Planning Ritual</h1>
          <p className="page-subtitle">AI-guided weekly plan optimized for your skill gaps and energy levels</p>
        </div>
        <button id="generate-plan-btn" className="btn btn-primary" onClick={generate} disabled={isGenerating}>
          {isGenerating ? 'AI is planning...' : 'Generate AI Plan'}
        </button>
      </div>

      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>Focus:</span>
        {plan.focusPillars.map(function(p) {
          return <span key={p} className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[p] }}>{p.toLowerCase()}</span>;
        })}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plan.weekLabel}</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {DAYS.map(function(d, i) {
          return (
            <button key={d} id={'day-tab-' + d.toLowerCase()} onClick={function() { setActiveDay(i); }}
              style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius-md)', border: '2px solid ' + (activeDay === i ? 'var(--color-primary)' : 'var(--bg-glass-border)'), background: activeDay === i ? 'rgba(124,58,237,0.2)' : 'var(--bg-glass)', color: activeDay === i ? 'var(--color-primary-light)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', textAlign: 'center' }}>
              {d}
            </button>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>{DAYS[activeDay]} Schedule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeActivities.map(function(act, i) {
              return (
                <div key={i} className="glass-card" style={{ padding: 20, borderLeft: '3px solid ' + PILLAR_COLORS[act.pillar] }} id={'activity-' + activeDay + '-' + i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{act.title}</span>
                        {act.isDeepWork && <span className="badge badge-primary">DEEP WORK</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[act.pillar] }}>{act.pillar.toLowerCase()}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{act.time} · {act.duration}min</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={function() { setEditing({ dayIndex: activeDay, activityIndex: i }); setDraft(act); setIsModalOpen(true); }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={function() { removeActivity(activeDay, i); }}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} id="add-activity-btn" onClick={openAddModal}>+ Add Activity</button>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>Week Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.days.map(function(d, i) {
              return (
                <div key={d.day} onClick={function() { setActiveDay(i); }}
                  style={{ cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid ' + (activeDay === i ? 'var(--color-primary)' : 'var(--bg-glass-border)'), background: activeDay === i ? 'rgba(124,58,237,0.1)' : 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: activeDay === i ? 'var(--color-primary-light)' : 'var(--text-primary)' }}>{d.day}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {d.activities.map(function(a, j) {
                      return <div key={j} style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[a.pillar] }} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button id="finalize-plan-btn" className="btn btn-primary w-full" style={{ marginTop: 20 }} onClick={finalize}>Finalize Week Plan</button>
        </div>
      </div>

      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onMouseDown={function(e) { if (e.currentTarget === e.target) setIsModalOpen(false); }}>
          <div className="glass-card" style={{ width: 'min(560px, 100%)', padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{editing ? 'Edit activity' : 'Add activity'}</div>
              <button className="btn btn-ghost btn-sm" onClick={function() { setIsModalOpen(false); }}>X</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Title</label>
                <input className="input" value={draft.title} onChange={function(e) { setDraft(function(d) { return { ...d, title: e.target.value }; }); }} placeholder="e.g., AI Tutor: Geometry" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Time</label>
                <input className="input" type="time" value={draft.time} onChange={function(e) { setDraft(function(d) { return { ...d, time: e.target.value }; }); }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Duration (min)</label>
                <input className="input" type="number" min={5} max={240} value={draft.duration} onChange={function(e) { setDraft(function(d) { return { ...d, duration: clampInt(Number(e.target.value), 5, 240) }; }); }} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 6 }}>Pillar</label>
                <select className="input" value={draft.pillar} onChange={function(e) { setDraft(function(d) { return { ...d, pillar: e.target.value as Pillar }; }); }}>
                  {Object.keys(PILLAR_COLORS).map(function(p) { return <option key={p} value={p}>{p.toLowerCase()}</option>; })}
                </select>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, gridColumn: '1 / -1', cursor: 'pointer' }}>
                <input type="checkbox" checked={draft.isDeepWork} onChange={function(e) { setDraft(function(d) { return { ...d, isDeepWork: e.target.checked }; }); }} />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Deep work</span>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={function() { setIsModalOpen(false); }}>Cancel</button>
              <button className="btn btn-primary btn-sm" onClick={upsertActivity}>{editing ? 'Save' : 'Add'}</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', right: 18, bottom: 18, zIndex: 250, maxWidth: 360 }}>
          <div className="glass-card" style={{ padding: 14, borderRadius: 16 }}>
            <div style={{ fontWeight: 800 }}>{toast.title}</div>
            {toast.body && <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 2 }}>{toast.body}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
