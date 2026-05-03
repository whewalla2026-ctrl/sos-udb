import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService
  ) {}

  async getLogs(actorId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { actorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async write(data: { actorId: string; action: string; targetType?: string; targetId?: string; payload?: any }) {
    this.logger.log(`📝 Audit Event: ${data.action} by ${data.actorId}`);
    
    // 1. Write to DB (WORM pattern)
    const log = await this.prisma.auditLog.create({ data });

    // 2. M-0 Requirement: Optional Blockchain Anchor for high-integrity events
    if (data.action === 'UUP_SYNC' || data.action === 'FUND_RELEASE') {
      try {
        await this.blockchain.mintSBT(data.actorId, `LOG-${log.id}`, JSON.stringify(data.payload));
      } catch (e) {
        this.logger.error('Failed to anchor audit log to blockchain:', e);
      }
    }

    return log;
  }
}
