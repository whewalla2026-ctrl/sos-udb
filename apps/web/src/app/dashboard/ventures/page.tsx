'use client';
import { useEffect, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_MY_VENTURES, CREATE_VENTURE } from '../../../lib/queries';

var FALLBACK_VENTURES = [
  {
    id: '1', name: 'Neighborhood Lemonade App', status: 'ACTIVE',
    problem: 'People want cold drinks but do not carry cash',
    solution: 'An app to order lemonade and pay via Stripe',
    revenueUsd: 45.00, escrows: [
      { id: 'e1', amountUsd: 15, status: 'RELEASED', buyer: 'neighbor@test.com' },
      { id: 'e2', amountUsd: 10, status: 'PENDING', buyer: 'mom@udb.dev' }
    ]
  }
];

export default function VenturesPage() {
  var { data: venturesData, loading } = useQuery(GET_MY_VENTURES);
  var [createVenture] = useMutation(CREATE_VENTURE);
  var [showNewVenture, setShowNewVenture] = useState(false);
  var [ventures, setVentures] = useState(FALLBACK_VENTURES);
  var [isGenerating, setIsGenerating] = useState(false);

  useEffect(function() {
    if (venturesData?.myVentures) {
      setVentures(venturesData.myVentures);
    }
  }, [venturesData]);

  var generatePlan = function() {
    setIsGenerating(true);
    createVenture({
      variables: {
        name: 'New Venture',
        problem: 'Problem description',
        solution: 'Solution description',
        targetMarket: 'Local neighborhood',
        pricingModel: 'Per unit',
      }
    }).then(function() {
      setIsGenerating(false);
      setShowNewVenture(false);
    }).catch(function(e) { console.error(e); setIsGenerating(false); });
  };

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Kid-Preneur Ventures</h1>
          <p className="page-subtitle">Learn business by building one. Parent-supervised real-world transactions.</p>
        </div>
        <button id="new-venture-btn" className="btn btn-gold" onClick={function() { setShowNewVenture(true); }}>Start New Venture</button>
      </div>

      {loading ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading ventures...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {ventures.map(function(v: any) {
              return (
                <div key={v.id} className="glass-card" style={{ padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: 4 }}>{v.name}</h2>
                      <span className="badge badge-success">{v.status}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Total Revenue</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-gold)' }}>${(v.revenueUsd || 0).toFixed(2)}</div>
                    </div>
                  </div>
                  {v.escrows && v.escrows.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>Active Escrows</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {v.escrows.map(function(e: any) {
                          return (
                            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                              <div>
                                <div style={{ fontWeight: 500 }}>${(e.amountUsd || 0).toFixed(2)} — {e.buyer}</div>
                              </div>
                              <span className={'badge ' + (e.status === 'RELEASED' ? 'badge-success' : 'badge-warning')}>{e.status}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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

      {showNewVenture && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card scale-in" style={{ padding: 32, width: 600 }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 20 }}>Pitch Your Idea</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label className="text-sm text-muted">Venture Name</label><input className="input mt-2" placeholder="e.g. Neighborhood Lawn Care" /></div>
              <div><label className="text-sm text-muted">Pricing Model</label><input className="input mt-2" placeholder="e.g. $15 per lawn" /></div>
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="btn btn-secondary flex-1" onClick={function() { setShowNewVenture(false); }}>Cancel</button>
                <button className="btn btn-primary flex-2" onClick={generatePlan} disabled={isGenerating}>
                  {isGenerating ? 'AI is analyzing your pitch...' : 'Generate Business Plan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
