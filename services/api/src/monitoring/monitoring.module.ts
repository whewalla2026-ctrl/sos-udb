import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { AnalyticsModule } from '../analytics/analytics.module';
import { MetricsModule } from '../shared/metrics.module';

@Module({
  imports: [AnalyticsModule, MetricsModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
