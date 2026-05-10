'use client';

import { useState } from 'react';
import { DollarSign, TrendingUp, Users, CreditCard, ArrowUpRight, ArrowDownRight, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

var PIE_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981'];

var MOCK_SUBSCRIPTION_DATA = [
  { name: 'Free', value: 5620 },
  { name: 'Starter', value: 3490 },
  { name: 'Pro', value: 2245 },
  { name: 'Enterprise', value: 1128 },
];

var MOCK_INVOICES = [
  { id: 'INV-001', customer: 'Acme Corp', amount: 2499, plan: 'Enterprise', status: 'PAID', date: '2026-05-01' },
  { id: 'INV-002', customer: 'Global Learning Inc', amount: 999, plan: 'Pro', status: 'PAID', date: '2026-05-01' },
  { id: 'INV-003', customer: 'Sunrise Academy', amount: 299, plan: 'Starter', status: 'PENDING', date: '2026-05-01' },
  { id: 'INV-004', customer: 'Bright Future Schools', amount: 2499, plan: 'Enterprise', status: 'PAID', date: '2026-04-30' },
  { id: 'INV-005', customer: 'EduTech Solutions', amount: 999, plan: 'Pro', status: 'OVERDUE', date: '2026-04-15' },
  { id: 'INV-006', customer: 'Mountain View District', amount: 4999, plan: 'Enterprise', status: 'PAID', date: '2026-04-28' },
  { id: 'INV-007', customer: 'Pioneer Learning', amount: 999, plan: 'Pro', status: 'PENDING', date: '2026-05-02' },
];

export default function BillingPage() {
  var [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Billing Overview</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Revenue, subscriptions, and invoicing</p>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <span style={{ color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={14} /> 12.3%
            </span>
          </div>
          <div className="stat-value">$84,720</div>
          <div className="stat-label">Monthly Recurring Revenue (MRR)</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} style={{ color: 'var(--color-accent-light)' }} />
            </div>
            <span style={{ color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={14} /> 15.8%
            </span>
          </div>
          <div className="stat-value">$1,016,640</div>
          <div className="stat-label">Annual Recurring Revenue (ARR)</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <span style={{ color: 'var(--color-success)', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
              <ArrowUpRight size={14} /> 8.4%
            </span>
          </div>
          <div className="stat-value">12,483</div>
          <div className="stat-label">Active Subscriptions</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Subscription Distribution Bar */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>Subscription Distribution</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_SUBSCRIPTION_DATA}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {MOCK_SUBSCRIPTION_DATA.map(function(_entry: any, idx: number) {
                    return <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>Revenue by Plan</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={MOCK_SUBSCRIPTION_DATA} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                    {MOCK_SUBSCRIPTION_DATA.map(function(_entry: any, idx: number) {
                      return <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {MOCK_SUBSCRIPTION_DATA.map(function(s: any, idx: number) {
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[idx] }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: 'auto' }}>{s.value.toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} style={{ color: 'var(--color-primary-light)' }} />
            Recent Invoices
          </h3>
          <button className="btn btn-secondary btn-sm">
            <Download size={16} /> Export
          </button>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ width: 100 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_INVOICES.map(function(inv) {
              var statusBadge = inv.status === 'PAID' ? 'badge-success' : inv.status === 'PENDING' ? 'badge-gold' : 'badge-danger';
              return (
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', fontWeight: 600 }}>{inv.id}</td>
                  <td style={{ fontSize: '0.875rem' }}>{inv.customer}</td>
                  <td style={{ fontWeight: 600 }}>${inv.amount.toLocaleString()}</td>
                  <td><span className="badge badge-primary">{inv.plan}</span></td>
                  <td><span className={`badge ${statusBadge}`}>{inv.status.charAt(0) + inv.status.slice(1).toLowerCase()}</span></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{inv.date}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem' }}>View</button>
                      {selectedPlan === inv.plan ? (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--color-success)' }} onClick={function() { setSelectedPlan(null); }}>Applied</button>
                      ) : (
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: '0.75rem', color: 'var(--color-gold)' }} onClick={function() { setSelectedPlan(inv.plan); }}>Upgrade</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
