'use client';
import { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';

const GET_AGENTS = gql`
  query GetMySkillAgents {
    mySkillAgents {
      id
      skillName
      status
      autonomyLevel
      lastAction
    }
  }
`;

const DEPLOY_AGENT = gql`
  mutation DeploySkillAgent($skillName: String!) {
    deploySkillAgent(skillName: $skillName) {
      id
      skillName
    }
  }
`;

const COMPLETE_MASTERY = gql`
  mutation CompleteSkillMastery($agentId: String!) {
    completeSkillMastery(agentId: $agentId) {
      achievement {
        id
        title
      }
      mintResult {
        txHash
      }
    }
  }
`;

export default function SkillAgentsPage() {
  const { data, loading, refetch } = useQuery(GET_AGENTS);
  const [deployAgent, { loading: isDeploying }] = useMutation(DEPLOY_AGENT);
  const [completeMastery, { loading: isCompleting }] = useMutation(COMPLETE_MASTERY);
  const [newSkill, setNewSkill] = useState('');

  const handleDeploy = async () => {
    if (!newSkill) return;
    await deployAgent({ variables: { skillName: newSkill } });
    setNewSkill('');
    refetch();
  };

  const handleComplete = async (agentId: string) => {
    await completeMastery({ variables: { agentId } });
    refetch();
  };

  const agents = data?.mySkillAgents || [];

  return (
    <div className="fade-in">
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title">🤖 Autonomous Skill Agents</h1>
          <p className="page-subtitle">Deploy AI agents to master complex skills through proactive learning paths.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: 24 }}>
        <div>
          {/* Active Agents */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {agents.length === 0 && !loading && (
              <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: 16 }}>🚀</div>
                <p style={{ color: 'var(--text-secondary)' }}>No active agents. Deploy your first skill agent to begin!</p>
              </div>
            )}
            {agents.map((agent: any) => (
              <div key={agent.id} className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{agent.skillName} Agent</h2>
                    <span className="badge badge-primary" style={{ marginTop: 4 }}>{agent.status}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Autonomy</div>
                    <div style={{ fontWeight: 700 }}>{(agent.autonomyLevel * 100).toFixed(0)}%</div>
                  </div>
                </div>

                <div style={{ background: 'var(--bg-glass)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--bg-glass-border)', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)', fontWeight: 700, marginBottom: 4 }}>LAST ACTION</div>
                  <p style={{ fontSize: '0.9375rem', fontStyle: 'italic' }}>"{agent.lastAction}"</p>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-secondary flex-1" disabled={agent.status === 'COMPLETED'}>Review Path</button>
                  <button 
                    className="btn btn-primary flex-1" 
                    onClick={() => handleComplete(agent.id)}
                    disabled={isCompleting || agent.status === 'COMPLETED'}
                  >
                    {agent.status === 'COMPLETED' ? '✅ Mastered' : '🏆 Master & Mint'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: 16 }}>Deploy New Agent</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input 
                className="input" 
                placeholder="Skill name (e.g. Solidity)" 
                value={newSkill}
                onChange={e => setNewSkill(e.target.value)}
              />
              <button 
                className="btn btn-gold w-full" 
                onClick={handleDeploy}
                disabled={isDeploying || !newSkill}
              >
                {isDeploying ? 'Initializing...' : '✨ Deploy Agent'}
              </button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <h4 style={{ fontWeight: 700, marginBottom: 8 }}>What is an AI Proxy?</h4>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Skill Agents don't just teach; they *execute*. For students 18-23, they act as Junior Developers or researchers, preparing reports and scaffolded code for you to review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
