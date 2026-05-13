import { Controller, Post, Body, Req, UseGuards, Logger, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AnalyticsService } from '../analytics/analytics.service';
import { MetricsService } from '../shared/metrics.controller';

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private analytics: AnalyticsService,
    private metrics: MetricsService,
  ) {}

  @Post('signal')
  @UseGuards(AuthGuard('jwt'))
  async signal(@Body() body: any, @Req() req: Request) {
    const user = req.user as any;
    if (!user) return { ok: false, error: 'unauthorized' };

    if (body.signal === 'analytics_event' && body.payload) {
      const payload = body.payload;
      await this.analytics.recordEvent(user.id, payload.event, payload.metadata || {});
      return { ok: true };
    }

    return { ok: false, error: 'unknown_signal' };
  }

  @Post('alert')
  @HttpCode(200)
  async receiveAlert(@Body() body: any) {
    this.logger.warn('AlertManager notification received');
    const status = body.status || 'unknown';
    const alerts = body.alerts || [];

    this.metrics.alertsReceivedTotal.inc({ status });

    for (const alert of alerts) {
      const name = alert.labels?.alertname || 'unknown';
      const severity = alert.labels?.severity || 'unknown';
      this.logger.warn(`Alert: ${name} | severity=${severity} | status=${status} | summary=${alert.annotations?.summary || ''}`);
      this.metrics.alertsReceivedTotal.inc({ status, alertname: name, severity });
    }

    return { ok: true, received: alerts.length };
  }
}
