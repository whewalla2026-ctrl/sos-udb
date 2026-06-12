import { Module } from '@nestjs/common';
import { FutureSelfService } from './future-self.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, UUPSyncModule, EventEmitterModule.forRoot()],
  providers: [FutureSelfService],
  exports: [FutureSelfService],
})
export class FutureSelfModule {}
