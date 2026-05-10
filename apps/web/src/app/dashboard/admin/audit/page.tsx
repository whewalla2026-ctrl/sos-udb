'use client';

import { useState } from 'react';
import { Search, Filter, Clock, ChevronLeft, ChevronRight, ShieldAlert } from 'lucide-react';

var ACTION_TYPES = ['ALL', 'USER_SUSPEND', 'USER_DELETE', 'TENANT_CREATED', 'TENANT_SUSPEND', 'FEATURE_TOGGLE', 'BACKUP_COMPLETE', 'DEPLOY_COMPLETE', 'PAYMENT_PROCESSED', 'ROLE_CHANGE'];

var MOCK_LOGS = [
  { id: '1', timestamp: '2026-05-09 23:48:12', actor: 'admin@udb.io', action: 'USER_SUSPEND', target: 'jdoe@example.com', details: 'Policy violation — spam' },
  { id: '2', timestamp: '2026-05-09 23:30:00', actor: 'system', action: 'BACKUP_COMPLETE', target: 'db-primary', details: 'Daily backup finished (14.2 GB)' },
  { id: '3', timestamp: '2026-05-09 22:15:44', actor: 'sarah@acme.com', action: 'TENANT_CREATED', target: 'Acme Corp', details: 'Enterprise tier, 150 seats' },
  { id: '4', timestamp: '2026-05-09 21:00:12', actor: 'admin@udb.io', action: 'FEATURE_TOGGLE', target: 'achievementNFTs', details: 'Enabled for all tenants' },
  { id: '5', timestamp: '2026-05-09 20:45:33', actor: 'system', action: 'DEPLOY_COMPLETE', target: 'v2.4.1', details: 'Rollout successful (12 pods)' },
  { id: '6', timestamp: '2026-05-09 19:30:01', actor: 'admin@udb.io', action: 'ROLE_CHANGE', target: 'ivy@example.com', details: 'Promoted from MODERATOR to ADMIN' },
  { id: '7', timestamp: '2026-05-09 18:12:55', actor: 'billing@stripe.com', action: 'PAYMENT_PROCESSED', target: 'INV-0042', details: '$2,499 — Bright Future Schools' },
  { id: '8', timestamp: '2026-05-09 17:00:22', actor: 'system', action: 'USER_DELETE', target: 'spam@example.com', details: 'Automated cleanup of inactive account' },
  { id: '9', timestamp: '2026-05-09 16:30:18', actor: 'admin@udb.io', action: 'TENANT_SUSPEND', target: 'EduTech Solutions', details: 'Payment overdue >30 days' },
  { id: '10', timestamp: '2026-05-09 15:00:00', actor: 'system', action: 'BACKUP_COMPLETE', target: 'db-replica', details: 'Replica sync complete' },
  { id: '11', timestamp: '2026-05-09 14:22:41', actor: 'admin@udb.io', action: 'FEATURE_TOGGLE', target: 'biometricTracking', details: 'Disabled for Free tier' },
  { id: '12', timestamp: '2026-05-09 13:10:09', actor: 'devops@udb.io', action: 'DEPLOY_COMPLETE', target: 'v2.4.0', details: 'Hotfix — WebSocket memory leak' },
];

var PAGE_SIZES = [5, 10, 20];

export default function AuditPage() {
  var [search, setSearch] = useState('');
  var [actionFilter, setActionFilter] = useState('ALL');
  var [page, setPage] = useState(0);
  var [pageSize, setPageSize] = useState(10);

  var filtered = MOCK_LOGS.filter(function(log) {
    var matchesSearch = !search || log.actor.toLowerCase().includes(search.toLowerCase()) || log.target.toLowerCase().includes(search.toLowerCase()) || log.details.toLowerCase().includes(search.toLowerCase());
    var matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  var totalPages = Math.ceil(filtered.length / pageSize);
  var paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldAlert size={22} style={{ color: 'var(--color-gold)' }} />
          Immutable Audit Log
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>All actions are permanently recorded and cannot be altered.</p>
      </div>

      {/* Search & Filter */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search logs..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); setPage(0); }}
            style={{ paddingLeft: 42 }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select
            className="input"
            value={actionFilter}
            onChange={function(e) { setActionFilter(e.target.value); setPage(0); }}
            style={{ paddingLeft: 36, paddingRight: 32, appearance: 'none', cursor: 'pointer', minWidth: 180 }}
          >
            {ACTION_TYPES.map(function(a) {
              return <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : a.replace(/_/g, ' ')}</option>;
            })}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 170 }}>Timestamp</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(function(log) {
              return (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontFamily: 'monospace' }}>{log.timestamp}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{log.actor}</td>
                  <td>
                    <span className="badge badge-primary" style={{ fontSize: '0.6875rem', fontFamily: 'monospace' }}>{log.action}</span>
                  </td>
                  <td style={{ fontSize: '0.875rem' }}>{log.target}</td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No log entries found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Rows per page:</span>
          <select
            value={pageSize}
            onChange={function(e) { setPageSize(Number(e.target.value)); setPage(0); }}
            style={{ background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', padding: '4px 8px', fontSize: '0.8125rem', outline: 'none' }}
          >
            {PAGE_SIZES.map(function(s) {
              return <option key={s} value={s}>{s}</option>;
            })}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filtered.length)} of {filtered.length}
          </span>
          <button className="btn btn-secondary btn-sm btn-icon" disabled={page === 0} onClick={function() { setPage(page - 1); }}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-secondary btn-sm btn-icon" disabled={page >= totalPages - 1} onClick={function() { setPage(page + 1); }}>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
