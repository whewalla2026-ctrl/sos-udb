'use client';

import { Activity, BarChart3, Flame, Goal, Crosshair, Calendar, TrendingUp, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

var mockFeatureUsage = [
  { name: 'Quests', count: 48 },
  { name: 'Goals', count: 32 },
  { name: 'Calendar', count: 27 },
  { name: 'Doter', count: 22 },
  { name: 'Tutor', count: 18 },
  { name: 'Evidence', count: 15 },
  { name: 'Messages', count: 12 },
];

var mockProgress = [
  { month: 'Jan', quests: 12, goals: 3, xp: 450 },
  { month: 'Feb', quests: 18, goals: 5, xp: 720 },
  { month: 'Mar', quests: 15, goals: 4, xp: 600 },
  { month: 'Apr', quests: 22, goals: 6, xp: 890 },
  { month: 'May', quests: 28, goals: 7, xp: 1120 },
  { month: 'Jun', quests: 32, goals: 8, xp: 1340 },
];

var mockActivity = [
  { day: 'Mon', count: 5 },
  { day: 'Tue', count: 3 },
  { day: 'Wed', count: 7 },
  { day: 'Thu', count: 4 },
  { day: 'Fri', count: 6 },
  { day: 'Sat', count: 2 },
  { day: 'Sun', count: 8 },
];

export default function AnalyticsPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Activity size={24} style={{ color: 'var(--color-primary-light)' }} />
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>My Activity</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '4px 0 0 0' }}>
              Your personal analytics and progress
            </p>
          </div>
        </div>
      </div>

      {/* Personal Stats */}
      <div className="grid-stats">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crosshair size={20} style={{ color: 'var(--color-primary-light)' }} />
            </div>
          </div>
          <div className="stat-value">48</div>
          <div className="stat-label">Quests Completed</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Goal size={20} style={{ color: 'var(--color-accent-light)' }} />
            </div>
          </div>
          <div className="stat-value">8</div>
          <div className="stat-label">Goals Set</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={20} style={{ color: 'var(--color-gold)' }} />
            </div>
          </div>
          <div className="stat-value">127</div>
          <div className="stat-label">Days Active</div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Flame size={20} style={{ color: 'var(--color-success)' }} />
            </div>
          </div>
          <div className="stat-value">12</div>
          <div className="stat-label">Day Streak</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Weekly Activity */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={18} style={{ color: 'var(--color-primary-light)' }} />
            Weekly Activity
          </h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockActivity}>
                <defs>
                  <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#7C3AED" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }} />
                <Area type="monotone" dataKey="count" stroke="#7C3AED" fill="url(#activityGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Usage */}
        <div className="glass-card" style={{ padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers size={18} style={{ color: 'var(--color-accent-light)' }} />
            Feature Usage
          </h3>
          <div style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockFeatureUsage} layout="vertical">
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} width={80} />
                <Tooltip contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }} />
                <Bar dataKey="count" fill="#06B6D4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Progress Over Time */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <TrendingUp size={18} style={{ color: 'var(--color-success)' }} />
          Progress Over Time
        </h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockProgress}>
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B6B8E', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#111128', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#F8F8FF' }} />
              <Line type="monotone" dataKey="quests" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED' }} name="Quests" />
              <Line type="monotone" dataKey="goals" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4' }} name="Goals" />
              <Line type="monotone" dataKey="xp" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} name="XP" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
