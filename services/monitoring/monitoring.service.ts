import { Injectable } from '@nestjs/common';

type MetricsState = {
  totalRequests: number;
  latencySumMs: number;
  errors: number;
  aiCostPerUser?: number;
  signups: number;
  activations: number;
  d7Retained: number;
  aiCostTotal: number;
  weeklyActiveUsers: number;
  mobileSessions: number;
  totalSessions: number;
};

type Alert = {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: string;
};

@Injectable()
export class MonitoringService {
  private metrics: MetricsState = {
    totalRequests: 0,
    latencySumMs: 0,
    errors: 0,
    aiCostPerUser: 0,
    signups: 0,
    activations: 0,
    d7Retained: 0,
    aiCostTotal: 0,
    weeklyActiveUsers: 0,
    mobileSessions: 0,
    totalSessions: 0,
  };

  private alerts: Alert[] = [];
  private startTime: number = Date.now();

  ping() { return { ok: true }; }

  getHealth() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return { status: 'ok', uptimeSeconds: uptime, version: '1.0.0' };
  }

  recordRequest(latencyMs: number) {
    this.metrics.totalRequests += 1;
    this.metrics.latencySumMs += latencyMs;
  }

  recordSession(isMobile: boolean) {
    this.metrics.totalSessions += 1;
    if (isMobile) this.metrics.mobileSessions += 1;
  }

  recordSignup() { this.metrics.signups += 1; }

  recordActivation() { this.metrics.activations += 1; }

  recordD7Retained() { this.metrics.d7Retained += 1; }

  recordWeeklyActiveUser() { this.metrics.weeklyActiveUsers += 1; }

  recordError() { this.metrics.errors += 1; }

  addAiCost(cost: number) {
    this.metrics.aiCostTotal += cost;
    this.metrics.aiCostPerUser = this.metrics.activations > 0
      ? this.metrics.aiCostTotal / this.metrics.activations
      : 0;
  }

  setCostPerUser(cost: number) {
    this.metrics.aiCostPerUser = cost;
  }

  addAlert(alert: Alert) {
    this.alerts.push(alert);
    if (this.alerts.length > 100) this.alerts.shift();
  }

  getAlerts() {
    const critical = this.alerts.filter(a => a.severity === 'critical');
    const warnings = this.alerts.filter(a => a.severity === 'warning');
    return {
      total: this.alerts.length,
      critical: critical.length,
      warnings: warnings.length,
      recent: this.alerts.slice(-10).reverse(),
    };
  }

  getEarlyWarningSignals() {
    const activationRate = this.metrics.signups > 0
      ? Math.round((this.metrics.activations / this.metrics.signups) * 100)
      : 0;
    const d7Retention = this.metrics.activations > 0
      ? Math.round((this.metrics.d7Retained / this.metrics.activations) * 100)
      : 0;
    const mobileShare = this.metrics.totalSessions > 0
      ? Math.round((this.metrics.mobileSessions / this.metrics.totalSessions) * 100)
      : 0;
    const aiCostPerActive = this.metrics.activations > 0
      ? Math.round(this.metrics.aiCostTotal / this.metrics.activations * 100) / 100
      : 0;

    return {
      activationRate,
      activationStatus: activationRate > 40 ? 'healthy' : activationRate > 20 ? 'warning' : 'critical',
      d7Retention,
      d7RetentionStatus: d7Retention > 30 ? 'healthy' : d7Retention > 15 ? 'warning' : 'critical',
      aiCostPerActive,
      aiCostStatus: aiCostPerActive < 0.5 ? 'healthy' : aiCostPerActive < 1.0 ? 'warning' : 'critical',
      mobileShare,
      mobileStatus: mobileShare > 40 ? 'healthy' : mobileShare > 20 ? 'warning' : 'critical',
      weeklyActiveUsers: this.metrics.weeklyActiveUsers,
      totalSignups: this.metrics.signups,
      totalActivations: this.metrics.activations,
      totalErrors: this.metrics.errors,
    };
  }

  getMetrics() {
    const avgLatency = this.metrics.totalRequests > 0
      ? Math.round(this.metrics.latencySumMs / this.metrics.totalRequests)
      : 0;
    return {
      totalRequests: this.metrics.totalRequests,
      avgLatencyMs: avgLatency,
      errors: this.metrics.errors,
      aiCostPerUser: this.metrics.aiCostPerUser,
      signups: this.metrics.signups,
      activations: this.metrics.activations,
      weeklyActiveUsers: this.metrics.weeklyActiveUsers,
    };
  }
}
