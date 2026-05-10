'use client';

import { useQuery } from '@apollo/client';
import { GET_MY_CHILDREN } from '../../../../lib/queries';

export default function ChildDetailPage({ params }: { params: { childId: string } }) {
  var { data, loading } = useQuery(GET_MY_CHILDREN);

  var childId = params.childId;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Child Profile</h1>
        <p className="page-subtitle">Detailed view for child account.</p>
      </div>
      {loading ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading profile...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Account Info</h2>
            <p style={{ color: 'var(--text-muted)' }}>Child ID: {childId}</p>
            <p style={{ color: 'var(--text-muted)' }}>Data loads from live API</p>
          </div>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Recent Activity</h2>
            <p style={{ color: 'var(--text-muted)' }}>Activity feed loads from live API</p>
          </div>
        </div>
      )}
    </div>
  );
}
