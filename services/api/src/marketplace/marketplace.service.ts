import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PointsService } from '../points/points.service';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    private prisma: PrismaService,
    private blockchain: BlockchainService,
    private points: PointsService,
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

  async listTalents(_pillar?: string) {
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

  async purchaseItem(userId: string, itemId: string) {
    const items = await this.getMarketplaceItems(userId);
    const item = items.find(i => i.id === itemId);
    if (!item) throw new NotFoundException(`Marketplace item ${itemId} not found`);

    const entry = await this.points.spendPoints(userId, {
      amount: item.cost,
      source: 'PURCHASE' as any,
      description: `Purchased: ${item.name}`,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'MARKETPLACE_PURCHASE',
        targetType: 'MarketplaceItem',
        targetId: itemId,
        payload: { itemName: item.name, cost: item.cost },
      },
    });

    this.logger.log(`🛒 User ${userId} purchased "${item.name}" for ${item.cost} coins`);
    return { item, transaction: entry };
  }

  async getMarketplaceItems(userId: string) {
    const _user = await this.prisma.user.findUnique({ where: { id: userId }, include: { doterProfile: true } });
    const items = [
      { id: '1', name: 'Custom Avatar Skin', description: 'Unique look for your Doter', cost: 500, category: 'Cosmetic', icon: '🎨' },
      { id: '2', name: 'Premium Sound Pack', description: 'Exclusive sound effects', cost: 300, category: 'Audio', icon: '🎵' },
      { id: '3', name: 'Doter Habitat Theme', description: 'Custom environment for your Doter', cost: 800, category: 'Themes', icon: '🏠' },
      { id: '4', name: 'XP Boost (24h)', description: 'Double XP for 24 hours', cost: 200, category: 'Boosts', icon: '⚡' },
      { id: '5', name: 'Study Kit Bundle', description: 'Premium study resources', cost: 1000, category: 'Education', icon: '📚' },
      { id: '6', name: 'Mini-Game Pass', description: 'Unlock all mini-games', cost: 400, category: 'Games', icon: '🎮' },
    ];
    return items;
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
