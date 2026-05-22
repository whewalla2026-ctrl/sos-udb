import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class FeatureFlagService {
  private flags = new Map<string, FeatureFlag>();

  constructor(private configService: ConfigService) {
    this.initializeDefaultFlags();
  }

  private initializeDefaultFlags() {
    const defaults: FeatureFlag[] = [
      { name: 'offline-tutor', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'biometric-feed', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'electron-agent', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'safety-score', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'data-export', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'joon-world', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'co-op-quests', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'messaging', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'institutional', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'quest-store', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'ai-feedback', enabled: false, createdAt: new Date(), updatedAt: new Date() },
      { name: 'skill-gap-analysis', enabled: true, createdAt: new Date(), updatedAt: new Date() },
      { name: 'streak-freeze-auto', enabled: false, createdAt: new Date(), updatedAt: new Date() },
    ];

    defaults.forEach(f => this.flags.set(f.name, f));
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
    }
  }

  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.flags.values());
  }

  async getFlag(flagName: string): Promise<FeatureFlag | undefined> {
    return this.flags.get(flagName);
  }
}
