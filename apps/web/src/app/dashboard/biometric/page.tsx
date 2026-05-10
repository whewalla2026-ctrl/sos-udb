'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_BIOMETRIC_HISTORY, LOG_BIOMETRIC } from '../../../lib/queries';

var FALLBACK_BIOMETRIC: Record<string, any> = {
  sleep: { value: 8.5, label: 'Sleep Last Night', unit: 'hours', status: 'optimal', color: '#10B981' },
  focus: { value: 82, label: 'Focus Score', unit: '/100', status: 'optimal', color: '#7C3AED' },
  stress: { value: 15, label: 'Stress Index', unit: '%', status: 'low', color: '#06B6D4' },
  hrv: { value: 65, label: 'HRV', unit: 'ms', status: 'normal', color: '#F59E0B' },
  steps: { value: 8432, label: 'Steps Today', unit: '', status: 'good', color: '#EC4899' },
};

var FALLBACK_WEEKLY = [
  { day: 'Mon', sleep: 7.2, focus: 65 }, { day: 'Tue', sleep: 6.8, focus: 50 },
  { day: 'Wed', sleep: 8.1, focus: 75 }, { day: 'Thu', sleep: 8.5, focus: 82 },
  { day: 'Fri', sleep: 7.5, focus: 70 }, { day: 'Sat', sleep: 9.0, focus: 88 },
  { day: 'Sun', sleep: 8.5, focus: 85 },
];

export default function BiometricPage() {
  var { data: bioData, loading } = useQuery(GET_BIOMETRIC_HISTORY, { variables: { days: 30 } });
  var [logBiometric] = useMutation(LOG_BIOMETRIC);
  var [showLogModal, setShowLogModal] = useState(false);
  var [biometric, setBiometric] = useState(FALLBACK_BIOMETRIC);
  var [weeklyData, setWeeklyData] = useState(FALLBACK_WEEKLY);

  useEffect(function() {
    if (bioData?.biometricHistory) {
      setBiometric(bioData.biometricHistory);
    }
  }, [bioData]);

  var handleLog = function() {
    logBiometric({ variables: { data: JSON.stringify({ source: 'manual' }) } }).catch(function(e) { console.error(e); });
    setShowLogModal(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Health & Biometrics</h1>
          <p className="page-subtitle">Your physical state directly impacts your cognitive performance and Doter.</p>
        </div>
        <button id="log-health-btn" className="btn btn-primary" onClick={function() { setShowLogModal(true); }}>+ Log Manual Entry</button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading biometric data...</div>
      ) : (
        <>
          <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', gap: 16, alignItems: 'center', borderLeft: '4px solid var(--color-primary)' }}>
            <div style={{ fontSize: '2rem' }}>🧠</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Cognitive Chronotype Insight</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.5 }}>
                Based on your biometric data, focus peaks in the morning. Deep work is scheduled accordingly.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 32 }}>
            {Object.entries(biometric).map(function(entry) {
              var k = entry[0]; var v = entry[1] as any;
              return (
                <div key={k} className="stat-card" style={{ padding: 20 }}>
                  <div style={{ color: v.color, fontSize: '0.8125rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>{v.label}</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'white' }}>
                    {v.value}<span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>{v.unit}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 24 }}>Sleep vs. Focus Correlation</h2>
            <div style={{ height: 300, display: 'flex', alignItems: 'flex-end', gap: 20, padding: '0 20px' }}>
              {weeklyData.map(function(d: any) {
                return (
                  <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                      <div style={{ width: '40%', height: d.focus + '%', background: 'var(--color-primary)', borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
                      <div style={{ width: '40%', height: (d.sleep / 10) * 100 + '%', background: 'var(--color-success)', borderRadius: '4px 4px 0 0', opacity: 0.8, marginLeft: 4 }} />
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, background: 'var(--color-primary)', borderRadius: 2 }} /> Focus Score</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div style={{ width: 12, height: 12, background: 'var(--color-success)', borderRadius: 2 }} /> Sleep Hours</div>
            </div>
          </div>
        </>
      )}

      {showLogModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, backdropFilter: 'blur(8px)' }}>
          <div className="glass-card scale-in" style={{ padding: 32, width: 400 }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: 20 }}>Log Health Data</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="text-sm text-muted">Sleep Hours</label><input type="number" className="input mt-2" placeholder="e.g. 8.5" /></div>
              <div><label className="text-sm text-muted">Water (Glasses)</label><input type="number" className="input mt-2" placeholder="e.g. 6" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <button className="btn btn-secondary w-full" onClick={function() { setShowLogModal(false); }}>Cancel</button>
                <button className="btn btn-primary w-full" onClick={handleLog}>Save Log</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
