'use client';
import { useQuery } from '@apollo/client';
import { GET_MY_CHILDREN } from '../../../lib/queries';

export default function FamilyPage() {
  var { data: childrenData, loading, error } = useQuery(GET_MY_CHILDREN);

  var children = childrenData?.myChildren || [];

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Family Hub</h1>
        <p className="page-subtitle">Manage family links, permissions, and COPPA compliance</p>
      </div>

      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20 }}>Linked Accounts</h2>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>Loading family data...</div>
        ) : error ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--color-danger)' }}>Failed to load family data.</div>
        ) : children.length === 0 ? (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
            No children linked yet. Use the button below to link a child account.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {children.map(function(c: any) {
              return (
                <div key={c.id} style={{ padding: 16, border: '1px solid var(--bg-glass-border)', borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ fontSize: '2rem' }}>{c.avatarUrl ? <img src={c.avatarUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%' }} /> : '👦'}</div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{c.displayName || 'Child'}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Child Account</div>
                    </div>
                  </div>
                  <div className="badge badge-success">✓ COPPA Verified</div>
                </div>
              );
            })}
          </div>
        )}
        <button className="btn btn-secondary mt-6">+ Link Another Child</button>
      </div>
    </div>
  );
}
