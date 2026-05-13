import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { MetricsService } from '../shared/metrics.controller';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class TutorService {
  private readonly logger = new Logger(TutorService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private metrics: MetricsService,
  ) {}

  async createSession(userId: string, subject: string, assignmentId?: string) {
    const session = await this.prisma.tutoringSession.create({
      data: { userId, subject, assignmentId: assignmentId || null },
    });
    this.metrics.tutoringSessions.inc({ subject });
    await this.redis.setex(`tutor:session:${session.id}`, 3600, JSON.stringify({ subject, history: [] }));
    return session;
  }

  async getSession(sessionId: string) {
    const session = await this.prisma.tutoringSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    return session;
  }

  async getUserSessions(userId: string, limit = 10) {
    return this.prisma.tutoringSession.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
  }

  async ask(userId: string, sessionId: string, input: string) {
    const session = await this.getSession(sessionId);
    const history = (session.sessionLog as Array<{ role: string; content: string }>) || [];

    const result = await this.ai.runSocraticSession(userId, sessionId, input, session.subject, history as any);
    await this.prisma.tutorInteraction.create({
      data: { sessionId, userId, role: 'user', content: input, intent: result.intent, confidence: null },
    });
    await this.prisma.tutorInteraction.create({
      data: { sessionId, userId, role: 'tutor', content: result.response, intent: result.intent, confidence: result.intent === 'EXPLORING' ? 0.9 : 0.7 },
    });

    const updatedLog = [...history, { role: 'user', content: input }, { role: 'tutor', content: result.response }];
    await this.prisma.tutoringSession.update({ where: { id: sessionId }, data: { sessionLog: updatedLog as any } });
    await this.redis.del(`tutor:session:${sessionId}`);

    const evalResult = await this.evaluateTutorResponse(result.response, input, session.subject);
    await this.prisma.tutorEvaluation.create({
      data: { sessionId, userId, qualityScore: evalResult.qualityScore, hallucinationRisk: evalResult.hallucinationRisk, safetyCheck: evalResult.safetyCheck, responseRelevance: evalResult.relevance },
    });

    await this.updateAnalytics(userId);

    return { ...result, evaluation: evalResult };
  }

  async evaluateTutorResponse(response: string, input: string, subject: string): Promise<{ qualityScore: number; hallucinationRisk: number; safetyCheck: boolean; relevance: number }> {
    const lower = response.toLowerCase();
    const inputWords = input.toLowerCase().split(' ').filter(w => w.length > 3);
    const responseWords = response.toLowerCase().split(' ');
    const relevance = inputWords.length > 0 ? inputWords.filter(w => responseWords.includes(w)).length / inputWords.length : 0.5;
    const hallucinationRisk = lower.includes('i don\'t know') || lower.includes('uncertain') ? 0.4 : 0.1;
    const qualityScore = Math.min(1, 0.5 + relevance * 0.3 + (hallucinationRisk < 0.2 ? 0.2 : 0));
    const safetyCheck = !lower.includes('harm') && !lower.includes('danger') && !lower.includes('suicide') && !lower.includes('self-harm');
    return { qualityScore, hallucinationRisk, safetyCheck: !!safetyCheck, relevance };
  }

  async updateAnalytics(userId: string) {
    const [interactions, sessions] = await Promise.all([
      this.prisma.tutorInteraction.findMany({ where: { userId } }),
      this.prisma.tutoringSession.findMany({ where: { userId } }),
    ]);
    const totalInteractions = interactions.length;
    const totalSessions = sessions.length;
    const avgConfidence = interactions.filter(i => i.confidence).reduce((s, i) => s + (i.confidence || 0), 0) / (interactions.filter(i => i.confidence).length || 1);
    const struggleCount = interactions.filter(i => i.intent === 'CONFUSED').length;
    const hintRequests = interactions.filter(i => i.intent === 'HINT_REQUEST').length;
    const totalTimeSpent = sessions.reduce((s, s2) => s + s2.duration, 0);
    const topicMastery = await this.prisma.topicMastery.findMany({ where: { userId } });
    const learningVelocity = topicMastery.length > 7 ? topicMastery.length / 4 : 0;
    const retentionScore = Math.min(100, (topicMastery.filter(t => t.masteryLevel >= 0.7).length / Math.max(topicMastery.length, 1)) * 100);
    const avgComprehension = topicMastery.reduce((s, t) => s + t.masteryLevel, 0) / Math.max(topicMastery.length, 1);

    await this.prisma.tutorAnalytics.create({
      data: {
        userId, totalSessions, totalInteractions, avgConfidence, avgComprehension,
        struggleCount, hintRequests, learningVelocity, retentionScore, totalTimeSpent,
        completedSessions: sessions.filter(s => s.endedAt).length, lastActiveAt: new Date(), snapshotDate: new Date(),
      },
    });
  }

  async setMemory(userId: string, type: string, key: string, value: any, weight = 1.0, expiresInSec?: number) {
    const expiresAt = expiresInSec ? new Date(Date.now() + expiresInSec * 1000) : null;
    await this.prisma.tutorMemory.upsert({
      where: { id: `${userId}_${type}_${key}` } as any,
      create: { userId, type, key, value, weight, expiresAt },
      update: { value, weight, expiresAt },
    });
  }

  async getMemory(userId: string, type: string, key: string) {
    const mem = await this.prisma.tutorMemory.findFirst({ where: { userId, type, key } });
    return mem?.value;
  }

  async trackTopicMastery(userId: string, subject: string, topic: string, correct: boolean) {
    const existing = await this.prisma.topicMastery.findUnique({ where: { userId_subject_topic: { userId, subject, topic } } });
    const attempts = (existing?.attempts || 0) + 1;
    const correctCount = (existing?.attempts || 0) * (existing?.correctPct || 0) + (correct ? 1 : 0);
    const correctPct = correctCount / attempts;
    const masteryLevel = Math.min(1, correctPct * 0.7 + (existing?.masteryLevel || 0) * 0.3);

    await this.prisma.topicMastery.upsert({
      where: { userId_subject_topic: { userId, subject, topic } },
      create: { userId, subject, topic, masteryLevel, confidence: correctPct, attempts, correctPct, lastPracticed: new Date() },
      update: { masteryLevel, confidence: correctPct, attempts, correctPct, lastPracticed: new Date() },
    });
  }

  async getAnalytics(userId: string) {
    return this.prisma.tutorAnalytics.findFirst({ where: { userId }, orderBy: { snapshotDate: 'desc' } });
  }

  async getTopics(userId: string, subject?: string) {
    const where: any = { userId };
    if (subject) where.subject = subject;
    return this.prisma.topicMastery.findMany({ where, orderBy: { updatedAt: 'desc' } });
  }

  async getRecommendations(userId: string) {
    const topics = await this.prisma.topicMastery.findMany({ where: { userId, masteryLevel: { lt: 0.7 } }, orderBy: { masteryLevel: 'asc' }, take: 5 });
    return topics.map(t => ({ subject: t.subject, topic: t.topic, masteryLevel: t.masteryLevel, priority: t.masteryLevel < 0.3 ? 'high' : 'medium' }));
  }

  async endSession(sessionId: string) {
    const session = await this.prisma.tutoringSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new Error('Session not found');
    const duration = Math.floor((Date.now() - session.createdAt.getTime()) / 1000);
    await this.prisma.tutoringSession.update({ where: { id: sessionId }, data: { endedAt: new Date(), duration } });
    await this.updateAnalytics(session.userId);
    return { ended: true, duration };
  }
}
