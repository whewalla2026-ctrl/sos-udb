'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, CreditCard, Zap, Brain, HardDrive, Timer, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

var PLANS = [
  {
    id: 'free', name: 'Free', price: '$0', period: 'forever', color: 'var(--text-muted)',
    features: {
      'API Calls': true, 'AI Hints': true, 'Storage': true, 'Priority Queue': false,
      'Custom Branding': false, 'Team Members': false, 'Analytics': false, 'SLA': false,
    },
    limits: { apiCalls: 1000, aiHints: 50, storage: 100, queues: 1 },
  },
  {
    id: 'pro', name: 'Pro', price: '$29', period: '/mo', color: 'var(--color-primary-light)',
    features: {
      'API Calls': true, 'AI Hints': true, 'Storage': true, 'Priority Queue': true,
      'Custom Branding': true, 'Team Members': true, 'Analytics': true, 'SLA': false,
    },
    limits: { apiCalls: 50000, aiHints: 2000, storage: 10240, queues: 10 },
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '$299', period: '/mo', color: 'var(--color-gold)',
    features: {
      'API Calls': true, 'AI Hints': true, 'Storage': true, 'Priority Queue': true,
      'Custom Branding': true, 'Team Members': true, 'Analytics': true, 'SLA': true,
    },
    limits: { apiCalls: 999999999, aiHints: 999999999, storage: 999999999, queues: 999 },
  },
];

var ALL_FEATURES = [
  { key: 'API Calls', label: 'API Calls', tooltip: 'Monthly API request quota' },
  { key: 'AI Hints', label: 'AI Tutor Hints', tooltip: 'AI-powered hint requests per month' },
  { key: 'Storage', label: 'Storage (MB)', tooltip: 'Evidence and file storage' },
  { key: 'Priority Queue', label: 'Priority Queue', tooltip: 'Skip the line for AI responses' },
  { key: 'Custom Branding', label: 'Custom Branding', tooltip: 'White-label experience' },
  { key: 'Team Members', label: 'Team Members', tooltip: 'Additional team seats' },
  { key: 'Analytics', label: 'Advanced Analytics', tooltip: 'Detailed usage and growth reports' },
  { key: 'SLA', label: '99.9% SLA', tooltip: 'Service Level Agreement guarantee' },
];

var USAGE_METERS = [
  { key: 'apiCalls', label: 'API Calls', icon: Zap, used: 342, total: 1000, color: 'var(--color-primary-light)' },
  { key: 'aiHints', label: 'AI Hints', icon: Brain, used: 23, total: 50, color: 'var(--color-accent-light)' },
  { key: 'storage', label: 'Storage (MB)', icon: HardDrive, used: 42, total: 100, color: 'var(--color-gold)' },
  { key: 'queues', label: 'Active Queues', icon: Timer, used: 1, total: 1, color: 'var(--color-success)' },
];

export default function BillingDashboard() {
  var [showPlans, setShowPlans] = useState(false);
  var currentPlan = 'free';

  function handleUpgrade(planId: string) {
    if (planId === 'pro') {
      alert('🧪 Mock Stripe Checkout\n\nRedirecting to Stripe Checkout for UDB Pro ($29/mo)...\n\nThis is a mock integration. In production, you would be redirected to Stripe.');
    }
  }

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">Billing & Plan</h1>
          <p className="page-subtitle">Manage your subscription and usage.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowPlans(!showPlans)}>
          <Sparkles size={16} />
          {showPlans ? 'Hide Plans' : 'Upgrade Plan'}
          {showPlans ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Current Plan Card */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Current Plan</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              Free
              <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>Active</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>$0</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>forever free</div>
          </div>
        </div>

        {/* Usage Meters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {USAGE_METERS.map(function(meter) {
            var Icon = meter.icon;
            var pct = Math.round((meter.used / meter.total) * 100);
            var isNearLimit = pct >= 80;
            return (
              <div key={meter.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Icon size={16} style={{ color: meter.color }} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{meter.label}</span>
                  </div>
                  <span style={{ fontSize: '0.8125rem', color: isNearLimit ? 'var(--color-danger)' : 'var(--text-muted)', fontWeight: isNearLimit ? 600 : 400 }}>
                    {meter.used.toLocaleString()} / {meter.total.toLocaleString()}
                  </span>
                </div>
                <div className="progress-track">
                  <div className={`progress-fill ${isNearLimit ? 'progress-fill-gold' : ''}`} style={{ width: pct + '%', background: isNearLimit ? undefined : meter.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Plan Comparison */}
      {showPlans && (
        <div className="slide-up" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {PLANS.map(function(plan) {
              var isCurrent = plan.id === currentPlan;
              var isPro = plan.id === 'pro';
              return (
                <div key={plan.id} className="glass-card" style={{
                  padding: 28, display: 'flex', flexDirection: 'column',
                  border: isCurrent ? '2px solid var(--color-primary-light)' : isPro ? '1px solid rgba(124,58,237,0.3)' : undefined,
                  position: 'relative', overflow: 'hidden',
                }}>
                  {isPro && (
                    <div style={{
                      position: 'absolute', top: 12, right: -28, transform: 'rotate(45deg)',
                      background: 'var(--gradient-primary)', color: 'white', fontSize: '0.6875rem',
                      fontWeight: 700, padding: '2px 32px', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>Popular</div>
                  )}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: plan.color, marginBottom: 4 }}>{plan.name}</div>
                    <div>
                      <span style={{ fontSize: '2.5rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{plan.price}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{plan.period}</span>
                    </div>
                  </div>
                  <div style={{ flex: 1, marginBottom: 20 }}>
                    {ALL_FEATURES.map(function(f) {
                      var included = plan.features[f.key as keyof typeof plan.features];
                      return (
                        <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          {included
                            ? <CheckCircle size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                            : <XCircle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          }
                          <span style={{ fontSize: '0.875rem', color: included ? 'var(--text-primary)' : 'var(--text-muted)' }}>{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                  {isCurrent ? (
                    <button className="btn btn-secondary" disabled style={{ width: '100%' }}>Current Plan</button>
                  ) : (
                    <button className={`btn ${isPro ? 'btn-primary' : 'btn-outline'}`} style={{ width: '100%' }} onClick={() => handleUpgrade(plan.id)}>
                      {isPro && <CreditCard size={16} />}
                      {isPro ? 'Subscribe - ' + plan.price + plan.period : 'Contact Sales'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
