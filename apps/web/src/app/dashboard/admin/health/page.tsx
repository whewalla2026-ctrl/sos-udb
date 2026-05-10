'use client';

import { CheckCircle, XCircle, ExternalLink, RefreshCw, Activity, Clock } from 'lucide-react';

var MOCK_SERVICES = [
  { name: 'API Gateway', status: 'UP', responseTime: 12, uptime: 99.99 },
  { name: 'Authentication Service', status: 'UP', responseTime: 8, uptime: 99.98 },
  { name: 'GraphQL API', status: 'UP', responseTime: 15, uptime: 99.97 },
  { name: 'Database (Primary)', status: 'UP', responseTime: 3, uptime: 100.0 },
  { name: 'Database (Replica)', status: 'UP', responseTime: 4, uptime: 99.95 },
  { name: 'Redis Cache', status: 'UP', responseTime: 1, uptime: 100.0 },
  { name: 'AI Tutor Service', status: 'UP', responseTime: 320, uptime: 99.89 },
  { name: 'Biometric Pipeline', status: 'UP', responseTime: 45, uptime: 99.92 },
  { name: 'Notification Service', status: 'UP', responseTime: 22, uptime: 99.93 },
  { name: 'File Storage (CDN)', status: 'UP', responseTime: 18, uptime: 99.99 },
  { name: 'WebSocket Relay', status: 'DOWN', responseTime: 0, uptime: 97.12 },
  { name: 'Audit Logger', status: 'UP', responseTime: 6, uptime: 100.0 },
  { name: 'Payment Processor', status: 'UP', responseTime: 87, uptime: 99.96 },
  { name: 'Analytics Engine', status: 'UP', responseTime: 34, uptime: 99.88 },
];

export default function HealthPage() {
  var upCount = MOCK_SERVICES.filter(function(s) { return s.status === 'UP'; }).length;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>System Health</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={14} />
            Last checked: just now
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="https://grafana.udb.io" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <ExternalLink size={16} /> Grafana
          </a>
          <a href="https://prometheus.udb.io" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none' }}>
            <ExternalLink size={16} /> Prometheus
          </a>
          <button className="btn btn-primary btn-sm">
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Activity size={32} style={{ color: 'var(--color-success)' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {upCount}/{MOCK_SERVICES.length} Online
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>System Uptime: 99.97%</div>
          </div>
        </div>
        <div className="progress-track" style={{ maxWidth: 400, margin: '12px auto 0', height: 6 }}>
          <div className="progress-fill progress-fill-success" style={{ width: `${(upCount / MOCK_SERVICES.length) * 100}%` }} />
        </div>
      </div>

      {/* Services Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {MOCK_SERVICES.map(function(svc) {
          var isUp = svc.status === 'UP';
          return (
            <div key={svc.name} className="glass-card" style={{
              padding: 20, display: 'flex', alignItems: 'center', gap: 14,
              borderColor: isUp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)',
            }}>
              <div style={{ flexShrink: 0 }}>
                {isUp ? (
                  <CheckCircle size={28} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <XCircle size={28} style={{ color: 'var(--color-danger)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 2 }}>{svc.name}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>{svc.responseTime}ms response</span>
                  <span>{svc.uptime}% uptime</span>
                </div>
              </div>
              <span className={`badge ${isUp ? 'badge-success' : 'badge-danger'}`}>
                {svc.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
