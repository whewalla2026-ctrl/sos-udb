import { Module } from '@nestjs/common';
import { PointsService } from './points.service';
import { PointsResolver } from './points.resolver';

@Module({
  providers: [PointsService, PointsResolver],
  exports: [PointsService],
})
export class PointsModule {}
