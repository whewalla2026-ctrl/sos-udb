import { Controller, Post, Body, Req, UseGuards, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { AnalyticsService } from '../analytics/analytics.service';

@Controller('monitoring')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(private analytics: AnalyticsService) {}

  @Post('signal')
  @UseGuards(AuthGuard('jwt'))
  async signal(@Body() body: any, @Req() req: Request) {
    var user = req.user as any;
    if (!user) return { ok: false, error: 'unauthorized' };

    if (body.signal === 'analytics_event' && body.payload) {
      var payload = body.payload;
      await this.analytics.recordEvent(user.id, payload.event, payload.metadata || {});
      return { ok: true };
    }

    return { ok: false, error: 'unknown_signal' };
  }
}
