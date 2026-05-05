'use client';
import { useState } from 'react';

export default function AiProxyPage() {
  const [agents, setAgents] = useState([
    { id: '1', name: 'Junior Dev Agent #42', status: 'WORKING', project: 'Portfolio Website', progress: 65 },
    { id: '2', name: 'Market Research Agent', status: 'IDLE', project: 'None', progress: 0 },
  ]);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🤖 AI Proxy Manager</h1>
        <p className="page-subtitle">Ages 18-23. Manage your fleet of AI agents to accelerate your ventures.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 24 }}>
        {agents.map(agent => (
          <div key={agent.id} className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{agent.name}</div>
              <span className={`badge ${agent.status === 'WORKING' ? 'badge-primary' : 'badge-secondary'}`}>{agent.status}</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 4 }}>CURRENT TASK</div>
              <div style={{ fontWeight: 500 }}>{agent.project}</div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 8 }}>
                <span>Progress</span>
                <span>{agent.progress}%</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${agent.progress}%`, background: 'var(--gradient-primary)', borderRadius: 4 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-secondary flex-1">View Logs</button>
              <button className="btn btn-primary flex-1">Assign Task</button>
            </div>
          </div>
        ))}

        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', opacity: 0.7 }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>➕</div>
          <div style={{ fontWeight: 600 }}>Deploy New Agent</div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: 8 }}>Available at Level 10</p>
        </div>
      </div>

      <div className="glass-card" style={{ marginTop: 32, padding: 32 }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>Proxy Governance Settings</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Max Tokens / Day</label>
            <input type="range" className="w-full" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>Autonomous Approval Limit</label>
            <input type="text" className="input" placeholder="$0.00 (requires manual confirmation)" />
          </div>
        </div>
      </div>
    </div>
  );
}
