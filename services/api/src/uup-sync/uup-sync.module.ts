import { Module } from '@nestjs/common';
import { UupSyncService } from './uup-sync.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [UupSyncService],
  exports: [UupSyncService],
})
export class UupSyncModule {}
