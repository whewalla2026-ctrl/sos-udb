'use client';
import { useQuery } from '@apollo/client';
import { GET_MY_SAFETY_SCORE } from '../../../lib/queries';

export default function SafetyPage() {
  var { data: safetyData, loading } = useQuery(GET_MY_SAFETY_SCORE);

  var safety = safetyData?.mySafetyScore;
  var score = safety?.score ?? 100;
  var alerts = safety?.alerts || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Safety Guardian</h1>
        <p className="page-subtitle">AI monitoring for bullying, grooming, and mental health risks</p>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading safety data...</div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: 24, borderTop: `4px solid ${score >= 70 ? 'var(--color-success)' : 'var(--color-danger)'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Safety Score: {score}/100</h2>
                <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
                  {alerts.length === 0 ? 'No flags detected in recent messages.' : `${alerts.length} active alert(s)`}
                </p>
              </div>
              <div style={{ fontSize: '3rem' }}>{score >= 70 ? '✅' : '⚠️'}</div>
            </div>
          </div>

          {alerts.length > 0 && (
            <div className="glass-card" style={{ padding: 24, marginTop: 16, borderTop: '4px solid var(--color-danger)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 12, color: 'var(--color-danger)' }}>Active Alerts</h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {alerts.map(function(a: string, i: number) {
                  return <li key={i} style={{ padding: '8px 12px', background: 'rgba(220,38,38,0.1)', borderRadius: 'var(--radius-sm)', color: 'var(--color-danger)', fontSize: '0.875rem' }}>⚠ {a}</li>;
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
