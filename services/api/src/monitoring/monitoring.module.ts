import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
