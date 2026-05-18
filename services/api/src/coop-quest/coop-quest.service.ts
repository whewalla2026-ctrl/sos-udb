import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';

export interface CoopQuestInstance {
  id: string;
  questId: string;
  familyId: string;
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED';
  parentSubtasksCompleted: string[];
  childSubtasksCompleted: string[];
  pointsSplit: number;
}

@Injectable()
export class CoopQuestService {
  private readonly logger = new Logger(CoopQuestService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
  ) {}

  async acceptQuest(questId: string, familyId: string): Promise<CoopQuestInstance> {
    const active = await this.getActiveCoopQuest(familyId);
    if (active) {
      throw new ConflictException('One active co-op quest per family. Complete or cancel current quest first.');
    }

    const instanceId = crypto.randomUUID();

    await this.prisma.$executeRaw`
      INSERT INTO coop_quest_instances (id, quest_id, family_id, status, created_at)
      VALUES (${instanceId}, ${questId}, ${familyId}, 'ACCEPTED', NOW())
    `;

    return {
      id: instanceId,
      questId,
      familyId,
      status: 'ACCEPTED',
      parentSubtasksCompleted: [],
      childSubtasksCompleted: [],
      pointsSplit: 50,
    };
  }

  async submitSubtask(
    instanceId: string,
    subtaskId: string,
    role: 'parent' | 'child',
    evidence?: string
  ): Promise<void> {
    const field = role === 'parent' ? 'parent_subtasks_completed' : 'child_subtasks_completed';
    
    await this.prisma.$executeRaw`
      UPDATE coop_quest_instances
      SET ${this.prisma} = array_append(${field}, ${subtaskId})
      WHERE id = ${instanceId}
    `;

    const instance = await this.getInstance(instanceId);
    
    const allParentDone = await this.areAllParentSubtasksDone(instance.questId, instance.parentSubtasksCompleted);
    const allChildDone = await this.areAllChildSubtasksDone(instance.questId, instance.childSubtasksCompleted);

    if (allParentDone && allChildDone) {
      await this.completeQuest(instanceId);
    } else {
      await this.prisma.$executeRaw`
        UPDATE coop_quest_instances SET status = 'IN_PROGRESS' WHERE id = ${instanceId}
      `;
    }
  }

  private async completeQuest(instanceId: string): Promise<void> {
    const instance = await this.getInstance(instanceId);

    await this.prisma.$executeRaw`
      UPDATE coop_quest_instances SET status = 'COMPLETED' WHERE id = ${instanceId}
    `;

    const childId = await this.getFamilyChild(instance.familyId);
    const parentId = await this.getFamilyParent(instance.familyId);

    const totalPoints = 100;
    const childPoints = Math.round(totalPoints * (instance.pointsSplit / 100));
    const parentPoints = totalPoints - childPoints;

    await this.uupSync.sync({
      source: 'gamification',
      userId: childId,
      data: { gamification: { coin_balance: childPoints } },
      actorId: parentId,
      actorRole: 'PARENT',
    });

    await this.uupSync.sync({
      source: 'gamification',
      userId: parentId,
      data: { gamification: { coin_balance: parentPoints } },
      actorId: parentId,
      actorRole: 'PARENT',
    });

    this.logger.log(`Co-op quest ${instanceId} completed. Points split: ${childPoints}/${parentPoints}`);
  }

  async getActiveCoopQuest(familyId: string): Promise<CoopQuestInstance | null> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id, quest_id, family_id, status, parent_subtasks_completed, child_subtasks_completed, points_split
      FROM coop_quest_instances
      WHERE family_id = ${familyId} AND status IN ('ACCEPTED', 'IN_PROGRESS', 'PENDING_REVIEW')
      LIMIT 1
    `;

    if (result.length === 0) return null;

    const r = result[0];
    return {
      id: r.id,
      questId: r.quest_id,
      familyId: r.family_id,
      status: r.status,
      parentSubtasksCompleted: r.parent_subtasks_completed || [],
      childSubtasksCompleted: r.child_subtasks_completed || [],
      pointsSplit: r.points_split,
    };
  }

  private async getInstance(instanceId: string): Promise<CoopQuestInstance> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT * FROM coop_quest_instances WHERE id = ${instanceId}
    `;
    return result[0];
  }

  private async areAllParentSubtasksDone(questId: string, completed: string[]): Promise<boolean> {
    return true;
  }

  private async areAllChildSubtasksDone(questId: string, completed: string[]): Promise<boolean> {
    return true;
  }

  private async getFamilyChild(familyId: string): Promise<string> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM users WHERE family_id = ${familyId} AND role = 'CHILD' LIMIT 1
    `;
    return result[0]?.id;
  }

  private async getFamilyParent(familyId: string): Promise<string> {
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT id FROM users WHERE family_id = ${familyId} AND role = 'PARENT' LIMIT 1
    `;
    return result[0]?.id;
  }
}

import * as crypto from 'crypto';