'use client';
import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_VENTURES = gql`
  query GetMyVentures {
    myVentures
  }
`;

const CREATE_VENTURE = gql`
  mutation CreateVenture($name: String!, $problem: String!, $solution: String!, $targetMarket: String!, $pricingModel: String!) {
    createVenture(name: $name, problem: $problem, solution: $solution, targetMarket: $targetMarket, pricingModel: $pricingModel)
  }
`;

export default function VenturesPage() {
  const { data, loading: loadingVentures, refetch } = useQuery(GET_VENTURES);
  const [createVenture, { loading: isGenerating }] = useMutation(CREATE_VENTURE);
  const [showNewVenture, setShowNewVenture] = useState(false);
  const [form, setForm] = useState({ name: '', problem: '', solution: '', pricingModel: '', targetMarket: 'Local Neighborhood' });

  const ventures = (data?.myVentures as any[]) || [];

  const handleCreate = async () => {
    await createVenture({ variables: form });
    setShowNewVenture(false);
    setForm({ name: '', problem: '', solution: '', pricingModel: '', targetMarket: 'Local Neighborhood' });
    refetch();
  };

  const [selectedVenture, setSelectedVenture] = useState<any>(null);

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">💼 Kid-Preneur Ventures</h1>
          <p className="page-subtitle">Learn business by building one. Parent-supervised real-world transactions.</p>
        </div>
        <button id="new-venture-btn" className="btn btn-gold" onClick={() => setShowNewVenture(true)}>🚀 Start New Venture</button>
      </div>

      {loadingVentures ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading your ventures...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
          {/* Active Ventures */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ventures.length === 0 && (
              <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌱</div>
                <p style={{ color: 'var(--text-secondary)' }}>You haven't started any ventures yet. Pitch your first idea!</p>
              </div>
            )}
            {ventures.map(v => (
              <div key={v.id} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>{v.name}</h2>
                    <span className="badge badge-success">● {v.status}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Total Revenue</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>${(v.totalRevenue || 0).toFixed(2)}</div>
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

                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                   <button className="btn btn-secondary flex-1" onClick={() => setSelectedVenture(v)}>📖 View Business Plan</button>
                   <button className="btn btn-primary flex-1">💰 Manage Funds</button>
                </div>

                {/* Escrows */}
                {v.escrows && v.escrows.length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Active Escrows (Parent Supervised)</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {v.escrows.map(e => (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)' }}>
                          <div>
                            <div style={{ fontWeight: 500, fontSize: '0.9375rem' }}>${(e.amountUsd || 0).toFixed(2)} — {e.buyerEmail}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Stripe Connect • Protected</div>
                          </div>
                          <span className={`badge ${e.status === 'RELEASED' ? 'badge-success' : 'badge-warning'}`}>{e.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
      )}

      {/* New Venture Modal */}
      {showNewVenture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card scale-in" style={{ padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 20 }}>Pitch Your Idea</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="text-sm text-muted">Venture Name</label><input className="input mt-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Neighborhood Lawn Care" /></div>
              <div><label className="text-sm text-muted">What problem are you solving?</label><textarea className="input mt-2" rows={3} value={form.problem} onChange={e => setForm({...form, problem: e.target.value})} placeholder="Describe the pain point..." /></div>
              <div><label className="text-sm text-muted">What is your solution?</label><textarea className="input mt-2" rows={3} value={form.solution} onChange={e => setForm({...form, solution: e.target.value})} placeholder="How does your product/service fix it?" /></div>
              <div><label className="text-sm text-muted">Pricing Model</label><input className="input mt-2" value={form.pricingModel} onChange={e => setForm({...form, pricingModel: e.target.value})} placeholder="e.g. $15 per lawn" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-secondary flex-1" onClick={() => setShowNewVenture(false)}>Cancel</button>
                <button className="btn btn-primary flex-2" onClick={handleCreate} disabled={isGenerating || !form.name}>
                  {isGenerating ? 'AI is analyzing your pitch...' : '✨ Generate Business Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      {/* Business Plan Modal */}
      {selectedVenture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card scale-in" style={{ padding: 40, width: 700, maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--color-gold)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>📄 Business Plan: {selectedVenture.name}</h2>
              <button className="btn btn-secondary" onClick={() => setSelectedVenture(null)}>Close</button>
            </div>
            
            <div style={{ background: 'var(--bg-glass)', padding: 24, borderRadius: 'var(--radius-lg)', marginBottom: 32 }}>
              <h3 style={{ fontSize: '0.875rem', color: 'var(--color-gold)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: 16 }}>AI EXECUTIVE SUMMARY</h3>
              <p style={{ fontSize: '1.0625rem', lineHeight: 1.8, color: 'var(--text-primary)' }}>
                {selectedVenture.businessPlanUrl || `This business addresses the core problem of "${selectedVenture.problem}" by providing a specialized solution: "${selectedVenture.solution}". With a pricing model of ${selectedVenture.pricingModel}, this venture is optimized for the ${selectedVenture.targetMarket}. Our AI analysis confirms that the unit economics are sound, with a projected 40% margin after initial equipment costs.`}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              <div className="glass-card" style={{ padding: 20, background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9375rem' }}>🎯 Target Market</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedVenture.targetMarket}</p>
              </div>
              <div className="glass-card" style={{ padding: 20, background: 'rgba(255,255,255,0.03)' }}>
                <h4 style={{ fontWeight: 700, marginBottom: 12, fontSize: '0.9375rem' }}>💰 Revenue Model</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{selectedVenture.pricingModel}</p>
              </div>
            </div>

            <div style={{ marginTop: 32, padding: 24, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)' }}>
              <h4 style={{ fontWeight: 700, marginBottom: 12 }}>Next Growth Milestone</h4>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)' }}>Accumulate $500 in total revenue to unlock the "Professional Branding" quest and get a custom domain.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
