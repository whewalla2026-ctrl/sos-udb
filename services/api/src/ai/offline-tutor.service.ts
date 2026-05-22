import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface OfflineTutorSession {
  sessionId: string;
  userId: string;
  messages: OfflineTutorMessage[];
  turnCount: number;
  isOffline: boolean;
  syncedAt?: Date;
}

export interface OfflineTutorMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: Date;
  synced: boolean;
}

export interface OfflineTutorRequest {
  userId: string;
  sessionId?: string;
  message: string;
  grade: number;
  context?: string[];
}

@Injectable()
export class OfflineTutorService {
  private readonly logger = new Logger(OfflineTutorService.name);
  private sessions = new Map<string, OfflineTutorSession>();

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  async processOfflineMessage(request: OfflineTutorRequest): Promise<{ response: string; sessionId: string; isOfflineMode: boolean }> {
    const sessionId = request.sessionId || crypto.randomUUID();
    let session = this.sessions.get(sessionId);

    if (!session) {
      session = await this.createSession(request.userId, sessionId);
    }

    session.messages.push({
      role: 'user',
      content: request.message,
      timestamp: new Date(),
      synced: false,
    });

    const intent = this.classifyIntent(request.message);
    
    if (intent === 'answer_seeking') {
      const response = this.generateRefusal();
      session.messages.push({
        role: 'assistant',
        content: response,
        intent: 'answer_seeking',
        timestamp: new Date(),
        synced: false,
      });
      session.turnCount++;
      
      return {
        response,
        sessionId: session.sessionId,
        isOfflineMode: true,
      };
    }

    if (this.detectAssignment(request.message)) {
      const response = this.handleAssignmentAttempt();
      session.messages.push({
        role: 'assistant',
        content: response,
        intent: 'assignment_detected',
        timestamp: new Date(),
        synced: false,
      });
      session.turnCount++;
      
      await this.prisma.auditLog.create({
        data: {
          actorId: request.userId,
          action: 'TUTOR_OFFLINE_ASSIGNMENT_BLOCKED',
          payload: JSON.stringify({ sessionId, message: request.message }),
        },
      });

      return {
        response,
        sessionId: session.sessionId,
        isOfflineMode: true,
      };
    }

    const scaffold = this.generateScaffold(request.message, request.grade, intent);
    session.messages.push({
      role: 'assistant',
      content: scaffold,
      intent,
      timestamp: new Date(),
      synced: false,
    });
    session.turnCount++;

    return {
      response: scaffold,
      sessionId: session.sessionId,
      isOfflineMode: true,
    };
  }

