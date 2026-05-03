import { Module } from '@nestjs/common';
import { UupSyncService } from './uup-sync.service';

@Module({
  providers: [UupSyncService],
  exports: [UupSyncService],
})
export class UupSyncModule {}
