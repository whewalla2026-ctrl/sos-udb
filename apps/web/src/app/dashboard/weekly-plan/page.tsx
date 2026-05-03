'use client';
import { useState } from 'react';

const PILLAR_COLORS: Record<string, string> = {
  ACADEMIC: '#06B6D4', BIOMETRIC: '#10B981', GAMIFICATION: '#7C3AED',
  ENTREPRENEURSHIP: '#F59E0B', SOCIAL: '#EC4899', LIFE_SKILLS: '#6366F1',
};

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_PLAN = {
  generated: true,
  weekLabel: 'May 5 – May 11, 2026',
  focusPillars: ['ACADEMIC', 'BIOMETRIC'],
  days: [
    { day: 'Mon', activities: [
      { title: 'Deep Work: Fractions Practice', pillar: 'ACADEMIC', duration: 45, time: '09:00', isDeepWork: true },
      { title: 'Physical Activity: Cycling', pillar: 'BIOMETRIC', duration: 30, time: '16:00', isDeepWork: false },
    ]},
    { day: 'Tue', activities: [
      { title: 'Reading: 2 Chapters', pillar: 'ACADEMIC', duration: 30, time: '09:00', isDeepWork: false },
      { title: 'Meditation & Breathing', pillar: 'BIOMETRIC', duration: 15, time: '07:30', isDeepWork: false },
    ]},
    { day: 'Wed', activities: [
      { title: 'AI Tutor: Algebra Session', pillar: 'ACADEMIC', duration: 40, time: '10:00', isDeepWork: true },
      { title: 'Soccer Practice', pillar: 'BIOMETRIC', duration: 60, time: '16:30', isDeepWork: false },
    ]},
    { day: 'Thu', activities: [
      { title: 'Business Plan: Market Research', pillar: 'ENTREPRENEURSHIP', duration: 45, time: '09:00', isDeepWork: false },
      { title: 'Sleep Journal', pillar: 'BIOMETRIC', duration: 10, time: '21:30', isDeepWork: false },
    ]},
    { day: 'Fri', activities: [
      { title: 'Science Project Review', pillar: 'ACADEMIC', duration: 50, time: '09:00', isDeepWork: true },
      { title: 'Creative Drawing', pillar: 'SOCIAL', duration: 30, time: '15:00', isDeepWork: false },
    ]},
    { day: 'Sat', activities: [
      { title: 'Family Skill Challenge', pillar: 'SOCIAL', duration: 60, time: '11:00', isDeepWork: false },
      { title: 'Nature Walk', pillar: 'BIOMETRIC', duration: 45, time: '09:00', isDeepWork: false },
    ]},
    { day: 'Sun', activities: [
      { title: 'Sunday Planning Ritual', pillar: 'GAMIFICATION', duration: 20, time: '18:00', isDeepWork: false },
      { title: 'Book Reading', pillar: 'ACADEMIC', duration: 30, time: '20:00', isDeepWork: false },
    ]},
  ],
};

export default function WeeklyPlanPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [plan, setPlan] = useState(MOCK_PLAN);
  const [activeDay, setActiveDay] = useState(0);

  const generate = () => {
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); }, 2000);
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🗓️ Weekly Planning Ritual</h1>
          <p className="page-subtitle">AI-guided weekly plan optimized for your skill gaps and energy levels</p>
        </div>
        <button id="generate-plan-btn" className="btn btn-primary" onClick={generate} disabled={isGenerating}>
          {isGenerating ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              AI is planning…
            </span>
          ) : '✨ Generate AI Plan'}
        </button>
      </div>

      {/* Focus Pillars */}
      <div className="glass-card" style={{ padding: 20, marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>This week's focus:</span>
        {plan.focusPillars.map(p => (
          <span key={p} className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[p] }}>{p.toLowerCase()}</span>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plan.weekLabel}</span>
      </div>

      {/* Day Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {DAYS.map((d, i) => (
          <button key={d} id={`day-tab-${d.toLowerCase()}`} onClick={() => setActiveDay(i)}
            style={{ flex: 1, padding: '10px 6px', borderRadius: 'var(--radius-md)', border: `2px solid ${activeDay === i ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`, background: activeDay === i ? 'rgba(124,58,237,0.2)' : 'var(--bg-glass)', color: activeDay === i ? 'var(--color-primary-light)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}>
            {d}
          </button>
        ))}
      </div>

      {/* Active Day Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>{DAYS[activeDay]}'s Schedule</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.days[activeDay]?.activities.map((act, i) => (
              <div key={i} className="glass-card" style={{ padding: 20, borderLeft: `3px solid ${PILLAR_COLORS[act.pillar]}` }} id={`activity-${activeDay}-${i}`}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{act.title}</span>
                      {act.isDeepWork && <span style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--color-primary-light)', fontSize: '0.6875rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>🧠 DEEP WORK</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span className="pillar-tag" style={{ ['--pillar-color' as any]: PILLAR_COLORS[act.pillar] }}>{act.pillar.toLowerCase()}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>🕐 {act.time} · {act.duration}min</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px' }}>✏️</button>
                    <button className="btn btn-ghost btn-sm" style={{ padding: '4px 10px', color: 'var(--color-danger)' }}>🗑</button>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }} id="add-activity-btn">+ Add Activity</button>
          </div>
        </div>

        {/* Week Overview */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14, color: 'var(--text-secondary)' }}>Week Overview</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.days.map((d, i) => (
              <div key={d.day} onClick={() => setActiveDay(i)}
                style={{ cursor: 'pointer', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `1px solid ${activeDay === i ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`, background: activeDay === i ? 'rgba(124,58,237,0.1)' : 'var(--bg-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: activeDay === i ? 'var(--color-primary-light)' : 'var(--text-primary)' }}>{d.day}</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {d.activities.map((a, j) => (
                    <div key={j} style={{ width: 8, height: 8, borderRadius: '50%', background: PILLAR_COLORS[a.pillar] }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button id="finalize-plan-btn" className="btn btn-primary w-full" style={{ marginTop: 20 }}>✅ Finalize Week Plan</button>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>Syncs to your calendar and Doter</p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