  private async createSession(userId: string, sessionId: string): Promise<OfflineTutorSession> {
    const session: OfflineTutorSession = {
      sessionId,
      userId,
      messages: [],
      turnCount: 0,
      isOffline: true,
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  private classifyIntent(message: string): 'hint_seeking' | 'answer_seeking' | 'frustrated' | 'off_topic' | 'assignment_detected' {
    const lower = message.toLowerCase();
    if (lower.includes('what is the answer') || lower.includes('just tell me') || 
        lower.includes('give me the answer') || lower.includes('solve this') ||
        lower.includes('what\'s the solution')) {
      return 'answer_seeking';
    }
    if (lower.includes('how do i') || lower.includes('help me understand') || lower.includes('hint')) {
      return 'hint_seeking';
    }
    if (lower.includes('this is hard') || lower.includes('i don\'t get it') || lower.includes('frustrated')) {
      return 'frustrated';
    }
    if (lower.includes('homework') || lower.includes('test') || lower.includes('quiz') || 
        lower.includes('exam') || lower.includes('assignment') || lower.includes('graded')) {
      return 'assignment_detected';
    }
    return 'hint_seeking';
  }

  private detectAssignment(message: string): boolean {
    const gradedKeywords = ['homework', 'test', 'quiz', 'exam', 'assignment', 'graded', 'due date', 'submit'];
    const lower = message.toLowerCase();
    return gradedKeywords.some(kw => lower.includes(kw));
  }

  private generateRefusal(): string {
    const refusals = [
      "I can see you want the answer, but let's think about this together. What approach have you tried so far?",
      "I'm here to help you learn, not to give you answers. What do you already know about this topic?",
      "Instead of giving you the answer, let me ask: what part of this problem is most confusing to you?",
    ];
    return refusals[Math.floor(Math.random() * refusals.length)];
  }

  private handleAssignmentAttempt(): string {
    return "I notice this might be related to a graded assignment. I'm designed to help you learn and understand concepts, but I shouldn't help with work that will be graded. Let's discuss the underlying topic instead - what are you curious about?";
  }

  private generateScaffold(message: string, grade: number, intent: string): string {
    if (intent === 'frustrated') {
      const supportive = [
        "It's okay to feel stuck! Let's break this down into smaller pieces. What if we start with just one small part?",
        "Everyone gets frustrated sometimes. Take a deep breath - what's one thing you understand about this?",
        "Challenge is how we grow! Let me help you find a different approach. What concept feels most unclear?",
      ];
      return supportive[Math.floor(Math.random() * supportive.length)];
    }

    const gradeAppropriate = this.getGradeAppropriateScaffolds(grade);
    return gradeAppropriate[Math.floor(Math.random() * gradeAppropriate.length)];
  }

  private getGradeAppropriateScaffolds(grade: number): string[] {
    if (grade <= 3) {
      return [
        "That's a cool question! Let me ask you something - what does this remind you of?",
        "Imagine you had to explain this to a friend. What would you say?",
        "What if we drew a picture of this? What would it look like?",
        "Let's play a game - can you think of something similar that's not about school?",
      ];
    } else if (grade <= 6) {
      return [
        "Great question! What do you already know that might help with this?",
        "Have you tried breaking this into smaller parts? What would be the first step?",
        "What if you looked at this from a different angle?",
        "Let me help you think through this: what information do you have, and what are you trying to figure out?",
      ];
    } else if (grade <= 9) {
      return [
        "Interesting! What's your current understanding of this?",
        "What approach have you tried? Where did you get stuck?",
        "Let me ask a clarifying question - what's the core concept you're working with?",
        "What if you considered the edge cases or exceptions to this?",
      ];
    } else {
      return [
        "What frameworks or models have you encountered that might apply here?",
        "Where exactly are you getting stuck - the concepts, the application, or something else?",
        "What would you need to understand first before tackling this?",
        "Let's think about this systematically - what are the key variables?",
      ];
    }
  }

  async syncSession(sessionId: string): Promise<{ synced: boolean; pending: number }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { synced: false, pending: 0 };
    }

    const unsyncedMessages = session.messages.filter(m => !m.synced);
    
    if (unsyncedMessages.length === 0) {
      return { synced: true, pending: 0 };
    }

    for (const message of unsyncedMessages) {
      try {
        await this.prisma.auditLog.create({
          data: {
          actorId: session.userId,
          action: 'TUTOR_OFFLINE_MESSAGE',
          payload: JSON.stringify({
              sessionId,
              role: message.role,
              content: message.content,
              intent: message.intent,
              timestamp: message.timestamp,
            }),
          },
        });
        message.synced = true;
      } catch (error) {
        this.logger.error(`Failed to sync message: ${error.message}`);
      }
    }

    session.syncedAt = new Date();
    const stillPending = session.messages.filter(m => !m.synced).length;

    return { synced: stillPending === 0, pending: stillPending };
  }

  async getOfflineSessions(userId: string): Promise<OfflineTutorSession[]> {
    const sessions: OfflineTutorSession[] = [];
    for (const [_, session] of this.sessions) {
      if (session.userId === userId) {
        sessions.push(session);
      }
    }
    return sessions;
  }

  async checkOfflineModeEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === 'PARENT';
  }
}

import * as crypto from 'crypto';
