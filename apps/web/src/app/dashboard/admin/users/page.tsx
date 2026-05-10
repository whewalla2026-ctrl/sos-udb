'use client';

import { useState } from 'react';
import { Search, Filter, Eye, UserMinus, Copy, MoreHorizontal, Shield, User, Users } from 'lucide-react';

var ROLES = ['ALL', 'CHILD', 'PARENT', 'ADMIN'];

var MOCK_USERS = [
  { id: 'u-001', name: 'Alice Johnson', email: 'alice@example.com', role: 'CHILD', tenant: 'Acme Corp', status: 'ACTIVE', lastActive: '2 min ago', avatar: '' },
  { id: 'u-002', name: 'Bob Smith', email: 'bob@example.com', role: 'PARENT', tenant: 'Acme Corp', status: 'ACTIVE', lastActive: '15 min ago', avatar: '' },
  { id: 'u-003', name: 'Charlie Brown', email: 'charlie@example.com', role: 'CHILD', tenant: 'Sunrise Academy', status: 'ACTIVE', lastActive: '1 hour ago', avatar: '' },
  { id: 'u-004', name: 'Diana Prince', email: 'diana@example.com', role: 'ADMIN', tenant: 'UDB Platform', status: 'ACTIVE', lastActive: '5 min ago', avatar: '' },
  { id: 'u-005', name: 'Eve Williams', email: 'eve@example.com', role: 'PARENT', tenant: 'Global Learning Inc', status: 'SUSPENDED', lastActive: '2 days ago', avatar: '' },
  { id: 'u-006', name: 'Frank Miller', email: 'frank@example.com', role: 'CHILD', tenant: 'Bright Future Schools', status: 'ACTIVE', lastActive: '30 min ago', avatar: '' },
  { id: 'u-007', name: 'Grace Lee', email: 'grace@example.com', role: 'PARENT', tenant: 'EduTech Solutions', status: 'ACTIVE', lastActive: '1 day ago', avatar: '' },
  { id: 'u-008', name: 'Henry Davis', email: 'henry@example.com', role: 'CHILD', tenant: 'Mountain View District', status: 'ACTIVE', lastActive: '10 min ago', avatar: '' },
  { id: 'u-009', name: 'Ivy Chen', email: 'ivy@example.com', role: 'ADMIN', tenant: 'UDB Platform', status: 'ACTIVE', lastActive: '1 hour ago', avatar: '' },
  { id: 'u-010', name: 'Jack Wilson', email: 'jack@example.com', role: 'CHILD', tenant: 'Learning Tree Co-op', status: 'INACTIVE', lastActive: '1 week ago', avatar: '' },
  { id: 'u-011', name: 'Karen Taylor', email: 'karen@example.com', role: 'PARENT', tenant: 'Pioneer Learning', status: 'ACTIVE', lastActive: '3 hours ago', avatar: '' },
  { id: 'u-012', name: 'Leo Martinez', email: 'leo@example.com', role: 'CHILD', tenant: 'Star Education Group', status: 'ACTIVE', lastActive: '1 min ago', avatar: '' },
];

function RoleIcon({ role }: { role: string }) {
  if (role === 'ADMIN') return <Shield size={14} />;
  if (role === 'PARENT') return <Users size={14} />;
  return <User size={14} />;
}

export default function UsersPage() {
  var [search, setSearch] = useState('');
  var [roleFilter, setRoleFilter] = useState('ALL');

  var filtered = MOCK_USERS.filter(function(u) {
    var matchesSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    var matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>User Management</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{filtered.length} users</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 250, maxWidth: 400 }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search users..."
            value={search}
            onChange={function(e) { setSearch(e.target.value); }}
            style={{ paddingLeft: 42 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-glass)', border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', padding: 4 }}>
          {ROLES.map(function(r) {
            var active = roleFilter === r;
            return (
              <button
                key={r}
                className={active ? 'btn btn-primary btn-sm' : 'btn btn-ghost btn-sm'}
                onClick={function() { setRoleFilter(r); }}
                style={active ? {} : { border: 'none' }}
              >
                {r === 'ALL' ? <Filter size={14} /> : <RoleIcon role={r} />}
                {r.charAt(0) + r.slice(1).toLowerCase()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Tenant</th>
              <th>Status</th>
              <th>Last Active</th>
              <th style={{ width: 140 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(function(u) {
              var statusColor = u.status === 'ACTIVE' ? 'badge-success' : u.status === 'SUSPENDED' ? 'badge-danger' : 'badge-primary';
              var roleColor = u.role === 'ADMIN' ? 'badge-gold' : u.role === 'PARENT' ? 'badge-accent' : 'badge-primary';
              return (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {u.avatar ? <img src={u.avatar} alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} /> : u.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600 }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>{u.email}</td>
                  <td>
                    <span className={`badge ${roleColor}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RoleIcon role={u.role} />
                      {u.role.charAt(0) + u.role.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{u.tenant}</td>
                  <td><span className={`badge ${statusColor}`}>{u.status.charAt(0) + u.status.slice(1).toLowerCase()}</span></td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{u.lastActive}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" title="View Profile"><Eye size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Impersonate" style={{ color: 'var(--color-gold)' }}><Copy size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="Delete" style={{ color: 'var(--color-danger)' }}><UserMinus size={16} /></button>
                      <button className="btn btn-ghost btn-sm btn-icon" title="More"><MoreHorizontal size={16} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
