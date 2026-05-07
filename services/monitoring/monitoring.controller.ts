import { Controller, Get } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly svc: MonitoringService) {}
  @Get('metrics')
  metrics() {
    return this.svc.getMetrics();
  }

  @Get('health')
  health() {
    return this.svc.getHealth();
  }

  @Get('alerts')
  alerts() {
    return this.svc.getAlerts();
  }

  @Get('signals')
  earlyWarningSignals() {
    return this.svc.getEarlyWarningSignals();
  }
}
