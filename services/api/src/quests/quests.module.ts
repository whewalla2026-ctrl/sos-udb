import { Module } from '@nestjs/common';
import { QuestsService } from './quests.service';
import { QuestsResolver } from './quests.resolver';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
import { PointsModule } from '../points/points.module';

@Module({
  imports: [UUPSyncModule, PointsModule],
  providers: [QuestsService, QuestsResolver],
  exports: [QuestsService],
})
export class QuestsModule {}
