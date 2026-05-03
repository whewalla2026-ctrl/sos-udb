'use client';
import { useState } from 'react';

const MOCK_LEDGER = [
  { id: '1', type: 'EARN', amount: 200, balanceAfter: 1250, source: 'QUEST', desc: 'Quest: Make Your Bed - Week 1', date: 'Today, 09:30 AM' },
  { id: '2', type: 'EARN', amount: 150, balanceAfter: 1050, source: 'QUEST', desc: 'Quest: Reading Challenge', date: 'Yesterday, 16:45' },
  { id: '3', type: 'SPEND', amount: -100, balanceAfter: 900, source: 'PURCHASE', desc: 'Doter Skin: Cosmic Blue', date: 'May 1, 2026' },
  { id: '4', type: 'EARN', amount: 500, balanceAfter: 1000, source: 'BONUS', desc: '🎉 Streak Bonus: 10 Days!', date: 'Apr 30, 2026' },
  { id: '5', type: 'EARN', amount: 200, balanceAfter: 500, source: 'MANUAL', desc: 'Mom awarded: Helped with dishes ❤️', date: 'Apr 28, 2026' },
];

export default function BankPage() {
  const [filter, setFilter] = useState<'ALL' | 'EARN' | 'SPEND'>('ALL');
  const balance = 1250;

  const filtered = MOCK_LEDGER.filter(l => filter === 'ALL' || l.type === filter);

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">🏦 My Bank</h1>
        <p className="page-subtitle">Track your coins, earnings, and Doter shop purchases. Blockchain immutable ledger.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
        {/* Ledger */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Transaction History</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['ALL', 'EARN', 'SPEND'] as const).map(f => (
                <button key={f} id={`filter-${f.toLowerCase()}`} onClick={() => setFilter(f)}
                  style={{ padding: '6px 12px', borderRadius: 99, border: 'none', background: filter === f ? 'var(--bg-elevated)' : 'transparent', color: filter === f ? 'white' : 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {f === 'ALL' ? 'All' : f === 'EARN' ? '+ Earned' : '- Spent'}
                </button>
              ))}
            </div>
          </div>

          <table className="data-table" id="ledger-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Source</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id}>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{tx.date}</td>
                  <td style={{ fontWeight: 500 }}>{tx.desc}</td>
                  <td>
                    <span style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{tx.source}</span>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700, color: tx.type === 'EARN' ? 'var(--color-success)' : 'var(--color-danger)' }}>
                    {tx.type === 'EARN' ? '+' : ''}{tx.amount} 🪙
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--color-gold)', fontWeight: 600 }}>{tx.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Balance Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="glass-card" style={{ padding: 32, background: 'var(--gradient-gold)', color: '#1A1A00', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, fontSize: '8rem', opacity: 0.1 }}>🪙</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, opacity: 0.8, marginBottom: 8 }}>Total Balance</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, lineHeight: 1 }}>{balance.toLocaleString()}</div>
            <div style={{ marginTop: 24, display: 'flex', gap: 8 }}>
              <button className="btn w-full" style={{ background: '#1A1A00', color: 'var(--color-gold)' }} id="spend-coins-btn">🛒 Doter Shop</button>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12 }}>How to earn coins:</h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 10, listStyle: 'none', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <li>✅ Complete daily quests (+50 to +200)</li>
              <li>🔥 Maintain a 7+ day streak (+500 bonus)</li>
              <li>🎓 Finish a tutoring session (+100)</li>
              <li>🏆 Achieve a long-term goal (+1000)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
