import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const QUEUES = {
  VISION: 'vision-processing',
  SBT_MINT: 'sbt-mint',
  ESCROW_PAYOUT: 'escrow-payout',
  DATA_EXPORT: 'data-export',
  AI_INFERENCE: 'ai-inference',
  UUP_SYNC: 'uup-sync',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') || 'localhost',
          port: parseInt(config.get<string>('REDIS_PORT') || '6379'),
          password: config.get<string>('REDIS_PASSWORD'),
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 100,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: QUEUES.VISION },
      { name: QUEUES.SBT_MINT },
      { name: QUEUES.ESCROW_PAYOUT },
      { name: QUEUES.DATA_EXPORT },
      { name: QUEUES.AI_INFERENCE },
      { name: QUEUES.UUP_SYNC },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.VISION,
    }),
  ],
  providers: [],
  exports: [],
})
export class VisionQueueModule {}

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.SBT_MINT,
    }),
  ],
  providers: [],
  exports: [],
})
export class SbtMintQueueModule {}

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUES.ESCROW_PAYOUT,
    }),
  ],
  providers: [],
  exports: [],
})
export class EscrowQueueModule {}