'use client';

import { useState } from 'react';
import { Search, Building2, Eye, PauseCircle, PlayCircle, ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

var MOCK_TENANTS = [
  { id: 't-001', name: 'Acme Corp', plan: 'Enterprise', users: 145, status: 'ACTIVE', created: '2024-01-15' },
  { id: 't-002', name: 'Global Learning Inc', plan: 'Pro', users: 89, status: 'ACTIVE', created: '2024-03-22' },
  { id: 't-003', name: 'Sunrise Academy', plan: 'Starter', users: 23, status: 'ACTIVE', created: '2024-06-10' },
  { id: 't-004', name: 'Bright Future Schools', plan: 'Enterprise', users: 210, status: 'ACTIVE', created: '2023-11-01' },
  { id: 't-005', name: 'EduTech Solutions', plan: 'Pro', users: 67, status: 'SUSPENDED', created: '2024-02-28' },
  { id: 't-006', name: 'Kids First Foundation', plan: 'Starter', users: 15, status: 'ACTIVE', created: '2024-08-05' },
  { id: 't-007', name: 'Mountain View District', plan: 'Enterprise', users: 320, status: 'ACTIVE', created: '2023-09-12' },
  { id: 't-008', name: 'Learning Tree Co-op', plan: 'Pro', users: 52, status: 'ACTIVE', created: '2024-04-18' },
  { id: 't-009', name: 'NextGen Academy', plan: 'Starter', users: 31, status: 'SUSPENDED', created: '2024-07-30' },
  { id: 't-010', name: 'Pioneer Learning', plan: 'Pro', users: 76, status: 'ACTIVE', created: '2024-05-14' },
  { id: 't-011', name: 'Star Education Group', plan: 'Enterprise', users: 180, status: 'ACTIVE', created: '2024-01-08' },
  { id: 't-012', name: 'Horizon Academies', plan: 'Starter', users: 28, status: 'ACTIVE', created: '2024-09-01' },
];

var PAGE_SIZE = 5;

export default function TenantsPage() {
  var [search, setSearch] = useState('');
  var [page, setPage] = useState(0);

  var filtered = MOCK_TENANTS.filter(function(t) {
    return !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.id.toLowerCase().includes(search.toLowerCase());
  });

  var totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  var paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Tenant Management</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{filtered.length} tenants</p>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 400 }}>
        <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          className="input"
          placeholder="Search tenants..."
          value={search}
          onChange={function(e) { setSearch(e.target.value); setPage(0); }}
          style={{ paddingLeft: 42 }}
        />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant ID</th>
              <th>Name</th>
              <th>Plan</th>
              <th>Users</th>
              <th>Status</th>
              <th>Created</th>
              <th style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {paged.map(function(t) {
              var isActive = t.status === 'ACTIVE';
              return (
                <tr key={t.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{t.id}</td>
                  <td style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-md)', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Building2 size={16} style={{ color: 'white' }} />
                    </div>
                    {t.name}
                  </td>
                  <td><span className={`badge ${t.plan === 'Enterprise' ? 'badge-gold' : t.plan === 'Pro' ? 'badge-primary' : 'badge-accent'}`}>{t.plan}</span></td>
                  <td style={{ fontWeight: 600 }}>{t.users}</td>
                  <td>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                      {isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{t.created}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="View"><Eye size={16} /></button>
                      {isActive ? (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Suspend" style={{ color: 'var(--color-warning)' }}><PauseCircle size={16} /></button>
                      ) : (
                        <button className="btn btn-ghost btn-sm btn-icon" title="Activate" style={{ color: 'var(--color-success)' }}><PlayCircle size={16} /></button>
                      )}
                      <button className="btn btn-ghost btn-sm btn-icon" title="More"><MoreHorizontal size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paged.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No tenants found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 20 }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={function() { setPage(page - 1); }}>
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Page {page + 1} of {totalPages}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={function() { setPage(page + 1); }}>
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
