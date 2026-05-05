'use client';
import { useMutation, gql } from '@apollo/client';

const RUN_SIMULATION = gql`
  mutation RunFutureSimulation {
    runFutureSimulation {
      narrative
      p50Academic
      p50Financial
      p50Wellness
      avatarAttributes {
        trait
        value
        intensity
      }
      pathways {
        name
        probability
        impactScore
      }
    }
  }
`;

export default function FutureSelfPage() {
  const [runSimulation, { data, loading }] = useMutation(RUN_SIMULATION);
  const result = data?.runFutureSimulation;

  const generate = () => {
    runSimulation();
  };

  return (
    <div className="fade-in auth-layout" style={{ minHeight: 'calc(100vh - 64px)', borderRadius: 'var(--radius-lg)' }}>
      <div className="auth-card scale-in" style={{ maxWidth: 700, padding: 48, textAlign: 'center' }}>
        <div style={{ fontSize: '4rem', marginBottom: 20 }}>🔮</div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, marginBottom: 16, background: 'linear-gradient(135deg, #A78BFA 0%, #67E8F9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Future Self Simulator
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', lineHeight: 1.6, marginBottom: 32 }}>
          Our AI analyzes your current habits, skill gaps, and venture progress to generate a highly realistic "Day in the Life" story of you at age 30.
        </p>

        {!result ? (
          <button id="simulate-future-btn" className="btn btn-primary btn-lg" onClick={generate} disabled={loading}>
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
            
            <p style={{ fontSize: '1.125rem', lineHeight: 1.8, color: 'var(--text-primary)', marginBottom: 24 }}>
              {result.narrative}
            </p>

            {/* Avatar Evolution Visualizer */}
            <div style={{ marginBottom: 32, padding: 24, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--bg-glass-border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-primary-light)', marginBottom: 16, textAlign: 'center', letterSpacing: '0.1em' }}>AVATAR EVOLUTION</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                {(result.avatarAttributes || []).map((attr: any) => (
                  <div key={attr.trait} style={{ textAlign: 'center', minWidth: 100 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${attr.value.includes('GOLD') ? 'var(--color-gold)' : 'var(--color-primary)'}`, boxShadow: `0 0 ${attr.intensity * 20}px ${attr.value.includes('GOLD') ? 'rgba(255,215,0,0.2)' : 'rgba(167,139,250,0.2)'}` }}>
                      {attr.trait === 'AURA' ? '✨' : attr.trait === 'EXPRESSION' ? '😌' : attr.trait === 'POSTURE' ? '🧍' : '👔'}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{attr.value.replace('_', ' ')}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>{attr.trait}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>ACADEMIC</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>{result.p50Academic.toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>FINANCIAL</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-gold)' }}>{result.p50Financial.toFixed(0)}%</div>
              </div>
              <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>WELLNESS</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>{result.p50Wellness.toFixed(0)}%</div>
              </div>
            </div>

            <div style={{ marginTop: 24, borderTop: '1px solid var(--bg-glass-border)', paddingTop: 16, display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>Run New Simulation</button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
