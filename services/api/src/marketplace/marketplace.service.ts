import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService
  ) {}

  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        uupData: true,
      },
    });

    if (!user) throw new Error('User not found');

    const achievements = await this.prisma.achievement.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });

    const skillGaps = await this.prisma.skillGap.findMany({
      where: { userId, gapScore: { gte: 0.8 } }, // Only show mastery
    });

    return {
      user,
      achievements,
      skills: skillGaps,
    };
  }

  async listTalents(pillar?: string) {
    // Basic marketplace listing of top students
    return this.prisma.user.findMany({
      where: {
        role: 'CHILD',
        // Optional filter by top mastery in a pillar
      },
      take: 20,
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
      },
    });
  }

  async mintAchievement(userId: string, title: string, description: string, pillar: any) {
    const achievement = await this.prisma.achievement.create({
      data: {
        userId,
        title,
        description,
        pillar,
        badgeUrl: `https://api.dicebear.com/8.x/identicon/svg?seed=${title}`,
      },
    });

    // Mint on Polygon
    const sbt = await this.blockchain.mintSBT(userId, achievement.id, 'https://udb.io/metadata/' + achievement.id);

    return this.prisma.achievement.update({
      where: { id: achievement.id },
      data: {
        isMinted: true,
        sbtTokenId: sbt.tokenId.toString(),
        sbtContract: '0xUDBSoulboundContractAddress',
      },
    });
  }
}
