import { Module } from '@nestjs/common';
import { UUPSyncService } from './uup-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [PrismaModule, RedisModule, EventEmitterModule.forRoot()],
  providers: [UUPSyncService],
  exports: [UUPSyncService],
})
export class UUPSyncModule {}
