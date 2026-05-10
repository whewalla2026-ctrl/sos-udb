'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@apollo/client';
import {
  ArrowRight, ArrowLeft, SkipForward, Check, Sparkles, User, Egg, Crosshair,
  Compass, ChevronRight,
} from 'lucide-react';
import {
  GET_ONBOARDING_STATUS,
  UPDATE_ONBOARDING_STEP,
  COMPLETE_ONBOARDING,
  SKIP_ONBOARDING,
} from '../../../lib/queries';

var STEPS = ['Welcome', 'Profile', 'Doter Name', 'First Quest', 'Guided Tour'];

var AVATARS = [
  { emoji: '\u{1F9B8}', name: 'Hero' }, { emoji: '\u{1F9D9}', name: 'Wizard' }, { emoji: '\u{1F916}', name: 'Bot' },
  { emoji: '\u{1F409}', name: 'Dragon' }, { emoji: '\u{1F98A}', name: 'Fox' }, { emoji: '\u{1F431}', name: 'Cat' },
  { emoji: '\u{1F989}', name: 'Owl' }, { emoji: '\u{1F43A}', name: 'Wolf' },
];

var DOTER_SUGGESTIONS = ['Blinky', 'Sparky', 'Zippy', 'Nova', 'Pixel', 'Echo', 'Cosmo', 'Orbit', 'Luna', 'Pyro'];

var SAMPLE_QUESTS = [
  { id: '1', title: 'Complete a Math Challenge', pillar: 'Academic', xp: 150, icon: '\u{1F4D0}' },
  { id: '2', title: 'Read for 20 Minutes', pillar: 'Academic', xp: 100, icon: '\u{1F4D6}' },
  { id: '3', title: 'Log Your Sleep', pillar: 'Biometric', xp: 50, icon: '\u{1F634}' },
  { id: '4', title: 'Walk 5,000 Steps', pillar: 'Biometric', xp: 80, icon: '\u{1F45F}' },
  { id: '5', title: 'Practice a New Skill', pillar: 'Life Skills', xp: 120, icon: '\u{1F527}' },
  { id: '6', title: 'Help with Chores', pillar: 'Life Skills', xp: 90, icon: '\u{1F9F9}' },
];

var TOUR_STEPS = [
  { title: 'Dashboard', desc: 'Your command center — see stats, quests, and your Doter at a glance.', icon: '\u{1F3E0}' },
  { title: 'Quests', desc: 'Complete challenges to earn XP and level up your Doter.', icon: '\u{2694}\u{FE0F}' },
  { title: 'Doter', desc: 'Your virtual companion that grows as you learn and achieve.', icon: '\u{1F423}' },
  { title: 'Goals', desc: 'Set and track mastery goals across different pillars.', icon: '\u{1F3AF}' },
  { title: 'Weekly Plan', desc: 'Plan your week with activities and stay on track.', icon: '\u{1F5D3}\u{FE0F}' },
];

var STORAGE_KEY = 'udb_onboarding_progress';

