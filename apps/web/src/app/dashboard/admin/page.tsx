'use client';

import { useQuery } from '@apollo/client';
import { GET_ME } from '../../../lib/queries';
import { AdminDashboard } from '../../../components/AdminDashboard';

export default function AdminDashboardPage() {
  var { data: meData, loading } = useQuery(GET_ME);

  if (loading) {
    return (
      <div className="fade-in">
        <div className="grid-stats">
          {[1,2,3,4].map(function(i) { return <div key={i} className="glass-card" style={{ padding: 24, height: 120 }} />; })}
        </div>
        <div className="glass-card" style={{ padding: 32, height: 300 }} />
      </div>
    );
  }

  var user = meData?.me || { displayName: 'Admin', role: 'ADMIN', avatarUrl: '' };

  var mockData = {
    user,
    totalUsers: 12483,
    totalUsersTrend: 12.5,
    activeUsersToday: 3842,
    revenueThisMonth: 84720,
    systemUptime: 99.97,
    services: [
      { name: 'API Gateway', status: 'UP', responseTime: 12 },
      { name: 'Authentication', status: 'UP', responseTime: 8 },
      { name: 'GraphQL API', status: 'UP', responseTime: 15 },
      { name: 'Database (Primary)', status: 'UP', responseTime: 3 },
      { name: 'Database (Replica)', status: 'UP', responseTime: 4 },
      { name: 'Redis Cache', status: 'UP', responseTime: 1 },
      { name: 'AI Tutor Service', status: 'UP', responseTime: 320 },
      { name: 'Biometric Pipeline', status: 'UP', responseTime: 45 },
      { name: 'Notification Service', status: 'UP', responseTime: 22 },
      { name: 'File Storage (CDN)', status: 'UP', responseTime: 18 },
      { name: 'WebSocket Relay', status: 'DOWN', responseTime: 0 },
      { name: 'Audit Logger', status: 'UP', responseTime: 6 },
      { name: 'Payment Processor', status: 'UP', responseTime: 87 },
      { name: 'Analytics Engine', status: 'UP', responseTime: 34 },
    ],
    userGrowth: [
      { month: 'Jan', users: 8200 }, { month: 'Feb', users: 8700 }, { month: 'Mar', users: 9400 },
      { month: 'Apr', users: 10100 }, { month: 'May', users: 10900 }, { month: 'Jun', users: 12483 },
    ],
    subscriptionDist: [
      { name: 'Free', value: 45 }, { name: 'Starter', value: 28 }, { name: 'Pro', value: 18 }, { name: 'Enterprise', value: 9 },
    ],
    funnel: [
      { label: 'Signed Up', count: 12483, conversionRate: 1.0 },
      { label: 'Onboarding', count: 9872, conversionRate: 0.79 },
      { label: 'First Quest', count: 6541, conversionRate: 0.52 },
      { label: 'Active User', count: 4237, conversionRate: 0.34 },
    ],
    retention: [
      { day: 'Day 1', rate: 42.3 },
      { day: 'Day 3', rate: 28.7 },
      { day: 'Day 7', rate: 19.4 },
      { day: 'Day 14', rate: 13.8 },
      { day: 'Day 30', rate: 8.2 },
    ],
    activationMetrics: [
      { label: 'Onboarding Completed', count: 8762, rate: 0.70 },
      { label: 'Doter Named', count: 7234, rate: 0.58 },
      { label: 'Quest Created', count: 5419, rate: 0.43 },
      { label: 'Quest Completed', count: 3847, rate: 0.31 },
    ],
    auditLogs: [
      { id: '1', timestamp: '2 min ago', actor: 'admin@udb.io', action: 'USER_SUSPEND', target: 'jdoe@example.com', details: 'Policy violation' },
      { id: '2', timestamp: '15 min ago', actor: 'system', action: 'BACKUP_COMPLETE', target: 'db-primary', details: 'Daily backup finished' },
      { id: '3', timestamp: '1 hour ago', actor: 'sarah@acme.com', action: 'TENANT_CREATED', target: 'Acme Corp', details: 'Enterprise tier' },
      { id: '4', timestamp: '3 hours ago', actor: 'admin@udb.io', action: 'FEATURE_TOGGLE', target: 'achievementNFTs', details: 'Enabled' },
      { id: '5', timestamp: '6 hours ago', actor: 'system', action: 'DEPLOY_COMPLETE', target: 'v2.4.1', details: 'Rollout successful' },
    ],
  };

  return <AdminDashboard data={mockData} />;
}
