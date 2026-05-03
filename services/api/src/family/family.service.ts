import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FamilyService {
  constructor(private prisma: PrismaService) {}

  async linkChildToParent(parentId: string, childId: string, consentMethod: string) {
    const link = await this.prisma.familyLink.upsert({
      where: { parentId_childId: { parentId, childId } },
      create: { parentId, childId, consentVerified: true, consentMethod },
      update: { consentVerified: true, consentMethod },
    });
    await this.prisma.auditLog.create({
      data: { actorId: parentId, action: 'FAMILY_LINK_CREATED', targetType: 'User', targetId: childId, payload: { consentMethod } },
    });
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
