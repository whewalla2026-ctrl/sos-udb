import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { PointsService } from '../points/points.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    achievement: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    skillGap: {
      findMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const mockBlockchain = {
    mintSBT: jest.fn(),
    verifySBT: jest.fn(),
  };

  const mockPoints = {
    spendPoints: jest.fn(),
    getBalance: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchain },
        { provide: PointsService, useValue: mockPoints },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPublicProfile', () => {
    it('should return user public profile with achievements and skills', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
        avatarUrl: 'https://example.com/avatar.png',
        uupData: { gamification: { level: 5 } },
      });
      mockPrisma.achievement.findMany.mockResolvedValue([
        { id: 'a-1', title: 'Math Whiz', earnedAt: new Date() },
      ]);
      mockPrisma.skillGap.findMany.mockResolvedValue([
        { subject: 'Algebra', gapScore: 0.9 },
      ]);

      const profile = await service.getPublicProfile('user-1');

      expect(profile).toHaveProperty('user');
      expect(profile).toHaveProperty('achievements');
      expect(profile).toHaveProperty('skills');
      expect(profile.achievements).toHaveLength(1);
      expect(profile.skills).toHaveLength(1);
    });

    it('should throw when user is not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getPublicProfile('nonexistent')).rejects.toThrow('User not found');
    });

    it('should return empty achievements for user with none', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
        avatarUrl: null,
        uupData: null,
      });
      mockPrisma.achievement.findMany.mockResolvedValue([]);
      mockPrisma.skillGap.findMany.mockResolvedValue([]);

      const profile = await service.getPublicProfile('user-1');

      expect(profile.achievements).toEqual([]);
      expect(profile.skills).toEqual([]);
    });
  });

  describe('listTalents', () => {
    it('should return top CHILD users', async () => {
      const mockUsers = [
        { id: 'u-1', displayName: 'Student A', avatarUrl: null },
        { id: 'u-2', displayName: 'Student B', avatarUrl: null },
      ];
      mockPrisma.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.listTalents();

      expect(result).toEqual(mockUsers);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 20 }),
      );
    });

    it('should accept optional pillar filter', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      await service.listTalents('ACADEMIC');

      expect(mockPrisma.user.findMany).toHaveBeenCalled();
    });

    it('should limit results to 20 users', async () => {
      const manyUsers = Array.from({ length: 30 }, (_, i) => ({
        id: `u-${i}`,
        displayName: `Student ${i}`,
        avatarUrl: null,
      }));
      mockPrisma.user.findMany.mockResolvedValue(manyUsers.slice(0, 20));

      const result = await service.listTalents();

      expect(result).toHaveLength(20);
    });
  });

  describe('purchaseItem', () => {
    it('should purchase an available item successfully', async () => {
      mockPoints.spendPoints.mockResolvedValue({ id: 'tx-1', amount: -500, balanceAfter: 100 });
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const result = await service.purchaseItem('user-1', '1');

      expect(result).toHaveProperty('item');
      expect(result).toHaveProperty('transaction');
      expect(result.item.name).toBe('Custom Avatar Skin');
      expect(result.item.cost).toBe(500);
      expect(mockPoints.spendPoints).toHaveBeenCalledWith('user-1', {
        amount: 500,
        source: 'PURCHASE',
        description: 'Purchased: Custom Avatar Skin',
      });
      expect(mockPrisma.auditLog.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for invalid item ID', async () => {
      await expect(service.purchaseItem('user-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw when item ID does not match any marketplace item', async () => {
      await expect(service.purchaseItem('user-1', '-1')).rejects.toThrow(NotFoundException);
    });

    it('should propagate points service errors', async () => {
      mockPoints.spendPoints.mockRejectedValue(new Error('Insufficient points'));

      await expect(service.purchaseItem('user-1', '1')).rejects.toThrow('Insufficient points');
    });
  });

  describe('getMarketplaceItems', () => {
    it('should return all marketplace items', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        doterProfile: { id: 'dp-1' },
      });

      const items = await service.getMarketplaceItems('user-1');

      expect(items).toHaveLength(6);
      expect(items[0]).toHaveProperty('id');
      expect(items[0]).toHaveProperty('name');
      expect(items[0]).toHaveProperty('cost');
      expect(items[0]).toHaveProperty('category');
    });

    it('should handle user without doterProfile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const items = await service.getMarketplaceItems('user-1');

      expect(items).toHaveLength(6);
    });

    it('should return items with correct cost values', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

      const items = await service.getMarketplaceItems('user-1');

      expect(items.map(i => i.cost)).toEqual([500, 300, 800, 200, 1000, 400]);
    });
  });

  describe('mintAchievement', () => {
    it('should create achievement and mint SBT on blockchain', async () => {
      mockPrisma.achievement.create.mockResolvedValue({
        id: 'a-1',
        userId: 'user-1',
        title: 'Math Master',
        description: 'Mastered Algebra',
        pillar: 'ACADEMIC',
        badgeUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=Math Master',
      });
      mockBlockchain.mintSBT.mockResolvedValue({
        tokenId: '0x1234567890abcdef',
        userId: 'user-1',
        id: 'a-1',
      });
      mockPrisma.achievement.update.mockResolvedValue({
        id: 'a-1',
        isMinted: true,
        sbtTokenId: '0x1234567890abcdef',
        sbtContract: '0xUDBSoulboundContractAddress',
      });

      const result = await service.mintAchievement('user-1', 'Math Master', 'Mastered Algebra', 'ACADEMIC');

      expect(result).toHaveProperty('isMinted', true);
      expect(result).toHaveProperty('sbtTokenId', '0x1234567890abcdef');
      expect(mockPrisma.achievement.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          title: 'Math Master',
          description: 'Mastered Algebra',
          pillar: 'ACADEMIC',
          badgeUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=Math Master',
        },
      });
      expect(mockBlockchain.mintSBT).toHaveBeenCalledWith(
        'user-1',
        'a-1',
        'https://udb.io/metadata/a-1',
      );
    });

    it('should propagate blockchain minting errors', async () => {
      mockPrisma.achievement.create.mockResolvedValue({
        id: 'a-1',
        userId: 'user-1',
        title: 'Test',
        description: 'Test',
        pillar: 'ACADEMIC',
        badgeUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=Test',
      });
      mockBlockchain.mintSBT.mockRejectedValue(new Error('Polygon RPC error'));

      await expect(
        service.mintAchievement('user-1', 'Test', 'Test', 'ACADEMIC'),
      ).rejects.toThrow('Polygon RPC error');
    });

    it('should propagate database creation errors', async () => {
      mockPrisma.achievement.create.mockRejectedValue(new Error('DB constraint'));

      await expect(
        service.mintAchievement('user-1', 'Test', 'Test', 'ACADEMIC'),
      ).rejects.toThrow('DB constraint');
    });

    it('should generate badge URL using the achievement title', async () => {
      mockPrisma.achievement.create.mockResolvedValue({
        id: 'a-2',
        userId: 'user-1',
        title: 'Science Genius',
        description: 'Top of class',
        pillar: 'ACADEMIC',
        badgeUrl: 'https://api.dicebear.com/8.x/identicon/svg?seed=Science Genius',
      });
      mockBlockchain.mintSBT.mockResolvedValue({ tokenId: '0xabc', userId: 'user-1', id: 'a-2' });
      mockPrisma.achievement.update.mockResolvedValue({
        id: 'a-2',
        isMinted: true,
        sbtTokenId: '0xabc',
        sbtContract: '0xUDBSoulboundContractAddress',
      });

      await service.mintAchievement('user-1', 'Science Genius', 'Top of class', 'ACADEMIC');

      expect(mockPrisma.achievement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Science Genius',
            badgeUrl: expect.stringContaining('Science Genius'),
          }),
        }),
      );
    });
  });
});
