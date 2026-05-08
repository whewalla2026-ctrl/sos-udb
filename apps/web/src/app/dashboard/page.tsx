'use client';

import { ChildDashboard } from '../../components/ChildDashboard';
import { ParentDashboard } from '../../components/ParentDashboard';

// ── Seed/mock data mirroring the DB seed ──────────────────────────────────────
const MOCK_CHILD_DATA = {
  user: { displayName: 'Leo Johnson', role: 'CHILD', avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=leo' },
  doter: { name: 'Sparky', state: 'JUVENILE', level: 8, xp: 7200, xpNext: 8000, coinBalance: 1250, streakDays: 12, isEnergetic: true, isSluggy: false },
  quests: [
    { id: '1', title: 'Complete 10 Fraction Worksheets', pillar: 'ACADEMIC', status: 'IN_PROGRESS', xpReward: 200, coinReward: 100, progress: 60 },
    { id: '2', title: 'Sleep 8+ Hours for 5 Days', pillar: 'BIOMETRIC', status: 'IN_PROGRESS', xpReward: 150, coinReward: 75, progress: 80 },
    { id: '3', title: 'Read 1 Chapter of Your Book', pillar: 'ACADEMIC', status: 'PENDING', xpReward: 100, coinReward: 50, progress: 0 },
  ],
  goals: [
    { id: '1', title: 'Math Proficiency', pillar: 'ACADEMIC', currentWeight: 35, targetWeight: 100 },
    { id: '2', title: 'Healthy Habits Master', pillar: 'BIOMETRIC', currentWeight: 68, targetWeight: 100 },
  ],
  biometric: { sleepHours: 8.5, focusScore: 82, stressLevel: 15, steps: 8432 },
  notifications: [
    { id: '1', type: 'QUEST_REMINDER', title: '📚 Quest Due Tomorrow!', body: 'Fraction Worksheets — 4 more to go!', createdAt: '2h ago' },
    { id: '2', type: 'LEVEL_UP', title: '🎉 You Reached Level 8!', body: 'Sparky is evolving!', createdAt: '1d ago' },
    { id: '3', type: 'SKILL_GAP', title: '📊 Skill Gap Alert', body: 'Social skills need attention', createdAt: '2d ago' },
  ],
};

const MOCK_PARENT_DATA = {
  user: { displayName: 'Sarah Johnson', role: 'PARENT', avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=sarah' },
  children: [
    { id: 'child-1', name: 'Leo', doterName: 'Sparky', doterLevel: 8, sleepHours: 8.5, points: 1250, avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=leo' },
    { id: 'child-2', name: 'Mia', doterName: 'Glitch', doterLevel: 14, sleepHours: 7.2, points: 3400, avatarUrl: 'https://api.dicebear.com/8.x/avataaars/svg?seed=mia' },
  ],
  pendingApprovals: [
    { id: 'proof-1', childName: 'Leo', title: 'Fraction Worksheet', evidenceUrl: 'https://images.unsplash.com/photo-1633504581786-316c8002b1b9?auto=format&fit=crop&w=150&q=80', timeAgo: '2h ago', xpReward: 200 },
  ]
};

export default function DashboardPage() {
  const CURRENT_ROLE: 'CHILD' | 'PARENT' =
    process.env.NEXT_PUBLIC_DASHBOARD_ROLE === 'PARENT' ? 'PARENT' : 'CHILD';

  if (CURRENT_ROLE === 'PARENT') {
    return <ParentDashboard data={MOCK_PARENT_DATA} />;
  }

  return <ChildDashboard data={MOCK_CHILD_DATA} />;
}
