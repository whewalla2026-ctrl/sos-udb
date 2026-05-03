'use client';

const MOCK_GOALS = [
  { id: '1', title: 'Math Proficiency', pillar: 'ACADEMIC', currentWeight: 35, targetWeight: 100, dueDate: '2026-06-30' },
  { id: '2', title: 'Healthy Habits Master', pillar: 'BIOMETRIC', currentWeight: 68, targetWeight: 100, dueDate: '2026-05-30' },
];

export default function GoalsPage() {
  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🎯 My Goals</h1>
          <p className="page-subtitle">Long term milestones. Complete linked quests to gain mastery weight.</p>
        </div>
        <button className="btn btn-primary">+ New Goal</button>
      </div>

      <div className="grid-cards">
        {MOCK_GOALS.map(g => {
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
                <div className="progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                <span>{g.currentWeight} mastery</span>
                <span>{g.targetWeight} target</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