export default function OnboardingPage() {
  var router = useRouter();
  var [step, setStep] = useState(0);
  var [displayName, setDisplayName] = useState('');
  var [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0].emoji);
  var [timezone, setTimezone] = useState('');
  var [doterName, setDoterName] = useState('');
  var [selectedQuest, setSelectedQuest] = useState<string | null>(null);
  var [tourStep, setTourStep] = useState(0);
  var [initialized, setInitialized] = useState(false);

  var { data: statusData, loading: statusLoading, error: statusError } = useQuery(GET_ONBOARDING_STATUS, {
    fetchPolicy: 'network-only',
  });
  var [updateStep] = useMutation(UPDATE_ONBOARDING_STEP);
  var [completeOnboarding] = useMutation(COMPLETE_ONBOARDING);
  var [skipOnboarding] = useMutation(SKIP_ONBOARDING);

  useEffect(function() {
    if (statusLoading || !statusData) return;
    var onboarding = statusData.onboardingStatus;
    if (onboarding.completed) {
      router.push('/dashboard');
      return;
    }
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        var parsed = JSON.parse(saved);
        if (parsed.step !== undefined) setStep(parsed.step);
        if (parsed.displayName) setDisplayName(parsed.displayName);
        if (parsed.selectedAvatar) setSelectedAvatar(parsed.selectedAvatar);
        if (parsed.timezone) setTimezone(parsed.timezone);
        if (parsed.doterName) setDoterName(parsed.doterName);
        if (parsed.selectedQuest) setSelectedQuest(parsed.selectedQuest);
        setInitialized(true);
        return;
      } catch (_) {}
    }
    if (onboarding.currentStep > 0) {
      setStep(onboarding.currentStep);
    }
    setInitialized(true);
  }, [statusData, statusLoading, router]);

  var saveProgress = useCallback(function(data: any) {
    try {
      var existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data }));
    } catch (_) {}
  }, []);

  async function nextStep() {
    var next = step + 1;
    var payload: any = { step: next };
    if (step === 1) { payload.displayName = displayName; payload.selectedAvatar = selectedAvatar; payload.timezone = timezone; }
    if (step === 2) { payload.doterName = doterName; }
    if (step === 3) { payload.selectedQuest = selectedQuest; }
    saveProgress(payload);
    try { await updateStep({ variables: { step: next } }); } catch (_) {}
    setStep(next);
  }

  async function skipStep() {
    var next = step + 1;
    saveProgress({ step: next });
    if (next >= STEPS.length) {
      try { await skipOnboarding(); } catch (_) {}
      localStorage.removeItem(STORAGE_KEY);
      router.push('/dashboard');
      return;
    }
    try { await updateStep({ variables: { step: next } }); } catch (_) {}
    setStep(next);
  }

  function prevStep() {
    setStep(Math.max(0, step - 1));
  }

  async function finish() {
    try { await completeOnboarding(); } catch (_) {}
    localStorage.removeItem(STORAGE_KEY);
    router.push('/dashboard');
  }

  if (statusLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16, animation: 'doterFloat 3s ease-in-out infinite' }}>🌟</div>
          <p style={{ color: 'var(--text-secondary)' }}>Loading your onboarding...</p>
        </div>
      </div>
    );
  }

  if (statusError) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: 'var(--color-danger)', marginBottom: 16 }}>Failed to load onboarding status.</p>
          <button className="btn btn-primary" onClick={function() { router.refresh(); }}>Retry</button>
        </div>
      </div>
    );
  }

  if (!initialized) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 640 }}>
        {/* Step Indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 40, justifyContent: 'center' }}>
          {STEPS.map(function(s, i) {
            var isDone = i < step;
            var isActive = i === step;
            return (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.3s',
                  background: isDone ? 'var(--gradient-primary)' : isActive ? 'rgba(124,58,237,0.25)' : 'var(--bg-glass)',
                  border: isDone ? 'none' : '2px solid ' + (isActive ? 'var(--color-primary-light)' : 'var(--bg-glass-border)'),
                  color: isDone ? 'white' : isActive ? 'var(--color-primary-light)' : 'var(--text-muted)',
                }}>
                  {isDone ? <Check size={16} /> : i + 1}
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--text-primary)' : 'var(--text-muted)', display: 'none' }}>
                  {s}
                </span>
                {i < STEPS.length - 1 && <div style={{ width: 24, height: 2, background: isDone ? 'var(--color-primary-light)' : 'var(--bg-glass-border)' }} />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="glass-card" style={{ padding: 40 }}>
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="slide-up" style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '4rem', marginBottom: 16, animation: 'doterFloat 3s ease-in-out infinite' }}>🌟</div>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: 12 }}>Welcome to UDB!</h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6, marginBottom: 8 }}>
                Your unified platform for growth, learning, and achievement.
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: 32 }}>
                Let's get you set up in just a few steps.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <button className="btn btn-secondary" onClick={skipStep}><SkipForward size={16} /> Skip All</button>
                <button className="btn btn-primary" onClick={nextStep}>Get Started <ArrowRight size={16} /></button>
              </div>
            </div>
          )}

          {/* Step 1: Profile Setup */}
          {step === 1 && (
            <div className="slide-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <User size={22} style={{ color: 'var(--color-primary-light)' }} />
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Profile Setup</h2>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Display Name</label>
                <input className="input" placeholder="Your name" value={displayName} onChange={function(e) { setDisplayName(e.target.value); }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Avatar</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AVATARS.map(function(a) {
                    var isSel = selectedAvatar === a.emoji;
                    return (
                      <button key={a.emoji} onClick={function() { setSelectedAvatar(a.emoji); }} style={{
                        width: 48, height: 48, borderRadius: 'var(--radius-md)', border: isSel ? '2px solid var(--color-primary-light)' : '1px solid var(--bg-glass-border)',
                        background: isSel ? 'rgba(124,58,237,0.2)' : 'var(--bg-glass)', cursor: 'pointer', fontSize: '1.5rem',
                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>{a.emoji}</button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Timezone</label>
                <select className="input" value={timezone} onChange={function(e) { setTimezone(e.target.value); }}>
                  <option value="">Select timezone...</option>
                  <option value="America/New_York">Eastern (UTC-5)</option>
                  <option value="America/Chicago">Central (UTC-6)</option>
                  <option value="America/Denver">Mountain (UTC-7)</option>
                  <option value="America/Los_Angeles">Pacific (UTC-8)</option>
                  <option value="Europe/London">London (UTC+0)</option>
                  <option value="Europe/Berlin">Berlin (UTC+1)</option>
                  <option value="Asia/Tokyo">Tokyo (UTC+9)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={prevStep}><ArrowLeft size={16} /> Back</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={skipStep}><SkipForward size={16} /> Skip</button>
                  <button className="btn btn-primary" onClick={nextStep} disabled={!displayName.trim()}>Continue <ArrowRight size={16} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Doter Naming */}
          {step === 2 && (
            <div className="slide-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Egg size={22} style={{ color: 'var(--color-primary-light)' }} />
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Name Your Doter</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 24 }}>
                Your Doter is your virtual companion. Give it a name!
              </p>
              <div style={{ marginBottom: 20 }}>
                <input className="input" placeholder="Enter a name..." value={doterName} onChange={function(e) { setDoterName(e.target.value); }} maxLength={20} />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Suggestions</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DOTER_SUGGESTIONS.map(function(s) {
                    return (
                      <button key={s} onClick={function() { setDoterName(s); }} style={{
                        padding: '8px 16px', borderRadius: 'var(--radius-full)', background: doterName === s ? 'rgba(124,58,237,0.25)' : 'var(--bg-glass)',
                        border: doterName === s ? '1px solid var(--color-primary-light)' : '1px solid var(--bg-glass-border)',
                        color: doterName === s ? 'var(--color-primary-light)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.875rem',
                        fontWeight: doterName === s ? 600 : 400, transition: 'all 0.2s',
                      }}>{s}</button>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={prevStep}><ArrowLeft size={16} /> Back</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={skipStep}><SkipForward size={16} /> Skip</button>
                  <button className="btn btn-primary" onClick={nextStep} disabled={!doterName.trim()}>Continue <ArrowRight size={16} /></button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: First Quest */}
          {step === 3 && (
            <div className="slide-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Crosshair size={22} style={{ color: 'var(--color-primary-light)' }} />
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Pick Your First Quest</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 24 }}>
                Choose a quest to start earning XP right away.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {SAMPLE_QUESTS.map(function(q) {
                  var isSel = selectedQuest === q.id;
                  return (
                    <div key={q.id} onClick={function() { setSelectedQuest(q.id); }} style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer', transition: 'all 0.2s',
                      background: isSel ? 'rgba(124,58,237,0.15)' : 'var(--bg-glass)',
                      border: isSel ? '1px solid var(--color-primary-light)' : '1px solid var(--bg-glass-border)',
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>{q.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{q.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.pillar}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-gold)' }}>+{q.xp} XP</div>
                      {isSel && <Check size={18} style={{ color: 'var(--color-primary-light)' }} />}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button className="btn btn-ghost" onClick={prevStep}><ArrowLeft size={16} /> Back</button>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary" onClick={skipStep}><SkipForward size={16} /> Skip</button>
                  <button className="btn btn-primary" onClick={nextStep}>
                    {selectedQuest ? 'Continue' : 'Skip & Continue'} <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Guided Tour */}
          {step === 4 && (
            <div className="slide-up">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                <Compass size={22} style={{ color: 'var(--color-primary-light)' }} />
                <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>Guided Tour</h2>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', marginBottom: 24 }}>
                A quick tour of your dashboard.
              </p>
              <div style={{ position: 'relative', minHeight: 200, marginBottom: 24 }}>
                {TOUR_STEPS.map(function(t, i) {
                  if (i !== tourStep) return null;
                  return (
                    <div key={i} className="slide-up" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '4rem', marginBottom: 16 }}>{t.icon}</div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8 }}>{t.title}</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{t.desc}</p>
                    </div>
                  );
                })}
                {/* Tour Dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
                  {TOUR_STEPS.map(function(_, i) {
                    return (
                      <button key={i} onClick={function() { setTourStep(i); }} style={{
                        width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: i === tourStep ? 'var(--color-primary-light)' : 'var(--bg-glass-border)',
                        transition: 'all 0.2s', padding: 0,
                      }} />
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  {tourStep > 0 && (
                    <button className="btn btn-ghost" onClick={function() { setTourStep(tourStep - 1); }}><ArrowLeft size={16} /> Prev</button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  {tourStep < TOUR_STEPS.length - 1 ? (
                    <>
                      <button className="btn btn-secondary" onClick={skipStep}><SkipForward size={16} /> Skip Tour</button>
                      <button className="btn btn-primary" onClick={function() { setTourStep(tourStep + 1); }}>
                        Next <ChevronRight size={16} />
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-primary" onClick={finish}>
                      <Sparkles size={16} /> Complete Setup
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
