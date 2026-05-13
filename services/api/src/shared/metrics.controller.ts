import { Controller, Get, Res, Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  Registry, collectDefaultMetrics, Counter, Gauge, Histogram,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly authFailures: Counter;
  public readonly signupsTotal: Counter;
  public readonly questsCompleted: Counter;
  public readonly tutoringSessions: Counter;
  public readonly activeUsers: Gauge;
  public readonly businessMetricsTotal: Counter;
  public readonly stripeWebhooksTotal: Counter;
  public readonly goalCompletions: Counter;
  public readonly familyLinks: Counter;
  public readonly uupSyncsTotal: Counter;
  public readonly doterLevelUps: Counter;

  // SLO metrics
  public readonly sloErrorBudget: Gauge;
  public readonly sloTarget: Gauge;
  public readonly alertsReceivedTotal: Counter;

  // Health metrics
  public readonly dbConnectionStatus: Gauge;
  public readonly redisConnectionStatus: Gauge;

  // GraphQL operation metrics
  public readonly graphqlOperationDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry, prefix: 'udb_' });

    this.httpRequestsTotal = new Counter({
      name: 'udb_http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'udb_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.authFailures = new Counter({
      name: 'udb_auth_failures_total',
      help: 'Total authentication failures',
      labelNames: ['reason'],
      registers: [this.registry],
    });

    this.signupsTotal = new Counter({
      name: 'udb_signups_total',
      help: 'Total user signups',
      labelNames: ['role'],
      registers: [this.registry],
    });

    this.questsCompleted = new Counter({
      name: 'udb_quests_completed_total',
      help: 'Total quests completed',
      labelNames: ['pillar'],
      registers: [this.registry],
    });

    this.tutoringSessions = new Counter({
      name: 'udb_tutoring_sessions_total',
      help: 'Total tutoring sessions',
      labelNames: ['subject'],
      registers: [this.registry],
    });

    this.activeUsers = new Gauge({
      name: 'udb_active_users',
      help: 'Current active users (DAU)',
      labelNames: ['role'],
      registers: [this.registry],
    });

    this.businessMetricsTotal = new Counter({
      name: 'udb_business_metrics_total',
      help: 'Custom business metric events',
      labelNames: ['metric'],
      registers: [this.registry],
    });

    this.stripeWebhooksTotal = new Counter({
      name: 'udb_stripe_webhooks_total',
      help: 'Stripe webhook events processed',
      labelNames: ['event', 'status'],
      registers: [this.registry],
    });

    this.goalCompletions = new Counter({
      name: 'udb_goal_completions_total',
      help: 'Total goals completed',
      labelNames: ['pillar'],
      registers: [this.registry],
    });

    this.familyLinks = new Counter({
      name: 'udb_family_links_total',
      help: 'Total family links created',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.uupSyncsTotal = new Counter({
      name: 'udb_uup_syncs_total',
      help: 'Total UUP sync operations',
      labelNames: ['source', 'result'],
      registers: [this.registry],
    });

    this.doterLevelUps = new Counter({
      name: 'udb_doter_level_ups_total',
      help: 'Total Doter level-ups',
      labelNames: ['level'],
      registers: [this.registry],
    });

    // SLO metrics
    this.sloErrorBudget = new Gauge({
      name: 'udb_slo_error_budget_remaining',
      help: 'Remaining error budget for SLO as a ratio (1.0 = full, 0 = exhausted)',
      labelNames: ['slo_name'],
      registers: [this.registry],
    });

    this.sloTarget = new Gauge({
      name: 'udb_slo_target',
      help: 'SLO target as a ratio (e.g. 0.999 = 99.9%)',
      labelNames: ['slo_name'],
      registers: [this.registry],
    });

    this.alertsReceivedTotal = new Counter({
      name: 'udb_alerts_received_total',
      help: 'Total alert notifications received from AlertManager',
      labelNames: ['status', 'alertname', 'severity'],
      registers: [this.registry],
    });

    // Health metrics
    this.dbConnectionStatus = new Gauge({
      name: 'udb_db_connection_status',
      help: 'Database connection status (1 = up, 0 = down)',
      labelNames: ['database'],
      registers: [this.registry],
    });

    this.redisConnectionStatus = new Gauge({
      name: 'udb_redis_connection_status',
      help: 'Redis connection status (1 = up, 0 = down)',
      registers: [this.registry],
    });

    // GraphQL operation metrics
    this.graphqlOperationDuration = new Histogram({
      name: 'udb_graphql_operation_duration_seconds',
      help: 'GraphQL operation duration in seconds',
      labelNames: ['operation_type', 'operation_name'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // Initialize SLO targets
    this.sloTarget.set({ slo_name: 'availability_30d' }, 0.995);
    this.sloTarget.set({ slo_name: 'latency_p95_graphql' }, 0.95);
    this.sloTarget.set({ slo_name: 'error_rate_graphql' }, 0.99);

    // Initialize error budgets (full)
    this.sloErrorBudget.set({ slo_name: 'availability_30d' }, 1.0);
    this.sloErrorBudget.set({ slo_name: 'latency_p95_graphql' }, 1.0);
    this.sloErrorBudget.set({ slo_name: 'error_rate_graphql' }, 1.0);

    // Initialize health status (unknown)
    this.dbConnectionStatus.set({ database: 'postgres' }, 0);
    this.redisConnectionStatus.set(0);
  }

  getRegistry(): Registry {
    return this.registry;
  }
}

@Controller()
export class MetricsController {
  constructor(private metricsSvc: MetricsService) {}

  @Get('metrics')
  async getMetrics(@Res() res: Response) {
    const data = await this.metricsSvc.getRegistry().metrics();
    res.setHeader('Content-Type', this.metricsSvc.getRegistry().contentType);
    res.send(data);
  }
}
