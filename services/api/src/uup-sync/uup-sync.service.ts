import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UUPSchemaV4, createDefaultUUP, validateUUPPartial, UUP } from '../schemas/uup/v4';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SyncPayload {
  source: 'biometric' | 'academic' | 'gamification' | 'entrepreneurship' | 'social' | 'accessibility' | 'parent_override' | 'system' | 'ai';
  userId: string;
  data: Partial<UUP>;
  actorId: string;
  actorRole: 'CHILD' | 'YOUNG_ADULT' | 'PARENT' | 'TUTOR' | 'ADMIN';
}

export interface SyncResult {
  success: boolean;
  mergedFields: string[];
  triggeredEvents: string[];
  conflictDetected?: boolean;
}

@Injectable()
export class UUPSyncService {
  private readonly logger = new Logger(UUPSyncService.name);
  private readonly UUP_UPDATED_CHANNEL = 'udb:uup_updated';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private eventEmitter: EventEmitter2,
  ) {}

  async sync(payload: SyncPayload): Promise<SyncResult> {
    const { source, userId, data, actorId, actorRole } = payload;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const userAge = user.dateOfBirth ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000)) : 6;
    const currentUUP = (user as any).uupData || createDefaultUUP(userId, userAge);

    const merged = this.deepMerge(currentUUP, data, source, actorRole);

    const conflictDetected = await this.checkConflict(userId, (user as any).updatedAt);

    if (conflictDetected) {
      throw new ConflictException('Concurrent modification detected. Please refresh and retry.');
    }

    const updatedUUP = {
      ...merged,
      metadata: {
        ...merged.metadata,
        last_updated: new Date().toISOString(),
      },
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: { uupData: updatedUUP },
    });

    const triggeredEvents = await this.checkTriggers(updatedUUP, source);

    for (const event of triggeredEvents) {
      this.eventEmitter.emit(event, { userId, data: updatedUUP });
    }

    await this.redis.publish(this.UUP_UPDATED_CHANNEL, {
      userId,
      source,
      changedPillars: Object.keys(data),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`UUP sync completed for user ${userId}, source: ${source}, events: ${triggeredEvents.length}`);

    return {
      success: true,
      mergedFields: Object.keys(data),
      triggeredEvents,
      conflictDetected: false,
    };
  }

  private deepMerge(current: UUP, incoming: Partial<UUP>, source: string, actorRole: string): UUP {
    const merged = JSON.parse(JSON.stringify(current));

    const pillarMap: Record<string, keyof UUP> = {
      biometric: 'biometric',
      academic: 'academic',
      gamification: 'gamification',
      entrepreneurship: 'entrepreneurship',
      social: 'social',
      accessibility: 'accessibility',
    };

    const targetPillar = pillarMap[source];
    if (targetPillar && incoming[targetPillar]) {
      const priority = this.getPriority(source, actorRole);
      if (priority >= this.getPriority(source, 'SYSTEM')) {
        const current = (merged as any)[targetPillar] || {};
        const inc = (incoming as any)[targetPillar] || {};
        (merged as any)[targetPillar] = { ...current, ...inc };
      }
    }

    if (source === 'parent_override') {
      return { ...merged, ...incoming };
    }

    return merged;
  }

  private getPriority(source: string, role: string): number {
    if (role === 'PARENT') return 100;
    if (role === 'ADMIN') return 80;
    if (source === 'ai') return 50;
    return 10;
  }

  private async checkConflict(userId: string, updatedAt: Date): Promise<boolean> {
    const lockKey = `uup:lock:${userId}`;
    const lock = await this.redis.getClient().get(lockKey);

    if (lock) {
      const lockTime = parseInt(lock);
      if (Date.now() - lockTime < 5000) {
        return true;
      }
    }

    await this.redis.getClient().set(lockKey, Date.now().toString(), 'EX', 5);
    return false;
  }

  private async checkTriggers(uup: UUP, source: string): Promise<string[]> {
    const events: string[] = [];

    if (uup.biometric.avg_sleep_hours !== undefined && uup.biometric.avg_sleep_hours < 6) {
      events.push('doter:state:sluggish');
    }

    if (uup.biometric.stress_index !== undefined && uup.biometric.stress_index > 0.7) {
      events.push('safety:stress:alert');
    }

    if (uup.gamification.xp !== undefined) {
      const level = Math.floor(uup.gamification.xp / 1000) + 1;
      if (level > uup.gamification.doter_level) {
        events.push('doter:evolve');
      }
    }

    if (uup.academic.workload_forecast !== undefined && uup.academic.workload_forecast > 0.85) {
      events.push('planner:overload:warning');
    }

    return events;
  }

  async getUUP(userId: string): Promise<UUP> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const userAge = user.dateOfBirth ? Math.floor((Date.now() - user.dateOfBirth.getTime()) / (365.25 * 24 * 3600 * 1000)) : 6;
    return (user as any).uupData || createDefaultUUP(userId, userAge);
  }

  async getDevices(userId: string): Promise<any[]> {
    return [];
  }

  async getConflicts(userId: string, status?: string): Promise<any[]> {
    return [];
  }

  async getConflict(userId: string, conflictId: string): Promise<any> {
    return null;
  }

  async getRetryQueueSize(userId: string): Promise<number> {
    return 0;
  }

  async registerDevice(userId: string, deviceId: string, deviceName?: string, deviceType?: string): Promise<any> {
    return { registered: true };
  }

  async syncState(userId: string, deviceId: string, localState: any): Promise<any> {
    return { synced: true };
  }

  async resolveConflict(userId: string, conflictId: string, resolution: any): Promise<any> {
    return { resolved: true, resolution };
  }

  async enqueueOfflineChange(userId: string, deviceId: string, payload: any): Promise<any> {
    return { queued: true };
  }

  async processRetryQueue(): Promise<any> {
    return { processed: 0, failed: 0 };
  }

  async initializeUUP(userId: string, age: number): Promise<UUP> {
    const defaultUUP = createDefaultUUP(userId, age);

    await this.prisma.user.upsert({
      where: { id: userId },
      update: { uupData: defaultUUP as any },
      create: {
        id: userId,
        firebaseUid: userId,
        email: '',
        role: 'CHILD' as any,
        uupData: defaultUUP as any,
      } as any,
    });

    return defaultUUP;
  }
}
