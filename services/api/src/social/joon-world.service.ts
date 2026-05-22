import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

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
  private pods = new Map<string, Pod>();
  private sessions = new Map<string, PodSession[]>();

  constructor(private eventEmitter: EventEmitter2) {
    this.initializeDefaultPods();
  }

  private initializeDefaultPods() {
    const templates: Pod[] = [
      { id: 'library-1', template: 'library', name: 'Study Library', maxUsers: 4, currentUsers: 0, isApproved: true },
      { id: 'lab-1', template: 'lab', name: 'Science Lab', maxUsers: 4, currentUsers: 0, isApproved: true },
      { id: 'art-1', template: 'art-studio', name: 'Creative Studio', maxUsers: 4, currentUsers: 0, isApproved: true },
    ];
    templates.forEach(p => this.pods.set(p.id, p));
  }

  async joinPod(podId: string, userId: string, age: number): Promise<PodSession> {
    if (age < 13) {
      const parentApproval = await this.checkParentApproval(userId, podId);
      if (!parentApproval) {
        throw new Error('Parent approval required for children under 13');
      }
    }

    const pod = this.pods.get(podId);
    if (!pod) throw new Error('Pod not found');
    if (!pod.isApproved) throw new Error('Pod not approved');
    if (pod.currentUsers >= pod.maxUsers) throw new Error('Pod is full');

    const session: PodSession = {
      podId,
      userId,
      joinedAt: new Date(),
      position: { x: 0, y: 0, z: 0 },
      avatarColor: this.generateAvatarColor(),
    };

    const podSessions = this.sessions.get(podId) || [];
    podSessions.push(session);
    this.sessions.set(podId, podSessions);

    pod.currentUsers++;
    this.pods.set(podId, pod);

    this.eventEmitter.emit('pod:user:joined', { podId, userId });

    return session;
  }

  async leavePod(podId: string, userId: string): Promise<void> {
    const podSessions = this.sessions.get(podId) || [];
    const filtered = podSessions.filter(s => s.userId !== userId);
    this.sessions.set(podId, filtered);

    const pod = this.pods.get(podId);
    if (pod) {
      pod.currentUsers = Math.max(0, pod.currentUsers - 1);
      this.pods.set(podId, pod);
    }

    this.eventEmitter.emit('pod:user:left', { podId, userId });
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
    return Array.from(this.pods.values()).filter(p => {
      if (age < 13 && !p.isApproved) return false;
      return p.currentUsers < p.maxUsers;
    });
  }

  async getPodUsers(podId: string): Promise<PodSession[]> {
    return this.sessions.get(podId) || [];
  }

  async getUserSBTs(userId: string): Promise<any[]> {
    return [];
  }
}
