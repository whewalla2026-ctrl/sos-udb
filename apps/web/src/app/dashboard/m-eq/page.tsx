'use client';
import { useState } from 'react';
import { useMutation, gql } from '@apollo/client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const ANALYZE_EMOTION = gql`
  mutation AnalyzeEmotionalState($videoUrl: String!, $transcript: String!) {
    analyzeEmotionalState(videoUrl: $videoUrl, transcript: $transcript) {
      emotion
      focusScore
      resilienceLevel
    }
  }
`;

const MOCK_HISTORY = [
  { time: 'Mon', focus: 82, stress: 20 },
  { time: 'Tue', focus: 75, stress: 35 },
  { time: 'Wed', focus: 90, stress: 15 },
  { time: 'Thu', focus: 65, stress: 50 },
  { time: 'Fri', focus: 88, stress: 10 },
  { time: 'Sat', focus: 92, stress: 5 },
  { time: 'Sun', focus: 85, stress: 12 },
];

export default function MEQPage() {
  const [analyzeEmotion, { loading: isRecording }] = useMutation(ANALYZE_EMOTION);
  const [analysis, setAnalysis] = useState<any>(null);

  const startAnalysis = async () => {
    const { data } = await analyzeEmotion({
      variables: {
        videoUrl: 'https://storage.udb.dev/clips/session-123.mp4',
        transcript: 'I feel like I am finally understanding the calculus concepts, but I am a bit tired.'
      }
    });
    
    if (data?.analyzeEmotionalState) {
      setAnalysis({
        ...data.analyzeEmotionalState,
        insight: data.analyzeEmotionalState.focusScore > 80 
          ? "You're showing high cognitive resilience today. Despite the complex academic workload, your linguistic markers suggest a growth mindset."
          : "You seem a bit fatigued. The AI suggests a 15-minute 'Active Recovery' break to reset your focus levels."
      });
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🧠 mEQ & Resilience Hub</h1>
        <p className="page-subtitle">Phase 5: Multimodal Emotional Intelligence. Tracking focus, stress, and grit.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Analysis Card */}
          <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>Real-time State Analysis</h2>
            
            {!analysis && !isRecording ? (
              <div style={{ padding: '40px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: 20 }}>🎭</div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 32 }}>Check your current emotional state and focus levels using AI biometric analysis.</p>
                <button className="btn btn-primary btn-lg" onClick={startAnalysis}>Start AI Scan</button>
              </div>
            ) : isRecording ? (
              <div style={{ padding: '40px 0' }}>
                <div className="pulse" style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--color-primary)', margin: '0 auto 24px', opacity: 0.6 }} />
                <p style={{ fontWeight: 600 }}>Analyzing vocal markers and facial micro-expressions...</p>
                <style>{`
                  .pulse { animation: pulse-anim 1.5s infinite; }
                  @keyframes pulse-anim { 0% { transform: scale(1); opacity: 0.6; } 50% { transform: scale(1.2); opacity: 0.3; } 100% { transform: scale(1); opacity: 0.6; } }
                `}</style>
              </div>
            ) : (
              <div className="fade-in" style={{ textAlign: 'left' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                  <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>EMOTION</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{analysis.emotion}</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>FOCUS SCORE</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>{analysis.focusScore}%</div>
                  </div>
                  <div style={{ padding: 16, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>RESILIENCE</div>
                    <div style={{ fontWeight: 700, color: 'var(--color-gold)' }}>{analysis.resilienceLevel}</div>
                  </div>
                </div>
                
                <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', padding: 20, borderRadius: 'var(--radius-md)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: 8, color: 'var(--color-primary-light)' }}>AI INSIGHT</h4>
                  <p style={{ fontSize: '1rem', lineHeight: 1.6 }}>{analysis.insight}</p>
                </div>

                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <button className="btn btn-secondary" onClick={() => setAnalysis(null)}>Reset Scan</button>
                </div>
              </div>
            )}
          </div>

          {/* History Chart */}
          <div className="glass-card" style={{ padding: 32 }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Weekly Resilience Trends</h3>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_HISTORY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="time" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-glass-border)', borderRadius: 8 }}
                    itemStyle={{ fontSize: 12 }}
                  />
                  <Line type="monotone" dataKey="focus" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="stress" stroke="var(--color-danger)" strokeWidth={2} dot={{ r: 0 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', gap: 24, marginTop: 16, justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-primary)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Focus Level</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--color-danger)' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stress Index</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Why mEQ Matters?</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Success isn't just about grades or business. It's about **Resilience**. Phase 5 uses multimodal AI to detect early signs of burnout or frustration, helping you pivot your study habits before you hit a wall.
            </p>
          </div>

          <div className="glass-card" style={{ padding: 24, background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(103, 232, 249, 0.1) 100%)' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>🌟 Grit Level: Elite</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: 12 }}>You have maintained a focus score above 80% for 5 consecutive days.</p>
            <div className="badge badge-gold">Badge Unlocked: Unstoppable</div>
          </div>
        </div>
      </div>
    </div>
  );
}
