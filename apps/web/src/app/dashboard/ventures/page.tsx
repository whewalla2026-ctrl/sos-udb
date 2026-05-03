'use client';
import { useState } from 'react';

const MOCK_VENTURES = [
  {
    id: '1', name: 'Neighborhood Lemonade App', status: 'ACTIVE',
    problem: 'People want cold drinks but don\'t carry cash',
    solution: 'An app to order lemonade and pay via Stripe',
    revenueUsd: 45.00, escrows: [
      { id: 'e1', amountUsd: 15, status: 'RELEASED', buyer: 'neighbor@test.com' },
      { id: 'e2', amountUsd: 10, status: 'PENDING', buyer: 'mom@udb.dev' }
    ]
  }
];

export default function VenturesPage() {
  const [showNewVenture, setShowNewVenture] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePlan = () => {
    setIsGenerating(true);
    setTimeout(() => { setIsGenerating(false); setShowNewVenture(false); }, 2000);
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">💼 Kid-Preneur Ventures</h1>
          <p className="page-subtitle">Learn business by building one. Parent-supervised real-world transactions.</p>
        </div>
        <button id="new-venture-btn" className="btn btn-gold" onClick={() => setShowNewVenture(true)}>🚀 Start New Venture</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        {/* Active Ventures */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {MOCK_VENTURES.map(v => (
            <div key={v.id} className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>{v.name}</h2>
                  <span className="badge badge-success">● {v.status}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Total Revenue</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>${v.revenueUsd.toFixed(2)}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
                <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>THE PROBLEM</div>
                  <div style={{ fontSize: '0.9375rem' }}>{v.problem}</div>
                </div>
                <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                  <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.8125rem', marginBottom: 4 }}>THE SOLUTION</div>
                  <div style={{ fontSize: '0.9375rem' }}>{v.solution}</div>
                </div>
              </div>

              {/* Escrows */}
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Active Escrows (Parent Supervised)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {v.escrows.map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>${e.amountUsd.toFixed(2)} — {e.buyer}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stripe Connect • Protected</div>
                      </div>
                      <span className={`badge ${e.status === 'RELEASED' ? 'badge-success' : 'badge-warning'}`}>{e.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Learning Hub sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>AI Business Advisor</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: 16 }}>
              Before launching, our AI validates your unit economics to ensure you can actually make a profit!
            </p>
            <button className="btn btn-secondary w-full">Chat with Advisor</button>
          </div>
        </div>
      </div>

      {/* New Venture Modal */}
      {showNewVenture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card scale-in" style={{ padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 20 }}>Pitch Your Idea</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="text-sm text-muted">Venture Name</label><input className="input mt-2" placeholder="e.g. Neighborhood Lawn Care" /></div>
              <div><label className="text-sm text-muted">What problem are you solving?</label><textarea className="input mt-2" rows={3} placeholder="Describe the pain point..." /></div>
              <div><label className="text-sm text-muted">What is your solution?</label><textarea className="input mt-2" rows={3} placeholder="How does your product/service fix it?" /></div>
              <div><label className="text-sm text-muted">Pricing Model</label><input className="input mt-2" placeholder="e.g. $15 per lawn" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-secondary flex-1" onClick={() => setShowNewVenture(false)}>Cancel</button>
                <button className="btn btn-primary flex-2" onClick={generatePlan} disabled={isGenerating}>
                  {isGenerating ? 'AI is analyzing your pitch...' : '✨ Generate Business Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
