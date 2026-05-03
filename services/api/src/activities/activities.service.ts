import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QuestPillar } from '../shared/prisma-enums';
import { RRule } from 'rrule';

interface ConflictResult {
  hasConflict: boolean;
  conflictingActivity?: any;
  suggestedTime?: Date;
  reasoning?: string;
}

@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(private prisma: PrismaService) {}

  async createActivity(userId: string, data: {
    title: string;
    description?: string;
    pillar?: QuestPillar;
    startTime: Date;
    endTime: Date;
    rrule?: string;
    questId?: string;
    goalId?: string;
    isDeepWork?: boolean;
    metadata?: Record<string, any>;
  }) {
    // Check for conflicts (UC-022, FR-22.1)
    const conflictCheck = await this.detectConflict(userId, data.startTime, data.endTime);

    if (conflictCheck.hasConflict) {
      this.logger.warn(`⚠️ Schedule conflict detected for user ${userId}`);
    }

    const activity = await this.prisma.activity.create({
      data: {
        userId,
        title: data.title,
        description: data.description,
        pillar: data.pillar,
        startTime: data.startTime,
        endTime: data.endTime,
        rrule: data.rrule,
        isRecurring: !!data.rrule,
        questId: data.questId,
        goalId: data.goalId,
        isDeepWork: data.isDeepWork ?? false,
        metadata: data.metadata ?? {},
      },
    });

    return { activity, conflict: conflictCheck };
  }

  // UC-022: Conflict Resolution Engine — must run < 200ms (NFR-22.1)
  async detectConflict(userId: string, startTime: Date, endTime: Date, excludeId?: string): Promise<ConflictResult> {
    const overlapping = await this.prisma.activity.findFirst({
      where: {
        userId,
        id: excludeId ? { not: excludeId } : undefined,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (!overlapping) return { hasConflict: false };

    // Suggest next available 1-hour slot after the conflict ends
    const suggestedTime = new Date(overlapping.endTime);
    suggestedTime.setMinutes(suggestedTime.getMinutes() + 15); // 15 min buffer

    return {
      hasConflict: true,
      conflictingActivity: overlapping,
      suggestedTime,
      reasoning: `"${overlapping.title}" is scheduled until ${overlapping.endTime.toLocaleTimeString()}. We suggest starting 15 minutes after it ends.`,
    };
  }

  async updateActivity(activityId: string, userId: string, updates: Partial<{
    title: string;
    description: string;
    startTime: Date;
    endTime: Date;
    status: string;
    pillar: QuestPillar;
    metadata: Record<string, any>;
  }>) {
    const existing = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!existing) throw new Error('Activity not found');

    // Version history (UC-014)
    const versionHistory = (existing.versionHistory as any[]) ?? [];
    versionHistory.push({
      version: existing.version,
      snapshot: existing,
      changedAt: new Date().toISOString(),
    });

    return this.prisma.activity.update({
      where: { id: activityId },
      data: {
        ...(updates as any),
        version: (existing as any).version + 1,
        versionHistory,
        updatedAt: new Date(),
      } as any,
    });
  }

  async getUserCalendar(userId: string, from: Date, to: Date) {
    const activities = await this.prisma.activity.findMany({
      where: {
        userId,
        startTime: { gte: from },
        endTime: { lte: to },
      },
      orderBy: { startTime: 'asc' },
    });

    // Expand recurring events
    const expanded: any[] = [];
    for (const act of activities) {
      expanded.push(act);
      if (act.isRecurring && act.rrule) {
        try {
          const rule = RRule.fromString(act.rrule);
          const occurrences = rule.between(from, to, true);
          for (const occ of occurrences.slice(1)) { // skip first (already in result)
            expanded.push({ ...act, startTime: occ, id: `${act.id}_${occ.toISOString()}` });
          }
        } catch (e) {
          this.logger.warn(`Failed to expand rrule for activity ${act.id}`);
        }
      }
    }

    return expanded.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  async bulkImport(userId: string, items: Array<{
    title: string; startTime: Date; endTime: Date; pillar?: QuestPillar;
  }>) {
    return this.prisma.activity.createMany({
      data: items.map(item => ({ ...item, userId })),
      skipDuplicates: true,
    });
  }
}
