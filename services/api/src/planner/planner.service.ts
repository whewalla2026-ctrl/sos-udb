import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UUPSyncService } from '../uup-sync/uup-sync.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as rrule from 'rrule';

export interface PlannerSlot {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  activityType: string;
  title: string;
  explanation: string;
  goalMappings: string[];
  isLocked: boolean;
}

export interface PlannerDraft {
  id: string;
  userId: string;
  weekStart: string;
  slots: PlannerSlot[];
  conflicts: Conflict[];
  status: 'DRAFT' | 'APPROVED' | 'EXPIRED';
}

export interface Conflict {
  slotA: string;
  slotB: string;
  type: 'TIME_OVERLAP' | 'COGNITIVE_OVERLOAD' | 'SCREEN_LIMIT';
  suggestion: string;
}

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  constructor(
    private prisma: PrismaService,
    private uupSync: UUPSyncService,
    private eventEmitter: EventEmitter2,
  ) {}

  async generateDraft(userId: string, weekStart: string): Promise<PlannerDraft> {
    const uup = await this.uupSync.getUUP(userId);
    const skillGaps = await this.analyzeSkillGaps(userId);
    const chronotype = uup.biometric?.chronotype || 'neutral';

    const slots = this.generateBalancedSchedule(userId, weekStart, skillGaps, chronotype);
    const conflicts = this.detectConflicts(slots);

    const draft: PlannerDraft = {
      id: crypto.randomUUID(),
      userId,
      weekStart,
      slots,
      conflicts,
      status: 'DRAFT',
    };

    await this.saveDraft(draft);

    return draft;
  }

  private analyzeSkillGaps(userId: string): string[] {
    return ['social', 'physical'];
  }

  private generateBalancedSchedule(userId: string, weekStart: string, gaps: string[], chronotype: string): PlannerSlot[] {
    const slots: PlannerSlot[] = [];
    const chronotypeSchedule = this.getChronotypeSchedule(chronotype);

    for (let day = 0; day < 7; day++) {
      const cognitiveBlocks = 2;
      const physicalBlocks = 1;
      const creativeBlocks = 1;

      let creativeIdx = 0;
      for (let i = 0; i < cognitiveBlocks; i++) {
        slots.push(this.createSlot(day, chronotypeSchedule.cognitive[i], 'cognitive', 'Academic Focus', `Scheduled at ${chronotypeSchedule.cognitive[i]} due to your ${chronotype} peak`, []));
        creativeIdx = i;
      }

      if (day === 0 || day === 3 || day === 6) {
        slots.push(this.createSlot(day, '14:00', 'physical', 'Physical Activity', 'Scheduled after lunch for optimal benefit', []));
      }

      slots.push(this.createSlot(day, chronotypeSchedule.creative[creativeIdx % 2], 'creative', 'Creative Play', 'Creative activities during low-focus window', []));
    }

    return slots;
  }

  private getChronotypeSchedule(chronotype: string): { cognitive: string[]; creative: string[] } {
    const schedules: Record<string, { cognitive: string[]; creative: string[] }> = {
      morning_logic: { cognitive: ['09:00', '10:30'], creative: ['14:00', '15:30'] },
      afternoon_creative: { cognitive: ['14:00', '15:30'], creative: ['09:00', '10:30'] },
      evening_social: { cognitive: ['15:00', '16:30'], creative: ['09:00', '10:30'] },
      neutral: { cognitive: ['09:00', '14:00'], creative: ['11:00', '15:00'] },
    };
    return schedules[chronotype] || schedules.neutral;
  }

  private createSlot(day: number, startTime: string, activityType: string, title: string, explanation: string, goalMappings: string[]): PlannerSlot {
    const [hours, minutes] = startTime.split(':').map(Number);
    const endTime = `${String(hours + 1).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

    return {
      id: crypto.randomUUID(),
      day,
      startTime,
      endTime,
      activityType,
      title,
      explanation,
      goalMappings,
      isLocked: false,
    };
  }

  private detectConflicts(slots: PlannerSlot[]): Conflict[] {
    const conflicts: Conflict[] = [];

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].day === slots[j].day && this.timeOverlap(slots[i], slots[j])) {
          conflicts.push({
            slotA: slots[i].id,
            slotB: slots[j].id,
            type: 'TIME_OVERLAP',
            suggestion: 'Consider moving creative activities to a different time slot.',
          });
        }
      }
    }

    const screenTimeByDay = slots.filter((s) => s.activityType === 'screen').reduce((acc, s) => {
      acc[s.day] = (acc[s.day] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    for (const [day, count] of Object.entries(screenTimeByDay)) {
      if (count > 3) {
        conflicts.push({
          slotA: 'screen_limit',
          slotB: day,
          type: 'SCREEN_LIMIT',
          suggestion: 'Max 3h screen time per day for ages under 12. Consider replacing with physical activity.',
        });
      }
    }

    return conflicts;
  }

  private timeOverlap(a: PlannerSlot, b: PlannerSlot): boolean {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);
  }

  private async saveDraft(draft: PlannerDraft): Promise<void> {
    this.eventEmitter.emit('planner:draft:created', draft);
  }

  async approveDraft(draftId: string, modifications?: Partial<PlannerSlot>[]): Promise<PlannerDraft> {
    return { id: draftId, userId: '', weekStart: '', slots: [], conflicts: [], status: 'APPROVED' };
  }

  async getWeeklyPlan(userId: string, weekStart: string): Promise<PlannerDraft | null> {
    return null;
  }
}

import * as crypto from 'crypto';
