'use client';

const MOCK_GAPS = [
  { subject: 'Reading Comprehension', score: 0.80, status: 'Mastered' },
  { subject: 'Algebra', score: 0.45, status: 'Developing' },
  { subject: 'Fractions', score: 0.22, status: 'Critical' },
];

export default function AcademicPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🎓 Academic Mastery</h1>
        <p className="page-subtitle">NWEA MAP scores & LMS integrations</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>Skill Gap Analysis</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {MOCK_GAPS.map(g => (
              <div key={g.subject}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 500 }}>{g.subject}</span>
                  <span style={{ color: g.score < 0.3 ? 'var(--color-danger)' : g.score < 0.6 ? 'var(--color-gold)' : 'var(--color-success)' }}>
                    {g.status} ({Math.round(g.score * 100)}%)
                  </span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${g.score * 100}%`, background: g.score < 0.3 ? 'var(--color-danger)' : g.score < 0.6 ? 'var(--color-gold)' : 'var(--color-success)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>RIT Scores</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="stat-card" style={{ padding: 16 }}>
              <div className="stat-value" style={{ color: 'var(--color-accent)' }}>215</div>
              <div className="stat-label">Math RIT (Target: 220)</div>
            </div>
            <div className="stat-card" style={{ padding: 16 }}>
              <div className="stat-value" style={{ color: 'var(--color-primary-light)' }}>220</div>
              <div className="stat-label">Reading RIT (Target: 215)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
