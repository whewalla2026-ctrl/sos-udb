import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceService } from './evidence.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';

describe('EvidenceService', () => {
  let service: EvidenceService;

  const mockPrisma = {
    evidenceItem: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAi = {
    generateContextualFeedback: jest.fn(),
    analyzeSentiment: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenceService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiService, useValue: mockAi },
      ],
    }).compile();

    service = module.get<EvidenceService>(EvidenceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addEvidence', () => {
    const evidenceData = {
      questId: 'quest-1',
      title: 'Math Homework',
      type: 'PDF',
      url: 'https://example.com/homework.pdf',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    it('should create evidence with AI pro-tip', async () => {
      mockAi.generateContextualFeedback.mockResolvedValue('Great work on your math homework!');
      mockPrisma.evidenceItem.create.mockResolvedValue({
        id: 'ev-1',
        userId: 'user-1',
        ...evidenceData,
        aiProTip: 'Great work on your math homework!',
      });

      const result = await service.addEvidence('user-1', evidenceData);

      expect(result).toBeDefined();
      expect(result.aiProTip).toBe('Great work on your math homework!');
      expect(mockAi.generateContextualFeedback).toHaveBeenCalledWith(
        evidenceData.title,
        evidenceData.type,
        evidenceData.url,
      );
      expect(mockPrisma.evidenceItem.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', ...evidenceData, aiProTip: 'Great work on your math homework!' },
      });
    });

    it('should handle missing optional questId and thumbnailUrl', async () => {
      mockAi.generateContextualFeedback.mockResolvedValue('Nice work!');
      mockPrisma.evidenceItem.create.mockResolvedValue({
        id: 'ev-2',
        userId: 'user-1',
        title: 'Test',
        type: 'image',
        url: 'https://example.com/img.png',
        aiProTip: 'Nice work!',
      });

      const result = await service.addEvidence('user-1', {
        title: 'Test',
        type: 'image',
        url: 'https://example.com/img.png',
      });

      expect(result).toBeDefined();
    });

    it('should propagate AI service errors', async () => {
      mockAi.generateContextualFeedback.mockRejectedValue(new Error('AI unavailable'));

      await expect(
        service.addEvidence('user-1', evidenceData),
      ).rejects.toThrow('AI unavailable');
    });

    it('should propagate database errors', async () => {
      mockAi.generateContextualFeedback.mockResolvedValue('Great work!');
      mockPrisma.evidenceItem.create.mockRejectedValue(new Error('DB constraint violation'));

      await expect(
        service.addEvidence('user-1', evidenceData),
      ).rejects.toThrow('DB constraint violation');
    });
  });

  describe('getEvidenceGallery', () => {
    it('should return evidence items ordered by creation date', async () => {
      const mockItems = [
        { id: 'ev-1', title: 'Recent', createdAt: new Date('2025-01-10'), quest: null },
        { id: 'ev-2', title: 'Older', createdAt: new Date('2025-01-05'), quest: null },
      ];
      mockPrisma.evidenceItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getEvidenceGallery('user-1');

      expect(result).toEqual(mockItems);
      expect(mockPrisma.evidenceItem.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        include: { quest: true },
      });
    });

    it('should return empty array when user has no evidence', async () => {
      mockPrisma.evidenceItem.findMany.mockResolvedValue([]);

      const result = await service.getEvidenceGallery('user-1');

      expect(result).toEqual([]);
    });

    it('should include quest data when evidence has a quest', async () => {
      const mockItems = [
        { id: 'ev-1', title: 'Quest Evidence', quest: { id: 'q-1', title: 'Math Quest' } },
      ];
      mockPrisma.evidenceItem.findMany.mockResolvedValue(mockItems);

      const result = await service.getEvidenceGallery('user-1');

      expect(result[0].quest).toBeDefined();
      expect(result[0].quest!.id).toBe('q-1');
    });
  });

  describe('addComment', () => {
    it('should add a comment to an existing evidence item', async () => {
      mockPrisma.evidenceItem.findUnique.mockResolvedValue({
        id: 'ev-1',
        comments: [],
      });
      mockPrisma.evidenceItem.update.mockResolvedValue({
        id: 'ev-1',
        comments: [{ userId: 'user-2', comment: 'Great job!', timestamp: expect.any(String) }],
      });

      const result = await service.addComment('ev-1', 'user-2', 'Great job!');

      expect(result).toBeDefined();
      expect(mockPrisma.evidenceItem.update).toHaveBeenCalled();
    });

    it('should append to existing comments', async () => {
      const existingComments = [{ userId: 'user-1', comment: 'My work', timestamp: '2025-01-01T00:00:00Z' }];
      mockPrisma.evidenceItem.findUnique.mockResolvedValue({
        id: 'ev-1',
        comments: existingComments,
      });
      mockPrisma.evidenceItem.update.mockResolvedValue({
        id: 'ev-1',
        comments: [...existingComments, { userId: 'user-2', comment: 'Nice!', timestamp: expect.any(String) }],
      });

      const result = await service.addComment('ev-1', 'user-2', 'Nice!');

      expect(result).toBeDefined();
    });

    it('should throw when evidence does not exist', async () => {
      mockPrisma.evidenceItem.findUnique.mockResolvedValue(null);

      await expect(
        service.addComment('nonexistent', 'user-2', 'Comment'),
      ).rejects.toThrow('Evidence not found');
    });

    it('should handle empty comment string', async () => {
      mockPrisma.evidenceItem.findUnique.mockResolvedValue({
        id: 'ev-1',
        comments: [],
      });
      mockPrisma.evidenceItem.update.mockResolvedValue({
        id: 'ev-1',
        comments: [{ userId: 'user-2', comment: '', timestamp: expect.any(String) }],
      });

      const result = await service.addComment('ev-1', 'user-2', '');

      expect(result).toBeDefined();
    });

    it('should handle null comments field gracefully', async () => {
      mockPrisma.evidenceItem.findUnique.mockResolvedValue({
        id: 'ev-1',
        comments: null,
      });
      mockPrisma.evidenceItem.update.mockResolvedValue({
        id: 'ev-1',
        comments: [{ userId: 'user-2', comment: 'First comment', timestamp: expect.any(String) }],
      });

      const result = await service.addComment('ev-1', 'user-2', 'First comment');

      expect(result).toBeDefined();
    });
  });
});
