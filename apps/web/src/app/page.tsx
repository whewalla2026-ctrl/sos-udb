'use client';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <header style={{ padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bg-glass-border)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50, background: 'rgba(10,10,26,0.8)' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🌟 UDB
        </div>
        <nav style={{ display: 'flex', gap: '32px', alignItems: 'center' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Features</a>
          <a href="#pillars" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 500 }}>Pillars</a>
          <Link href="/auth/login"><button className="btn btn-secondary btn-sm">Sign In</button></Link>
          <Link href="/auth/register"><button className="btn btn-primary btn-sm">Get Started</button></Link>
        </nav>
      </header>

      <main style={{ flex: 1 }}>
        {/* Hero */}
        <section style={{ textAlign: 'center', padding: '120px 48px 80px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '20%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: '30%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          
          <div className="badge badge-primary fade-in" style={{ marginBottom: 24, display: 'inline-flex' }}>
            ✨ The Future of Youth Development — Ages 6-23
          </div>
          
          <h1 className="slide-up" style={{ maxWidth: 900, margin: '0 auto 24px', background: 'linear-gradient(135deg, #F8F8FF 0%, #A78BFA 50%, #67E8F9 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            One Platform. Every Pillar of Growth.
          </h1>

          <p className="slide-up" style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto 48px', lineHeight: 1.7 }}>
            UDB unifies academic excellence, biometric health, gamification, and entrepreneurship into a single AI-powered developmental backbone — from egg to legend.
          </p>

          <div className="flex justify-center gap-4 slide-up">
            <Link href="/auth/register"><button className="btn btn-primary btn-lg">🚀 Start Your Journey</button></Link>
            <Link href="/dashboard"><button className="btn btn-secondary btn-lg">📊 View Demo</button></Link>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 80 }}>
            {[['110+', 'Use Cases'], ['6-23', 'Ages Served'], ['4', 'AI Pillars'], ['∞', 'Growth Potential']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{val}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Pillars */}
        <section id="pillars" style={{ padding: '80px 48px', background: 'rgba(124,58,237,0.03)' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 16 }}>The 4 Developmental Pillars</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 56 }}>Every data point from every pillar flows into the Unified User Profile</p>
          <div className="grid-stats" style={{ maxWidth: 1000, margin: '0 auto' }}>
            {[
              { icon: '🎓', title: 'Academic Mastery', desc: 'LMS sync, Socratic AI Tutor, Skill Gap Analysis, Workload Prediction', color: '#06B6D4' },
              { icon: '💓', title: 'Biometric Health', desc: 'Sleep tracking, Focus scores, Stress monitoring, Cognitive Chronotype', color: '#10B981' },
              { icon: '🐣', title: 'Gamification', desc: 'Doter avatar lifecycle, XP & quests, Achievement NFTs, Streak system', color: '#7C3AED' },
              { icon: '💼', title: 'Entrepreneurship', desc: 'Business Plan AI, Stripe Escrow, Kid-Preneur Hub, Skill Marketplace', color: '#F59E0B' },
            ].map(p => (
              <div key={p.title} className="glass-card" style={{ padding: 32 }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>{p.icon}</div>
                <h3 style={{ fontSize: '1.125rem', marginBottom: 8, color: p.color }}>{p.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" style={{ padding: '80px 48px' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 56 }}>Secret Sauce Features</h2>
          <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[
              { emoji: '🧠', title: 'Socratic AI Tutor', desc: 'Never gives the answer. Guides through scaffolding questions using Vertex AI Gemini 1.5 Pro.' },
              { emoji: '⚡', title: 'UUP Sync Engine', desc: 'Biometric data affects Doter state. Sleep impacts academic quests. Everything is connected.' },
              { emoji: '🗓️', title: 'Weekly Planning Ritual', desc: 'Sunday AI ritual: 5 minutes to plan a balanced week aligned with skill gaps and calendar.' },
              { emoji: '🔮', title: 'Future Self Simulator', desc: 'Monte Carlo + Gemini generates a "Day in the Life at Age 30" story from today\'s habits.' },
              { emoji: '🛡️', title: 'Safety Guardian', desc: 'Every message is AI-scanned. Safety Score 0-100 alerts parents instantly below 70.' },
              { emoji: '💰', title: 'Financial Escrow', desc: 'Real money. Parent-supervised Stripe Connect escrow for student ventures.' },
            ].map(f => (
              <div key={f.title} className="glass-card" style={{ padding: '24px 32px', display: 'flex', gap: 24, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '2rem', flexShrink: 0 }}>{f.emoji}</span>
                <div>
                  <h3 style={{ fontSize: '1.0625rem', marginBottom: 6 }}>{f.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section style={{ textAlign: 'center', padding: '80px 48px', background: 'linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(6,182,212,0.08) 100%)', borderTop: '1px solid var(--bg-glass-border)' }}>
          <h2 style={{ marginBottom: 16 }}>Ready to Build Their Future?</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 40, fontSize: '1.125rem' }}>Join families who are transforming childhood habits into lifelong success.</p>
          <Link href="/auth/register"><button className="btn btn-primary btn-lg">🌟 Create Free Account</button></Link>
        </section>
      </main>

      <footer style={{ padding: '24px 48px', textAlign: 'center', color: 'var(--text-muted)', borderTop: '1px solid var(--bg-glass-border)', fontSize: '0.875rem' }}>
        © 2026 Unified Developmental Backbone. Built with ❤️ and AI for the next generation.
      </footer>
    </div>
  );
}
