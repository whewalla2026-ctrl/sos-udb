import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import * as crypto from 'crypto';

export type DataSource = 'gamification' | 'academic' | 'biometric' | 'entrepreneurship' | 'metadata';

export type ConflictResolution = 'pending' | 'local_wins' | 'remote_wins' | 'merged';

interface CrossPillarTrigger {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

@Injectable()
export class UupSyncService {
  private readonly logger = new Logger(UupSyncService.name);

  private readonly RETRY_QUEUE_KEY = 'uup_sync:retry_queue';
  private readonly MAX_RETRIES = 5;
  private readonly BASE_RETRY_DELAY_MS = 1000;

  constructor(
    private prisma: PrismaService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private metrics: MetricsService,
  ) {}

  async syncUUP(userId: string, source: DataSource, payload: Record<string, any>): Promise<void> {
    // 1. Load current user + UUP
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error(`User not found: ${userId}`);

    const currentUUP = (user.uupData as Record<string, any>) || {};

    // 2. Deep merge pillar update
    const updatedUUP = {
      ...currentUUP,
      [source]: {
        ...(currentUUP[source] || {}),
        ...payload,
      },
    };

    // 3. Cross-Pillar Logic
    const triggers = await this.evaluateCrossPillarTriggers(userId, source, payload, updatedUUP);

    // 4. Persist UUP
    await this.prisma.user.update({
      where: { id: userId },
      data: { uupData: updatedUUP, updatedAt: new Date() },
    });

    // 5. Broadcast via Redis Pub/Sub
    await this.redis.publish(
      'uup_updates',
      JSON.stringify({ userId, source, updatedUUP, triggers, timestamp: new Date().toISOString() }),
    );

    // 6. Audit
    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: 'UUP_SYNC',
        payload: { source, triggersCount: triggers.length },
      },
    });

    this.metrics.uupSyncsTotal.inc({ source, result: 'success' });
    this.logger.log(`UUP synced for user ${userId} | source: ${source} | triggers: ${triggers.length}`);
  }

  private async evaluateCrossPillarTriggers(
    userId: string,
    source: DataSource,
    payload: Record<string, any>,
    uup: Record<string, any>,
  ): Promise<CrossPillarTrigger[]> {
    const triggers: CrossPillarTrigger[] = [];

    // ── Biometric Triggers ────────────────────────────────────────────────────
    if (source === 'biometric') {
      const sleep = payload.avg_sleep_hours ?? uup.biometric?.avg_sleep_hours ?? 8;

      if (sleep < 6) {
        // Apply SLUGGISH debuff to Doter
        await this.prisma.doterProfile.updateMany({
          where: { userId },
          data: { isSluggy: true },
        });
        // Notify parent
        await this.createNotification(userId, 'LOW_SLEEP_ALERT', {
          title: '😴 Low Sleep Alert',
          body: `Sleep recorded: ${sleep}h. Recommended minimum is 7h for optimal focus.`,
        });
        triggers.push({ type: 'DOTER_SLUGGISH', severity: 'high', message: `Sleep < 6h: Doter debuffed` });
      } else if (sleep >= 8) {
        // Remove sluggish, apply energetic buff
        await this.prisma.doterProfile.updateMany({
          where: { userId },
          data: { isSluggy: false, isEnergetic: true },
        });
        triggers.push({ type: 'DOTER_ENERGETIC', severity: 'low', message: `Great sleep! Doter buffed` });
      }

      const focus = payload.focus_score ?? 0;
      if (focus < 40) {
        await this.createNotification(userId, 'LOW_FOCUS_ALERT', {
          title: '🧠 Focus Drop Detected',
          body: 'Your focus score is low. How about a 5-minute mindfulness break?',
        });
        triggers.push({ type: 'MINDFULNESS_SUGGESTION', severity: 'medium', message: `Focus < 40` });
      }

      const stress = payload.stress_level ?? 0;
      if (stress > 0.7) {
        await this.createNotification(userId, 'HIGH_STRESS_ALERT', {
          title: '⚡ Stress Spike Detected',
          body: 'High stress detected. Consider taking a short break or trying a breathing exercise.',
        });
        triggers.push({ type: 'STRESS_ALERT', severity: 'high', message: `Stress level ${stress}` });
      }
    }

    // ── Academic Triggers ─────────────────────────────────────────────────────
    if (source === 'academic') {
      const skillGaps = payload.skill_gaps || {};
      const criticalGaps = Object.entries(skillGaps).filter(([_, v]) => (v as number) < 0.2);

      if (criticalGaps.length > 0) {
        await this.createNotification(userId, 'SKILL_GAP_ALERT', {
          title: '📚 Critical Skill Gaps Found',
          body: `${criticalGaps.length} subject(s) need attention: ${criticalGaps.map(([k]) => k).join(', ')}`,
        });
        triggers.push({
          type: 'CRITICAL_SKILL_GAPS',
          severity: 'high',
          message: `${criticalGaps.length} critical gaps detected`,
        });
      }
    }

    // ── Gamification Triggers ─────────────────────────────────────────────────
    if (source === 'gamification') {
      const xp = payload.xp ?? uup.gamification?.xp ?? 0;
      const level = Math.floor(xp / 1000) + 1;
      if (level > (uup.gamification?.level ?? 1)) {
        await this.createNotification(userId, 'LEVEL_UP', {
          title: '🎉 Level Up!',
          body: `You reached Level ${level}! Your Doter is evolving!`,
        });
        triggers.push({ type: 'LEVEL_UP', severity: 'low', message: `New level: ${level}` });
      }
    }

    return triggers;
  }

  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const output = { ...target };
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] !== null && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          output[key] = this.deepMerge(target[key] as Record<string, any>, source[key] as Record<string, any>);
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  private async createNotification(
    userId: string,
    type: string,
    data: { title: string; body: string },
  ) {
    await this.prisma.notification.create({
      data: {
        userId,
        type,
        title: data.title,
        body: data.body,
        data: {},
      },
    });
  }

  async getUUP(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.uupData;
  }

  // ── Phase 4D: Multi-Device Sync ────────────────────────────────────────────

  async registerDevice(userId: string, deviceId: string, deviceName?: string, deviceType = 'web') {
    const hash = await this.hashState(userId);
    await this.prisma.syncSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      create: { userId, deviceId, deviceName, deviceType, lastSyncAt: new Date(), stateHash: hash },
      update: { deviceName, deviceType, lastSyncAt: new Date(), stateHash: hash },
    });
    this.logger.log(`Device registered: ${deviceId} for user ${userId}`);
    return { registered: true };
  }

  async syncState(userId: string, deviceId: string, localState: Record<string, any>) {
    const session = await this.prisma.syncSession.findUnique({ where: { userId_deviceId: { userId, deviceId } } });
    if (!session) throw new Error('Device not registered');

    const currentHash = await this.hashState(userId);
    if (session.stateHash && session.stateHash !== currentHash) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      const conflict = await this.prisma.syncConflict.create({
        data: {
          userId, deviceId, resourceType: 'UUP', resourceId: 'uup_data',
          localValue: localState, remoteValue: (user?.uupData as Record<string, any>) || {},
          resolution: 'pending',
        },
      });
      await this.redis.publish('uup_conflicts', JSON.stringify({ userId, deviceId, conflictId: conflict.id }));
      return { conflict: true, conflictId: conflict.id, message: 'Conflict detected — resolution needed' };
    }

    await this.syncUUP(userId, 'metadata', localState);
    const newHash = await this.hashState(userId);
    await this.prisma.syncSession.update({
      where: { id: session.id },
      data: { lastSyncAt: new Date(), stateHash: newHash },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return { synced: true, state: user?.uupData };
  }

  async resolveConflict(userId: string, conflictId: string, resolution: ConflictResolution) {
    const conflict = await this.prisma.syncConflict.findUnique({ where: { id: conflictId } });
    if (!conflict) throw new Error('Conflict not found');
    if (conflict.userId !== userId) throw new Error('Conflict does not belong to this user');

    if (resolution === 'local_wins') {
      await this.syncUUP(conflict.userId, 'metadata', conflict.localValue as Record<string, any>);
    } else if (resolution === 'remote_wins') {
      await this.syncUUP(conflict.userId, 'metadata', conflict.remoteValue as Record<string, any>);
    } else if (resolution === 'merged') {
      const merged = this.deepMerge(
        conflict.remoteValue as Record<string, any>,
        conflict.localValue as Record<string, any>,
      );
      await this.syncUUP(conflict.userId, 'metadata', merged);
    }

    const newHash = await this.hashState(conflict.userId);
    await this.prisma.syncSession.updateMany({
      where: { userId: conflict.userId },
      data: { stateHash: newHash },
    });

    await this.prisma.syncConflict.update({
      where: { id: conflictId },
      data: { resolution, resolvedAt: new Date() },
    });

    return { resolved: true, resolution };
  }

  async getConflicts(userId: string, status?: string) {
    const where: any = { userId };
    if (status) where.resolution = status;
    return this.prisma.syncConflict.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConflict(userId: string, conflictId: string) {
    const conflict = await this.prisma.syncConflict.findUnique({ where: { id: conflictId } });
    if (!conflict) return null;
    if (conflict.userId !== userId) throw new Error('Conflict not found');
    return conflict;
  }

  // ── Offline Queue & Retry ─────────────────────────────────────────────────

  async enqueueOfflineChange(userId: string, deviceId: string, payload: Record<string, any>) {
    const entry = {
      userId,
      deviceId,
      payload,
      timestamp: new Date().toISOString(),
      retryCount: 0,
    };
    await this.redis.rpush(this.RETRY_QUEUE_KEY, JSON.stringify(entry));
    this.logger.log(`Offline change queued for user ${userId}`);
    return { queued: true };
  }

  async processRetryQueue(): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;
    const queueLength = await this.redis.llen(this.RETRY_QUEUE_KEY);

    for (let i = 0; i < queueLength; i++) {
      const raw = await this.redis.lpop(this.RETRY_QUEUE_KEY);
      if (!raw) break;

      const entry = JSON.parse(raw as string);
      try {
        await this.syncUUP(entry.userId, 'metadata', entry.payload);
        this.metrics.uupSyncsTotal.inc({ source: 'retry_queue', result: 'success' });
        processed++;
      } catch (error) {
        entry.retryCount++;
        if (entry.retryCount < this.MAX_RETRIES) {
          const delay = this.BASE_RETRY_DELAY_MS * Math.pow(2, entry.retryCount - 1);
          this.logger.warn(`Retry ${entry.retryCount}/${this.MAX_RETRIES} for user ${entry.userId} in ${delay}ms`);
          await this.redis.rpush(this.RETRY_QUEUE_KEY, JSON.stringify(entry));
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          this.logger.error(`Max retries reached for user ${entry.userId}, discarding`);
          await this.prisma.auditLog.create({
            data: {
              actorId: entry.userId,
              action: 'UUP_SYNC_RETRY_EXHAUSTED',
              payload: { entry, error: (error as Error).message },
            },
          });
          this.metrics.uupSyncsTotal.inc({ source: 'retry_queue', result: 'failed' });
          failed++;
        }
      }
    }
    return { processed, failed };
  }

  async getRetryQueueSize(userId: string): Promise<number> {
    const queueLength = await this.redis.llen(this.RETRY_QUEUE_KEY);
    let userCount = 0;
    for (let i = 0; i < queueLength; i++) {
      const raw = await this.redis.lindex(this.RETRY_QUEUE_KEY, i);
      if (!raw) break;
      try {
        const entry = JSON.parse(raw as string);
        if (entry.userId === userId) userCount++;
      } catch { continue; }
    }
    return userCount;
  }

  async getDevices(userId: string) {
    return this.prisma.syncSession.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }

  private async hashState(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const uupData = JSON.stringify(user?.uupData || {});
    return crypto.createHash('sha256').update(uupData).digest('hex');
  }
}
