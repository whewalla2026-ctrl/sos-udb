import { Module, Global } from '@nestjs/common';
import { MetricsController, MetricsService } from './metrics.controller';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}
