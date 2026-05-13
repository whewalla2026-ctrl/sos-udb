'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  GET_MY_DEVICES, GET_MY_CONFLICTS, REGISTER_DEVICE,
  RESOLVE_CONFLICT, ENQUEUE_OFFLINE_CHANGE,
} from '../../../lib/queries';
import { Smartphone, Monitor, Tablet, AlertTriangle, CheckCircle, RefreshCw, XCircle } from 'lucide-react';

var DEVICE_ICONS: Record<string, any> = { web: Monitor, mobile: Smartphone, tablet: Tablet };

function DeviceIcon({ type }: { type: string }) {
  var Icon = DEVICE_ICONS[type] || Monitor;
  return <Icon size={20} />;
}

function ConflictBadge({ resolution }: { resolution: string }) {
  if (resolution === 'pending') return <span style={{ background: '#f59e0b20', color: '#f59e0b', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>Pending</span>;
  if (resolution === 'local_wins') return <span style={{ background: '#3b82f620', color: '#3b82f6', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>Local Wins</span>;
  if (resolution === 'remote_wins') return <span style={{ background: '#8b5cf620', color: '#8b5cf6', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>Remote Wins</span>;
  if (resolution === 'merged') return <span style={{ background: '#10b98120', color: '#10b981', padding: '2px 10px', borderRadius: 99, fontSize: '0.75rem', fontWeight: 600 }}>Merged</span>;
  return null;
}

function SyncPage() {
  var { data: devicesData, loading: devicesLoading, refetch: refetchDevices } = useQuery(GET_MY_DEVICES);
  var { data: conflictsData, loading: conflictsLoading, refetch: refetchConflicts } = useQuery(GET_MY_CONFLICTS);
  var [registerDevice] = useMutation(REGISTER_DEVICE);
  var [resolveConflict] = useMutation(RESOLVE_CONFLICT);
  var [enqueueOffline] = useMutation(ENQUEUE_OFFLINE_CHANGE);

  var [showRegister, setShowRegister] = useState(false);
  var [deviceId, setDeviceId] = useState('');
  var [deviceName, setDeviceName] = useState('');
  var [deviceType, setDeviceType] = useState('web');
  var [regMsg, setRegMsg] = useState('');
  var [resolvingId, setResolvingId] = useState<string | null>(null);

  var devices = devicesData?.myDevices || [];
  var conflicts = conflictsData?.myConflicts || [];
  var pendingConflicts = conflicts.filter((c: any) => c.resolution === 'pending');

  var handleRegister = async function () {
    try {
      var id = deviceId || 'device_' + Date.now();
      await registerDevice({ variables: { input: { deviceId: id, deviceName: deviceName || undefined, deviceType: deviceType } } });
      setRegMsg('Device registered successfully!');
      setShowRegister(false);
      setDeviceId('');
      setDeviceName('');
      refetchDevices();
      setTimeout(() => setRegMsg(''), 3000);
    } catch (e: any) { setRegMsg('Error: ' + e.message); }
  };

  var handleResolve = async function (conflictId: string, resolution: string) {
    setResolvingId(conflictId);
    try {
      await resolveConflict({ variables: { input: { conflictId, resolution } } });
      refetchConflicts();
    } catch (e: any) { console.error(e); }
    finally { setResolvingId(null); }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Sync & Devices</h1>
        <p className="page-subtitle">Manage your connected devices and resolve synchronization conflicts.</p>
      </div>

      {/* Register Device */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>Connected Devices</h2>
          <button className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
            onClick={() => setShowRegister(!showRegister)}>
            {showRegister ? 'Cancel' : '+ Add Device'}
          </button>
        </div>

        {regMsg && (
          <div style={{ padding: '8px 16px', background: regMsg.startsWith('Error') ? '#ef444420' : '#10b98120', borderRadius: 8, marginBottom: 12, fontSize: '0.875rem', color: regMsg.startsWith('Error') ? '#ef4444' : '#10b981' }}>
            {regMsg}
          </div>
        )}

        {showRegister && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20, padding: 16, background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--bg-glass-border)' }}>
            <input className="input-field" style={{ padding: '10px 16px' }} placeholder="Device ID (leave blank for auto)" value={deviceId} onChange={e => setDeviceId(e.target.value)} />
            <input className="input-field" style={{ padding: '10px 16px' }} placeholder="Device Name (e.g. My Phone)" value={deviceName} onChange={e => setDeviceName(e.target.value)} />
            <select className="input-field" style={{ padding: '10px 16px' }} value={deviceType} onChange={e => setDeviceType(e.target.value)}>
              <option value="web">Web Browser</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
            <button className="btn btn-primary" onClick={handleRegister}>Register Device</button>
          </div>
        )}

        {devicesLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading devices...</div>
        ) : devices.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No devices registered yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {devices.map((d: any) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 10, border: '1px solid var(--bg-glass-border)' }}>
                <DeviceIcon type={d.deviceType} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{d.deviceName || d.deviceId}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.deviceType} · {d.lastSyncAt ? new Date(d.lastSyncAt).toLocaleString() : 'Never synced'}</div>
                </div>
                {d.stateHash && <CheckCircle size={16} style={{ color: '#10b981', flexShrink: 0 }} />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conflicts */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>
            Sync Conflicts
            {pendingConflicts.length > 0 && (
              <span style={{ marginLeft: 8, background: '#f59e0b', color: 'white', fontSize: '0.6875rem', fontWeight: 700, borderRadius: 99, padding: '2px 8px', verticalAlign: 'middle' }}>
                {pendingConflicts.length}
              </span>
            )}
          </h2>
          <button className="btn btn-ghost" style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
            onClick={() => refetchConflicts()}>
            <RefreshCw size={14} style={{ marginRight: 6 }} /> Refresh
          </button>
        </div>

        {conflictsLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading conflicts...</div>
        ) : conflicts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '32px 0', color: 'var(--text-muted)' }}>
            <CheckCircle size={32} style={{ color: '#10b981' }} />
            <div>No conflicts detected. All devices are in sync.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {conflicts.map((c: any) => (
              <div key={c.id} style={{ padding: 16, background: 'var(--bg-glass)', borderRadius: 12, border: '1px solid var(--bg-glass-border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AlertTriangle size={16} style={{ color: c.resolution === 'pending' ? '#f59e0b' : '#10b981' }} />
                      {c.resourceType} Conflict — {c.resourceId}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Device: {c.deviceId} · {new Date(c.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <ConflictBadge resolution={c.resolution} />
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                  <div style={{ marginBottom: 4 }}>Local: <code style={{ fontSize: '0.75rem', background: '#1e293b', padding: '1px 6px', borderRadius: 4 }}>{JSON.stringify(c.localValue).substring(0, 80)}...</code></div>
                  <div>Remote: <code style={{ fontSize: '0.75rem', background: '#1e293b', padding: '1px 6px', borderRadius: 4 }}>{JSON.stringify(c.remoteValue).substring(0, 80)}...</code></div>
                </div>
                {c.resolution === 'pending' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                      disabled={resolvingId === c.id}
                      onClick={() => handleResolve(c.id, 'local_wins')}>
                      {resolvingId === c.id ? '...' : 'Keep Local'}
                    </button>
                    <button className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                      disabled={resolvingId === c.id}
                      onClick={() => handleResolve(c.id, 'remote_wins')}>
                      Keep Remote
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '6px 14px', fontSize: '0.75rem' }}
                      disabled={resolvingId === c.id}
                      onClick={() => handleResolve(c.id, 'merged')}>
                      Merge
                    </button>
                  </div>
                )}
                {c.resolvedAt && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                    Resolved at {new Date(c.resolvedAt).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncPage;
