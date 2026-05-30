import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FamilyService } from './family.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { UserRole } from '../shared/user-role';

describe('FamilyService', () => {
  let service: FamilyService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    familyLink: { findFirst: jest.fn(), upsert: jest.fn(), findMany: jest.fn(), delete: jest.fn() },
    auditLog: { create: jest.fn() },
  };

  const mockMetrics = {
    familyLinks: { inc: jest.fn() },
    inc: jest.fn(),
    authFailures: { inc: jest.fn() },
    signupsTotal: { inc: jest.fn() },
    activeUsers: { set: jest.fn() },
    doterLevelUps: { inc: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MetricsService, useValue: mockMetrics },
      ],
    }).compile();

    service = module.get<FamilyService>(FamilyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('linkChildToParent', () => {
    const parentId = 'parent-1';
    const childId = 'child-1';
    const consentMethod = 'email_verified';

    it('should link a child to a parent successfully', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: parentId, role: UserRole.PARENT })
        .mockResolvedValueOnce({ id: childId, role: UserRole.CHILD });
      mockPrisma.familyLink.findFirst.mockResolvedValue(null);
      const link = { id: 'link-1', parentId, childId, consentVerified: true, consentMethod };
      mockPrisma.familyLink.upsert.mockResolvedValue(link);
      mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' });

      const result = await service.linkChildToParent(parentId, childId, consentMethod);

      expect(result).toEqual(link);
      expect(mockMetrics.familyLinks.inc).toHaveBeenCalledWith({ status: 'verified' });
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ actorId: parentId, action: 'FAMILY_LINK_CREATED' }) }),
      );
    });

    it('should throw ForbiddenException when linking to self', async () => {
      await expect(service.linkChildToParent(parentId, parentId, consentMethod))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when parent not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.linkChildToParent(parentId, childId, consentMethod))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when child not found', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: parentId, role: UserRole.PARENT })
        .mockResolvedValueOnce(null);

      await expect(service.linkChildToParent(parentId, childId, consentMethod))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when child role is not CHILD', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: parentId, role: UserRole.PARENT })
        .mockResolvedValueOnce({ id: childId, role: UserRole.ADMIN });

      await expect(service.linkChildToParent(parentId, childId, consentMethod))
        .rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when child already linked to another parent', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: parentId, role: UserRole.PARENT })
        .mockResolvedValueOnce({ id: childId, role: UserRole.CHILD });
      mockPrisma.familyLink.findFirst.mockResolvedValue({ id: 'other-link', parentId: 'other-parent', childId });

      await expect(service.linkChildToParent(parentId, childId, consentMethod))
        .rejects.toThrow(ForbiddenException);
    });

    it('should allow re-linking when already linked to same parent', async () => {
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ id: parentId, role: UserRole.PARENT })
        .mockResolvedValueOnce({ id: childId, role: UserRole.CHILD });
      mockPrisma.familyLink.findFirst.mockResolvedValue({ id: 'link-1', parentId, childId });
      const link = { id: 'link-1', parentId, childId, consentVerified: true, consentMethod };
      mockPrisma.familyLink.upsert.mockResolvedValue(link);

      const result = await service.linkChildToParent(parentId, childId, consentMethod);

      expect(result).toEqual(link);
    });
  });

  describe('getFamily', () => {
    it('should return family links with child and doter profile', async () => {
      const familyLinks = [
        { id: 'link-1', parentId: 'parent-1', child: { id: 'child-1', doterProfile: { name: 'Fluffy' } } },
      ];
      mockPrisma.familyLink.findMany.mockResolvedValue(familyLinks);

      const result = await service.getFamily('parent-1');

      expect(result).toEqual(familyLinks);
      expect(mockPrisma.familyLink.findMany).toHaveBeenCalledWith({
        where: { parentId: 'parent-1' },
        include: { child: { include: { doterProfile: true } } },
      });
    });

    it('should return empty array when no family links', async () => {
      mockPrisma.familyLink.findMany.mockResolvedValue([]);

      const result = await service.getFamily('parent-1');

      expect(result).toEqual([]);
    });
  });

  describe('unlinkChild', () => {
    it('should delete the family link', async () => {
      const deleted = { id: 'link-1', parentId: 'parent-1', childId: 'child-1' };
      mockPrisma.familyLink.delete.mockResolvedValue(deleted);

      const result = await service.unlinkChild('parent-1', 'child-1');

      expect(result).toEqual(deleted);
      expect(mockPrisma.familyLink.delete).toHaveBeenCalledWith({
        where: { parentId_childId: { parentId: 'parent-1', childId: 'child-1' } },
      });
    });

    it('should propagate prisma delete error', async () => {
      mockPrisma.familyLink.delete.mockRejectedValue(new Error('Not found'));

      await expect(service.unlinkChild('parent-1', 'child-1')).rejects.toThrow('Not found');
    });
  });
});
