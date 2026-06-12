import { Module } from '@nestjs/common';
import { QuestStoreService } from './quest-store.service';
import { QuestStoreResolver } from './quest-store.resolver';

@Module({
  providers: [QuestStoreService, QuestStoreResolver],
  exports: [QuestStoreService],
})
export class QuestStoreModule {}
