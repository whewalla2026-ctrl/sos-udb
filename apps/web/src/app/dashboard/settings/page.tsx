'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ME, UPDATE_PROFILE } from '../../../lib/queries';

export default function SettingsPage() {
  var { data, loading } = useQuery(GET_ME);
  var [updateProfile] = useMutation(UPDATE_PROFILE);
  var [displayName, setDisplayName] = useState('');
  var [saved, setSaved] = useState(false);
  var initialized = useRef(false);

  var user = data?.me;
  useEffect(function() {
    if (user && user.displayName && !initialized.current) {
      setDisplayName(user.displayName);
      initialized.current = true;
    }
  }, [user]);

  var handleSave = function() {
    updateProfile({ variables: { data: { displayName: displayName } } }).then(function() {
      setSaved(true);
      setTimeout(function() { setSaved(false); }, 3000);
    }).catch(function(e) { console.error(e); });
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences.</p>
      </div>
      {loading ? (
        <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Loading settings...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 600 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Profile</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 6 }}>Display Name</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px 16px' }}
                value={displayName} onChange={function(e) { setDisplayName(e.target.value); }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 6 }}>Email</label>
              <input type="email" className="input-field" style={{ width: '100%', padding: '10px 16px' }}
                value={user?.email || ''} disabled />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: 6 }}>Role</label>
              <input type="text" className="input-field" style={{ width: '100%', padding: '10px 16px' }}
                value={user?.role || ''} disabled />
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
          <div className="glass-card" style={{ padding: 24 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Preferences</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span>Email notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span>Push notifications</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked /> <span>Weekly digest</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
