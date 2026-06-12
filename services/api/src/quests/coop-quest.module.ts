import { Module } from '@nestjs/common';
import { CoopQuestService } from '../coop-quest/coop-quest.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';

@Module({
  imports: [PrismaModule, UUPSyncModule],
  providers: [CoopQuestService],
  exports: [CoopQuestService],
})
export class CoopQuestModule {}
