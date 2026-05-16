import { Module } from '@nestjs/common';
import { PlannerService } from './planner.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, UUPSyncModule, EventEmitterModule.forRoot()],
  providers: [PlannerService],
  exports: [PlannerService],
})
export class PlannerModule {}