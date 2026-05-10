'use client';

import { useState } from 'react';
import { Flag, ToggleLeft, ToggleRight, Info, Shield } from 'lucide-react';

var FEATURE_FLAGS = [
  { id: 'aiTutor', name: 'AI Tutor', description: 'Personalized AI tutoring sessions with subject coaching', enabled: true, minTier: 'Free' },
  { id: 'biometricTracking', name: 'Biometric Tracking', description: 'Track sleep, steps, focus, and stress levels', enabled: true, minTier: 'Starter' },
  { id: 'marketplace', name: 'Marketplace', description: 'In-app marketplace for rewards and items', enabled: true, minTier: 'Free' },
  { id: 'ventures', name: 'Ventures', description: 'Entrepreneurship module for creating businesses', enabled: true, minTier: 'Pro' },
  { id: 'messaging', name: 'Messaging', description: 'Family messaging and notifications', enabled: true, minTier: 'Free' },
  { id: 'evidenceGallery', name: 'Evidence Gallery', description: 'Photo and video evidence logging for quests', enabled: true, minTier: 'Free' },
  { id: 'weeklyPlan', name: 'Weekly Plan', description: 'AI-generated weekly activity plans', enabled: true, minTier: 'Starter' },
  { id: 'futureSelf', name: 'Future Self', description: 'Future self journaling and visualization', enabled: false, minTier: 'Pro' },
  { id: 'safetyMonitor', name: 'Safety Monitor', description: 'AI-powered safety monitoring and alerts', enabled: true, minTier: 'Starter' },
  { id: 'achievementNFTs', name: 'Achievement NFTs', description: 'Mint achievements as NFTs on-chain', enabled: false, minTier: 'Enterprise' },
];

var TIER_COLORS: Record<string, string> = {
  Free: 'badge-success',
  Starter: 'badge-accent',
  Pro: 'badge-gold',
  Enterprise: 'badge-primary',
};

export default function FeaturesPage() {
  var [flags, setFlags] = useState(FEATURE_FLAGS);

  function toggleFlag(id: string) {
    setFlags(flags.map(function(f) {
      return f.id === id ? { ...f, enabled: !f.enabled } : f;
    }));
  }

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Flag size={22} style={{ color: 'var(--color-primary-light)' }} />
          Feature Flags
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Toggle platform features across tiers</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {flags.map(function(f) {
          return (
            <div key={f.id} className="glass-card" style={{
              padding: 20, display: 'flex', alignItems: 'center', gap: 16,
              borderColor: f.enabled ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.15)',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: f.enabled ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {f.enabled ? (
                  <ToggleRight size={24} style={{ color: 'var(--color-success)' }} />
                ) : (
                  <ToggleLeft size={24} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{f.name}</span>
                  <span className={`badge ${TIER_COLORS[f.minTier]}`} style={{ fontSize: '0.6875rem' }}>
                    <Shield size={10} /> {f.minTier}
                  </span>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Info size={12} style={{ color: 'var(--text-muted)' }} />
                  {f.description}
                </div>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: 48, height: 26, cursor: 'pointer', flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={f.enabled}
                  onChange={function() { toggleFlag(f.id); }}
                  style={{ opacity: 0, width: 0, height: 0 }}
                />
                <span style={{
                  position: 'absolute', inset: 0, borderRadius: 26, transition: 'all 0.3s',
                  background: f.enabled ? 'var(--gradient-primary)' : 'rgba(255,255,255,0.15)',
                  boxShadow: f.enabled ? '0 0 12px rgba(124,58,237,0.4)' : 'none',
                }}>
                  <span style={{
                    position: 'absolute', top: 3, width: 20, height: 20, borderRadius: '50%',
                    background: 'white', transition: 'all 0.3s',
                    left: f.enabled ? 25 : 3, boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }} />
                </span>
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
