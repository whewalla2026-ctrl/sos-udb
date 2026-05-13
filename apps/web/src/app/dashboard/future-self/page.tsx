'use client';
import { useLazyQuery } from '@apollo/client';
import { FUTURE_SELF_NARRATIVE } from '../../../lib/queries';

export default function FutureSelfPage() {
  var [getNarrative, { data, loading, error }] = useLazyQuery(FUTURE_SELF_NARRATIVE, { fetchPolicy: 'network-only' });
  var narrative = data?.futureSelfNarrative || '';

  return (
    <div className="fade-in auth-layout" style={{ minHeight: 'calc(100vh - 64px)', borderRadius: 'var(--radius-lg)' }}>
      <div className="auth-card scale-in" style={{ maxWidth: 700, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>🔮</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: 16, background: 'linear-gradient(135deg, #A78BFA 0%, #67E8F9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Future Self Simulator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: 32 }}>
          Our AI analyzes your current habits, skill gaps, and venture progress to generate a highly realistic &quot;Day in the Life&quot; story of you at age 30.
        </p>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 'var(--radius-md)', color: 'var(--color-danger)', fontSize: '0.875rem', marginBottom: 16 }}>
            Failed to generate narrative. Please try again.
          </div>
        )}

        {!narrative ? (
          <button id="simulate-future-btn" className="btn btn-primary btn-lg" onClick={() => getNarrative()} disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                Simulating Timelines...
              </span>
            ) : 'Simulate My Future'}
          </button>
        ) : (
          <div className="fade-in" style={{ textAlign: 'left', background: 'var(--bg-glass)', border: '1px solid var(--color-primary-light)', borderRadius: 'var(--radius-lg)', padding: 32, position: 'relative' }}>
            <div style={{ position: 'absolute', top: -15, left: 32, background: 'var(--bg-base)', padding: '0 10px', color: 'var(--color-primary-light)', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Your Timeline — Age 30
            </div>
            <p style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--text-primary)' }}>
              {narrative}
            </p>
            <div style={{ marginTop: 24, borderTop: '1px solid var(--bg-glass-border)', paddingTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => getNarrative()}>Regenerate</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
