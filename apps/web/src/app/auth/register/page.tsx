'use client';
import { useState } from 'react';
import Link from 'next/link';

const STEPS = ['Account', 'Family', 'Setup'];

export default function RegisterPage() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<'PARENT' | 'CHILD'>('PARENT');
  const [form, setForm] = useState({ email: '', password: '', displayName: '', childName: '', childDob: '', consentMethod: 'CREDIT_CARD' });
  const [loading, setLoading] = useState(false);

  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const handleFinish = () => {
    setLoading(true);
    setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
  };

  return (
    <div className="auth-layout">
      <div className="auth-card slide-up" style={{ maxWidth: 480 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🌟</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.625rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 6 }}>
            Create Your Family Account
          </h1>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 3, borderRadius: 2, background: i <= step ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }} />
              <span style={{ fontSize: '0.6875rem', color: i === step ? 'var(--color-primary-light)' : 'var(--text-muted)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
            </div>
          ))}
        </div>

        {/* Step 0: Account */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>I am a...</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[{ v: 'PARENT', icon: '👨‍👩‍👧', label: 'Parent / Guardian' }, { v: 'CHILD', icon: '🧒', label: 'Student (13+)' }].map(r => (
                  <button key={r.v} id={`role-${r.v.toLowerCase()}`} onClick={() => setRole(r.v as any)}
                    style={{ padding: '16px 12px', border: `2px solid ${role === r.v ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`, borderRadius: 'var(--radius-md)', background: role === r.v ? 'rgba(124,58,237,0.15)' : 'var(--bg-glass)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}>
                    <span style={{ fontSize: '1.5rem' }}>{r.icon}</span>
                    <span style={{ color: role === r.v ? 'var(--color-primary-light)' : 'var(--text-secondary)', fontWeight: 600, fontSize: '0.875rem' }}>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Full Name</label>
              <input className="input" placeholder="Your full name" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" placeholder="Min 12 characters, mixed case, symbols" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 8 }} onClick={next}>Continue →</button>
          </div>
        )}

        {/* Step 1: Family Setup (COPPA) */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                🛡️ <strong style={{ color: 'var(--color-primary-light)' }}>COPPA Compliant.</strong> We require verified parental consent for children under 13. Your consent method is secure and private.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Child's Name</label>
              <input className="input" placeholder="Child's first name" value={form.childName} onChange={e => setForm(f => ({ ...f, childName: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6 }}>Child's Date of Birth</label>
              <input className="input" type="date" value={form.childDob} onChange={e => setForm(f => ({ ...f, childDob: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 8 }}>Consent Verification Method</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ v: 'CREDIT_CARD', label: '💳 Credit Card Verification', desc: 'A $0.01 hold placed and released' }, { v: 'ID_CHECK', label: '🪪 Government ID Upload', desc: 'Verified by our compliance team within 24h' }].map(m => (
                  <button key={m.v} id={`consent-${m.v.toLowerCase()}`} onClick={() => setForm(f => ({ ...f, consentMethod: m.v }))}
                    style={{ padding: '14px 16px', textAlign: 'left', border: `2px solid ${form.consentMethod === m.v ? 'var(--color-primary)' : 'var(--bg-glass-border)'}`, borderRadius: 'var(--radius-md)', background: form.consentMethod === m.v ? 'rgba(124,58,237,0.15)' : 'var(--bg-glass)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: form.consentMethod === m.v ? 'var(--color-primary-light)' : 'var(--text-primary)', marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{m.desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={back}>← Back</button>
              <button className="btn btn-primary" style={{ flex: 2 }} onClick={next}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 2: Finish */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>🥚</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: 8 }}>Meet {form.childName || 'Your Child'}'s Doter!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>
                Your Doter starts as an egg and evolves as {form.childName || 'your child'} completes quests, learns, and grows. Let's get started!
              </p>
            </div>

            {/* Summary */}
            <div style={{ background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[['Account', form.displayName, '✓'], ['Email', form.email, '✓'], ['Child', form.childName || 'Not set', form.childName ? '✓' : '⚠'], ['Consent', form.consentMethod.replace('_', ' '), '✓']].map(([k, v, s]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <span style={{ color: s === '✓' ? 'var(--color-success)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s} {v}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={back}>← Back</button>
              <button id="finish-register-btn" className="btn btn-primary" style={{ flex: 2 }} onClick={handleFinish} disabled={loading}>
                {loading ? '🌟 Creating account…' : '🚀 Launch UDB!'}
              </button>
            </div>
          </div>
        )}

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: 20 }}>
          Already have an account? <Link href="/auth/login" style={{ color: 'var(--color-primary-light)', textDecoration: 'none', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
