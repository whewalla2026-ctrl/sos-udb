'use client';

import {
  Users, TrendingUp, Activity, DollarSign, Shield, Search,
  CheckCircle, XCircle, Clock, ChevronUp, ChevronDown, Filter, BarChart3, Target, UserCheck,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area } from 'recharts';

var PIE_COLORS = ['#7C3AED', '#06B6D4', '#F59E0B', '#10B981'];

function TrendArrow({ value }: { value: number }) {
  var up = value >= 0;
  return (
    <span style={{ color: up ? 'var(--color-success)' : 'var(--color-danger)', fontSize: '0.8125rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {up ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      {Math.abs(value)}%
    </span>
  );
}

export function AdminDashboard({ data }: { data: any }) {
  var d = data;

  return (
    <div className="fade-in">
      {/* Stats Grid */}
      <div className="grid-stats">
        <div className="stat-card" id="stat-total-users">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} style={{ color: 'var(--color-primary-light)' }} />
            </div>
            <TrendArrow value={d.totalUsersTrend} />
          </div>
          <div className="stat-value">{d.totalUsers.toLocaleString()}</div>
          <div className="stat-label">Total Users</div>
        </div>

        <div className="stat-card" id="stat-active-today">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={20} style={{ color: 'var(--color-accent-light)' }} />
            </div>
            <TrendArrow value={8.2} />
          </div>
          <div className="stat-value">{d.activeUsersToday.toLocaleString()}</div>
          <div className="stat-label">Active Users Today</div>
        </div>

        <div className="stat-card" id="stat-revenue-month">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
            <TrendArrow value={15.3} />
          </div>
          <div className="stat-value">${d.revenueThisMonth.toLocaleString()}</div>
          <div className="stat-label">Revenue This Month</div>
        </div>

        <div className="stat-card" id="stat-system-health">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={20} style={{ color: 'var(--color-success)' }} />
            </div>
            <TrendArrow value={0.02} />
          </div>
          <div className="stat-value">{d.systemUptime}%</div>
          <div className="stat-label">System Uptime</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* User Growth Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} style={{ color: 'var(--color-primary-light)' }} />
            User Growth
          </h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.userGrowth}>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }}
                />
                <Bar dataKey="users" fill="#7C3AED" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Subscription Distribution */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--color-accent-light)' }} />
            Subscription Distribution
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.subscriptionDist} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={false}>
                    {d.subscriptionDist.map(function(_entry: any, idx: number) {
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
              {d.subscriptionDist.map(function(s: any, idx: number) {
                return (
                  <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[idx] }} />
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{s.name}</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, marginLeft: 'auto' }}>{s.value}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Signup Funnel */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={18} style={{ color: 'var(--color-primary-light)' }} />
          Signup Funnel (Last 30 Days)
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16 }}>
          {d.funnel.map(function(step: any, idx: number) {
            var barWidth = Math.max(step.conversionRate * 100, 4);
            return (
              <div key={step.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: PIE_COLORS[idx % PIE_COLORS.length] }}>{step.count}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{step.label}</div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: barWidth + '%', background: PIE_COLORS[idx % PIE_COLORS.length], borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: 4 }}>{(step.conversionRate * 100).toFixed(1)}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Retention Chart + Activation Metrics side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Retention Chart */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--color-accent-light)' }} />
            Day-N Retention
          </h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.retention} barSize={32}>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }}
                  formatter={function(value: number) { return value.toFixed(1) + '%'; }}
                />
                <Bar dataKey="rate" fill="#06B6D4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activation Metrics */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Target size={18} style={{ color: 'var(--color-success)' }} />
            Activation Metrics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {d.activationMetrics.map(function(m: any) {
              var barWidth = Math.max(m.rate * 100, 2);
              return (
                <div key={m.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{m.label}</span>
                    <span style={{ fontWeight: 600 }}>{m.count.toLocaleString()} ({(m.rate * 100).toFixed(1)}%)</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: barWidth + '%', background: '#10B981', borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Service Status */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Activity size={18} style={{ color: 'var(--color-success)' }} />
            System Health — {d.services.filter((s: any) => s.status === 'UP').length}/{d.services.length} Services Online
          </h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
          {d.services.map(function(svc: any) {
            var isUp = svc.status === 'UP';
            return (
              <div key={svc.name} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: isUp ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                border: '1px solid ' + (isUp ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'),
              }}>
                {isUp ? <CheckCircle size={16} style={{ color: 'var(--color-success)' }} /> : <XCircle size={16} style={{ color: 'var(--color-danger)' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{svc.name}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{svc.responseTime}ms</div>
                </div>
                <span className={`badge ${isUp ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.6875rem', flexShrink: 0 }}>
                  {svc.status}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} style={{ color: 'var(--color-primary-light)' }} />
            Recent Audit Log Entries
          </h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {d.auditLogs.map(function(log: any) {
              return (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{log.timestamp}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{log.actor}</td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem' }}>{log.action}</span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{log.target}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
