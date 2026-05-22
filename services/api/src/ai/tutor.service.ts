import { Injectable, Logger } from '@nestjs/common';
import { PineconeService } from '../ai/pinecone.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface TutorSession {
  sessionId: string;
  userId: string;
  messages: TutorMessage[];
  state: 'IDLE' | 'INTENT_ANALYSIS' | 'CONTEXT_RETRIEVAL' | 'SCAFFOLD_GENERATION' | 'RESPONSE_EVALUATION';
  frustrationScore: number;
  turnCount: number;
}

export interface TutorMessage {
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  timestamp: Date;
}

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);
  private sessions = new Map<string, TutorSession>();

  constructor(
    private pinecone: PineconeService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createSession(userId: string): Promise<TutorSession> {
    const session: TutorSession = {
      sessionId: crypto.randomUUID(),
      userId,
      messages: [],
      state: 'IDLE',
      frustrationScore: 0,
      turnCount: 0,
    };
    this.sessions.set(session.sessionId, session);
    return session;
  }

  async processMessage(sessionId: string, userMessage: string): Promise<TutorMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.messages.push({ role: 'user', content: userMessage, timestamp: new Date() });

    const intent = this.classifyIntent(userMessage);
    session.state = 'SCAFFOLD_GENERATION';

    if (intent === 'answer_seeking') {
      const response = this.generateRefusal();
      session.messages.push({ role: 'assistant', content: response, intent: 'answer_seeking', timestamp: new Date() });
      return session.messages[session.messages.length - 1];
    }

    let context: any[] = [];
    if (this.pinecone.isInitialized()) {
      try {
        context = await this.pinecone.semanticSearch(session.userId, userMessage, 5);
      } catch (e) {
        this.logger.warn('Pinecone search failed, using fallback context');
      }
    }

    const scaffold = await this.generateScaffold(userMessage, context, intent);
    session.messages.push({ role: 'assistant', content: scaffold.message, intent: scaffold.intent, timestamp: new Date() });

    session.turnCount++;
    if (session.turnCount >= 3) {
      this.eventEmitter.emit('tutor:escalation', { sessionId, userId: session.userId });
    }

    return session.messages[session.messages.length - 1];
  }

  private classifyIntent(message: string): 'hint_seeking' | 'answer_seeking' | 'frustrated' | 'off_topic' | 'clarification' {
    const lower = message.toLowerCase();
    if (lower.includes('what is the answer') || lower.includes('just tell me') || lower.includes('give me the answer')) {
      return 'answer_seeking';
    }
    if (lower.includes('how do i') || lower.includes('help me understand') || lower.includes('hint')) {
      return 'hint_seeking';
    }
    if (lower.includes('this is hard') || lower.includes('i don\'t get it') || lower.includes('frustrated')) {
      return 'frustrated';
    }
    return 'hint_seeking';
  }

  private generateRefusal(): string {
    return "I can see you want the answer, but let's think about this together. What approach have you tried so far?";
  }

  private async generateScaffold(message: string, context: any[], intent: string): Promise<{ message: string; intent: string }> {
    const scaffolds = [
      "That's a great question! Let me ask you something - what do you already know about this?",
      "Interesting! Have you considered breaking this down into smaller parts?",
      "What if you approached this from a different angle?",
      "Let me guide you: what's the first step you would take?",
    ];
    return {
      message: scaffolds[Math.floor(Math.random() * scaffolds.length)],
      intent: intent,
    };
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) {
      this.eventEmitter.emit('tutor:session:ended', { sessionId, userId: session.userId, turnCount: session.turnCount });
      this.sessions.delete(sessionId);
    }
  }
}

import * as crypto from 'crypto';
