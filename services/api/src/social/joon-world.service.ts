import { Injectable, Logger, Inject } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { REDIS_CLIENT } from '../redis/redis.constants';
import Redis from 'ioredis';

export interface PodSession {
  podId: string;
  userId: string;
  joinedAt: Date;
  position: { x: number; y: number; z: number };
  avatarColor: string;
}

export interface PodMessage {
  podId: string;
  userId: string;
  message: string;
  timestamp: Date;
}

export interface Pod {
  id: string;
  template: 'library' | 'lab' | 'art-studio';
  name: string;
  maxUsers: number;
  currentUsers: number;
  isApproved: boolean;
}

@Injectable()
export class JoonWorldService {
  private readonly logger = new Logger(JoonWorldService.name);
  private readonly POD_KEY_PREFIX = 'joon-world:pod:';
  private readonly DEFAULT_PODS = [
    { id: 'library-1', template: 'library' as const, name: 'Study Library', maxUsers: 4, currentUsers: 0, isApproved: true },
    { id: 'lab-1', template: 'lab' as const, name: 'Science Lab', maxUsers: 4, currentUsers: 0, isApproved: true },
    { id: 'art-1', template: 'art-studio' as const, name: 'Creative Studio', maxUsers: 4, currentUsers: 0, isApproved: true },
  ];

  constructor(
    private eventEmitter: EventEmitter2,
    @Inject(REDIS_CLIENT) private redis: Redis,
  ) {
    this.initializeDefaultPods();
  }

  private async initializeDefaultPods() {
    for (const pod of this.DEFAULT_PODS) {
      const key = `${this.POD_KEY_PREFIX}${pod.id}`;
      const exists = await this.redis.exists(key);
      if (!exists) {
        await this.redis.set(key, JSON.stringify(pod));
      }
    }
  }

  private async getPod(podId: string): Promise<Pod | null> {
    const raw = await this.redis.get(`${this.POD_KEY_PREFIX}${podId}`);
    return raw ? JSON.parse(raw) : null;
  }

  private async savePod(pod: Pod): Promise<void> {
    await this.redis.set(`${this.POD_KEY_PREFIX}${pod.id}`, JSON.stringify(pod));
  }

  private sessionKey(podId: string): string {
    return `${this.POD_KEY_PREFIX}${podId}:sessions`;
  }

  async joinPod(podId: string, userId: string, age: number): Promise<PodSession> {
    if (age < 13) {
      const parentApproval = await this.checkParentApproval(userId, podId);
      if (!parentApproval) {
        throw new Error('Parent approval required for children under 13');
      }
    }

    const pod = await this.getPod(podId);
    if (!pod) throw new Error('Pod not found');
    if (!pod.isApproved) throw new Error('Pod not approved');

    const sessionCount = await this.redis.hlen(this.sessionKey(podId));
    if (sessionCount >= pod.maxUsers) throw new Error('Pod is full');

    const session: PodSession = {
      podId,
      userId,
      joinedAt: new Date(),
      position: { x: 0, y: 0, z: 0 },
      avatarColor: this.generateAvatarColor(),
    };

    await this.redis.hset(this.sessionKey(podId), userId, JSON.stringify(session));
    pod.currentUsers = sessionCount + 1;
    await this.savePod(pod);

    this.eventEmitter.emit('pod:user:joined', { podId, userId });

    return session;
  }

  async leavePod(podId: string, userId: string): Promise<void> {
    const removed = await this.redis.hdel(this.sessionKey(podId), userId);
    if (removed > 0) {
      const pod = await this.getPod(podId);
      if (pod) {
        const remaining = await this.redis.hlen(this.sessionKey(podId));
        pod.currentUsers = remaining;
        await this.savePod(pod);
      }
      this.eventEmitter.emit('pod:user:left', { podId, userId });
    }
  }

  async sendMessage(podId: string, userId: string, message: string, age: number): Promise<PodMessage> {
    if (age < 13) {
      throw new Error('Voice chat disabled for children under 13');
    }

    const moderated = await this.moderateContent(message);
    if (moderated.flagged) {
      throw new Error('Message flagged for review');
    }

    const podMessage: PodMessage = {
      podId,
      userId,
      message: moderated.cleaned,
      timestamp: new Date(),
    };

    this.eventEmitter.emit('pod:message', podMessage);
    return podMessage;
  }

  private async moderateContent(content: string): Promise<{ flagged: boolean; cleaned: string }> {
    return { flagged: false, cleaned: content };
  }

  private async checkParentApproval(userId: string, podId: string): Promise<boolean> {
    return true;
  }

  private generateAvatarColor(): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  async getAvailablePods(age: number): Promise<Pod[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const [nextCursor, found] = await (this.redis as any).scan(cursor, 'MATCH', `${this.POD_KEY_PREFIX}*`, 'COUNT', '100');
      cursor = nextCursor;
      for (const key of found) {
        if (!key.endsWith(':sessions')) {
          keys.push(key);
        }
      }
    } while (cursor !== '0');

    const pods: Pod[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      if (raw) {
        pods.push(JSON.parse(raw));
      }
    }

    return pods.filter(p => {
      if (age < 13 && !p.isApproved) return false;
      return p.currentUsers < p.maxUsers;
    });
  }

  async getPodUsers(podId: string): Promise<PodSession[]> {
    const raw = await this.redis.hgetall(this.sessionKey(podId));
    return Object.values(raw).map(v => JSON.parse(v));
  }

  async getUserSBTs(userId: string): Promise<any[]> {
    return [];
  }
}
