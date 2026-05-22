import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BiometricService } from './biometric.service';
import { BiometricResolver } from './biometric.resolver';
import { BiometricController } from './biometric.controller';
import { ChronotypeCronService } from './chronotype-cron.service';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';
import { RedisModule } from '../redis/redis.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [
    UUPSyncModule,
    RedisModule,
    FeatureFlagsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [BiometricController, ChronotypeCronService],
  providers: [BiometricService, BiometricResolver],
  exports: [BiometricService],
})
export class BiometricModule {}
