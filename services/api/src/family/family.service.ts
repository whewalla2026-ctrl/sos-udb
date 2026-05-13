import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { UserRole } from '../shared/user-role';

@Injectable()
export class FamilyService {
  constructor(
    private prisma: PrismaService,
    private metrics: MetricsService,
  ) {}

  async linkChildToParent(parentId: string, childId: string, consentMethod: string) {
    if (parentId === childId) throw new ForbiddenException('Cannot link to yourself');

    const parent = await this.prisma.user.findUnique({ where: { id: parentId }, select: { id: true, role: true } });
    if (!parent) throw new NotFoundException('Parent not found');

    const child = await this.prisma.user.findUnique({ where: { id: childId }, select: { id: true, role: true } });
    if (!child) throw new NotFoundException('Child not found');
    if (child.role !== UserRole.CHILD) throw new ForbiddenException('Can only link to users with CHILD role');

    const existing = await this.prisma.familyLink.findFirst({ where: { childId } });
    if (existing && existing.parentId !== parentId) throw new ForbiddenException('Child already linked to another parent');

    const link = await this.prisma.familyLink.upsert({
      where: { parentId_childId: { parentId, childId } },
      create: { parentId, childId, consentVerified: true, consentMethod },
      update: { consentVerified: true, consentMethod },
    });
    await this.prisma.auditLog.create({
      data: { actorId: parentId, action: 'FAMILY_LINK_CREATED', targetType: 'User', targetId: childId, payload: { consentMethod } },
    });
    this.metrics.familyLinks.inc({ status: link.consentVerified ? 'verified' : 'pending' });
    return link;
  }

  async getFamily(parentId: string) {
    return this.prisma.familyLink.findMany({
      where: { parentId },
      include: { child: { include: { doterProfile: true } } },
    });
  }

  async unlinkChild(parentId: string, childId: string) {
    return this.prisma.familyLink.delete({ where: { parentId_childId: { parentId, childId } } });
  }
}
