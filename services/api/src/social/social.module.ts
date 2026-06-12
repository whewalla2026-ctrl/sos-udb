import { Module } from '@nestjs/common';
import { JoonWorldService } from './joon-world.service';
import { RedisModule } from '../redis/redis.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [RedisModule, EventEmitterModule.forRoot()],
  providers: [JoonWorldService],
  exports: [JoonWorldService],
})
export class SocialModule {}
