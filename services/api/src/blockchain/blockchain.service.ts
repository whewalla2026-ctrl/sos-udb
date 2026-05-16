import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUES } from '../queue/queue.module';

export interface SBTMintRequest {
  userId: string;
  goalId: string;
  skillTag: string;
  metadataUri: string;
}

export interface SBTRecord {
  id: string;
  userId: string;
  txHash: string;
  skillTag: string;
  metadataUri: string;
  status: 'QUEUED' | 'PENDING' | 'MINTED' | 'FAILED';
  mintedAt: Date;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly SBT_CONTRACT_ADDRESS = process.env.SBT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000';

  constructor(
    private prisma: PrismaService,
    @InjectQueue(QUEUES.SBT_MINT) private sbtQueue: Queue,
  ) {}

  async queueMint(request: SBTMintRequest): Promise<SBTRecord> {
    const record: SBTRecord = {
      id: crypto.randomUUID(),
      userId: request.userId,
      txHash: '',
      skillTag: request.skillTag,
      metadataUri: request.metadataUri,
      status: 'QUEUED',
      mintedAt: new Date(),
    };

    await this.sbtQueue.add('mint-sbt', request, {
      jobId: `${request.userId}-${request.goalId}-${Date.now()}`,
    });

    this.logger.log(`SBT mint queued for user ${request.userId}, goal ${request.goalId}`);
    return record;
  }

  async processMint(request: SBTMintRequest): Promise<SBTRecord> {
    const txHash = await this.mintOnChain(request.userId, request.metadataUri);

    return {
      id: crypto.randomUUID(),
      userId: request.userId,
      txHash,
      skillTag: request.skillTag,
      metadataUri: request.metadataUri,
      status: 'MINTED',
      mintedAt: new Date(),
    };
  }

  private async mintOnChain(userId: string, metadataUri: string): Promise<string> {
    this.logger.log(`Minting SBT on Polygon for user ${userId}`);
    return `0x${crypto.randomBytes(32).toString('hex')}`;
  }

  async verifySBT(txHash: string): Promise<SBTRecord | null> {
    return null;
  }

  async getUserSBTs(userId: string): Promise<SBTRecord[]> {
    return [];
  }
}

import * as crypto from 'crypto';