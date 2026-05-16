import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { PineconeService } from '../ai/pinecone.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [TutorService, PineconeService],
  exports: [TutorService],
})
export class AITutorModule {}

import { Module } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.ESCROW_PAYOUT })],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class FinanceModule {}

import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.module';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.SBT_MINT })],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}

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