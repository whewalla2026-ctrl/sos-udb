import { Module } from '@nestjs/common';
import { GamificationService } from './gamification.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, UUPSyncModule, EventEmitterModule.forRoot()],
  providers: [GamificationService],
  exports: [GamificationService],
})
export class GamificationModule {}
