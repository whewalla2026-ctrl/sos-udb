import { Injectable, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FeatureFlagService implements OnModuleInit {
  private flags = new Map<string, FeatureFlag>();
  private readonly FLAG_HASH_KEY = 'feature-flags';

  constructor(
    private configService: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {}

  async onModuleInit() {
    await this.initializeDefaultFlags();
  }

  private async initializeDefaultFlags() {
    const existing = await this.redis.hgetall(this.FLAG_HASH_KEY);
    if (existing && Object.keys(existing).length > 0) {
      for (const [name, json] of Object.entries(existing)) {
        this.flags.set(name, JSON.parse(json));
      }
      return;
    }

    const defaults: FeatureFlag[] = [
      { name: 'offline-tutor', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'biometric-feed', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'desktop-agent', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'safety-score', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'data-export', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'joon-world', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'co-op-quests', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'messaging', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'institutional', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'quest-store', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'ai-feedback', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'skill-gap-analysis', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'streak-freeze-auto', enabled: true, createdAt: new Date(), updatedAt: new Date() },
    ];

    for (const flag of defaults) {
      this.flags.set(flag.name, flag);
      await this.redis.hset(this.FLAG_HASH_KEY, flag.name, JSON.stringify(flag));
    }
  }

  async isEnabled(flagName: string, userId?: string): Promise<boolean> {
    const flag = this.flags.get(flagName);
    if (!flag) return false;

    if (!flag.enabled) return false;

    if (flag.rolloutPercentage !== undefined && userId) {
      const userHash = this.hashUserId(userId);
      return userHash < flag.rolloutPercentage;
    }

    return flag.enabled;
  }

  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash % 100);
  }

  async setFlag(flagName: string, enabled: boolean, rolloutPercentage?: number): Promise<void> {
    const flag = this.flags.get(flagName);
    if (flag) {
      flag.enabled = enabled;
      flag.rolloutPercentage = rolloutPercentage;
      flag.updatedAt = new Date();
      await this.redis.hset(this.FLAG_HASH_KEY, flagName, JSON.stringify(flag));
    }
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getFlag(flagName: string): Promise<FeatureFlag | undefined> {
    return this.flags.get(flagName);
  }
}
