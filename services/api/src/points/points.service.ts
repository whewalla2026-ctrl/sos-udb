import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionSource, TransactionType } from '../shared/prisma-enums';

@Injectable()
export class PointsService {
  private readonly logger = new Logger(PointsService.name);

  constructor(private prisma: PrismaService) {}

  async awardPoints(userId: string, data: {
    amount: number;
    source: keyof typeof TransactionSource;
    sourceId?: string;
    description?: string;
  }) {
    // Get current balance
    const lastEntry = await this.prisma.pointsLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const currentBalance = lastEntry?.balanceAfter ?? 0;
    const newBalance = currentBalance + data.amount;

    const entry = await this.prisma.pointsLedger.create({
      data: {
        userId,
        transactionType: TransactionType.EARN,
        amount: data.amount,
        balanceAfter: newBalance,
        source: data.source as any,
        sourceId: data.sourceId,
        description: data.description,
        status: 'SETTLED',
      },
    });

    this.logger.log(`💰 +${data.amount} points → user ${userId} | balance: ${newBalance}`);
    return entry;
  }

  async spendPoints(userId: string, data: {
    amount: number;
    source: keyof typeof TransactionSource;
    description?: string;
  }) {
    const lastEntry = await this.prisma.pointsLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const currentBalance = lastEntry?.balanceAfter ?? 0;
    if (currentBalance < data.amount) throw new Error('Insufficient points balance');
    const newBalance = currentBalance - data.amount;

    return this.prisma.pointsLedger.create({
      data: {
        userId,
        transactionType: TransactionType.SPEND,
        amount: -data.amount,
        balanceAfter: newBalance,
        source: data.source as any,
        description: data.description,
        status: 'SETTLED',
      },
    });
  }

  async getBalance(userId: string): Promise<number> {
    const lastEntry = await this.prisma.pointsLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return lastEntry?.balanceAfter ?? 0;
  }

  async getLedger(userId: string, page = 1, pageSize = 20) {
    const [entries, total] = await Promise.all([
      this.prisma.pointsLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.pointsLedger.count({ where: { userId } }),
    ]);
    return { entries, total, page, pageSize };
  }
}
