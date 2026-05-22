import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GdprService {
  constructor(private prisma: PrismaService) {}

  async exportUserData(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        doterProfile: true,
        goals: true,
        quests: true,
        pointsLedger: true,
        notifications: true,
        parentLinks: { include: { child: true } },
        childLinks: { include: { parent: true } },
      },
    }) as any;

    if (!user) {
      throw new Error('User not found');
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        coppaConsentVerified: user.coppaConsentVerified,
        coppaConsentDate: user.coppaConsentDate,
        gdprDeleteRequested: user.gdprDeleteRequested,
      },
      doterProfile: user.doterProfile ? {
        grade: user.doterProfile.grade,
        learningStyle: user.doterProfile.learningStyle,
        interests: user.doterProfile.interests,
        preferredSessionLength: user.doterProfile.preferredSessionLength,
        accessibilitySettings: user.doterProfile.accessibilitySettings,
      } : null,
      goals: user.goals.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        status: g.status,
        targetDate: g.targetDate,
        createdAt: g.createdAt,
      })),
      quests: user.quests.map(q => ({
        id: q.id,
        title: q.title,
        description: q.description,
        status: q.status,
        xpReward: q.xpReward,
        completedAt: q.completedAt,
        createdAt: q.createdAt,
      })),
      pointsHistory: user.pointsLedger.map(p => ({
        id: p.id,
        amount: p.amount,
        balanceAfter: p.balanceAfter,
        description: p.description,
        createdAt: p.createdAt,
      })),
      notifications: user.notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      familyLinks: {
        asParent: user.parentLinks.map(f => ({
          childId: f.childId,
          childName: f.child.displayName,
        })),
        asChild: user.childLinks.map(f => ({
          parentId: f.parentId,
          parentName: f.parent.displayName,
        })),
      },
    };

    return exportData;
  }

  async requestDeletion(userId: string): Promise<{ deletionId: string; scheduledDate: string }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.gdprDeleteRequested) {
      throw new Error('Deletion already requested');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { gdprDeleteRequested: true },
    });

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30);

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'GDPR_DELETE_REQUESTED',
        payload: JSON.stringify({
          requestedAt: new Date().toISOString(),
          scheduledDeletion: scheduledDate.toISOString(),
        }),
      },
    });

    return {
      deletionId: updatedUser.id,
      scheduledDate: scheduledDate.toISOString(),
    };
  }

  async cancelDeletionRequest(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.gdprDeleteRequested) {
      throw new Error('No deletion request found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { gdprDeleteRequested: false },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'GDPR_DELETE_CANCELLED',
        payload: JSON.stringify({ cancelledAt: new Date().toISOString() }),
      },
    });

    return true;
  }

  async recordConsent(userId: string, consentType: string, granted: boolean): Promise<boolean> {
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'GDPR_CONSENT',
        payload: JSON.stringify({
          consentType,
          granted,
          recordedAt: new Date().toISOString(),
        }),
      },
    });

    return true;
  }

  async getConsentStatus(userId: string): Promise<Record<string, any>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        coppaConsentVerified: true,
        coppaConsentDate: true,
        gdprDeleteRequested: true,
      },
    });

    const auditLogs = await this.prisma.auditLog.findMany({
      where: { actorId: userId, action: 'GDPR_CONSENT' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      coppaConsent: {
        verified: user?.coppaConsentVerified ?? false,
        date: user?.coppaConsentDate,
      },
      gdprDeleteRequested: user?.gdprDeleteRequested ?? false,
      consentHistory: auditLogs.map(log => JSON.parse(log.payload as string)),
    };
  }
}
