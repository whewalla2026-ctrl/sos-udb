import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { PineconeService } from '../ai/pinecone.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.module';
import { EscrowService } from '../finance/escrow.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { FutureSelfService } from '../future-self/future-self.service';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [TutorService, PineconeService],
  exports: [TutorService],
})
export class AITutorModule {}

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.ESCROW_PAYOUT })],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class FinanceModule {}

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: QUEUES.SBT_MINT })],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}

@Module({
  imports: [PrismaModule, UUPSyncModule, EventEmitterModule.forRoot()],
  providers: [FutureSelfService],
  exports: [FutureSelfService],
})
export class FutureSelfModule {}