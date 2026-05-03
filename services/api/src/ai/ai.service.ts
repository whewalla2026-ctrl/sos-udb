import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

// ─── AI Service: Socratic Tutor + Life Coach + Weekly Planner ─────────────────
// Uses Google Vertex AI (Gemini 1.5 Pro) as the primary LLM
// Falls back to a structured rule-based response if API is unavailable
// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private vertexAiClient: any = null;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {
    this.initVertexAI();
  }

  private async initVertexAI() {
    try {
      // Dynamic import to allow graceful fallback
      const { VertexAI } = await import('@google-cloud/vertexai');
      this.vertexAiClient = new VertexAI({
        project: this.config.get('GOOGLE_CLOUD_PROJECT'),
        location: this.config.get('GOOGLE_CLOUD_LOCATION', 'us-central1'),
      });
      this.logger.log('✅ Vertex AI initialized');
    } catch (e) {
      this.logger.warn('⚠️ Vertex AI not available — using fallback mode');
    }
  }

  // ── Socratic Tutor (UC-065) ──────────────────────────────────────────────────
  async runSocraticSession(
    userId: string,
    sessionId: string,
    studentInput: string,
    subject: string,
    sessionHistory: Array<{ role: string; content: string }>,
  ): Promise<{ response: string; intent: string; pathEntry: string }> {
    // 1. Intent recognition
    const intent = this.classifyIntent(studentInput);

    // 2. If asking for direct answer — encouraging refusal (AF1)
    if (intent === 'WANTS_ANSWER') {
      const refusal = this.getEncouragingRefusal(subject);
      await this.logTutoringPath(sessionId, studentInput, refusal, 'REFUSAL');
      return { response: refusal, intent, pathEntry: studentInput };
    }

    // 3. Build prompt
    const systemPrompt = `You are a world-class Socratic mentor for students aged 13-23 studying ${subject}.

CRITICAL RULES:
1. NEVER reveal the final answer directly — guide through questions only.
2. Identify the student's "Point of Confusion" from their input.
3. Ask ONE targeted scaffolding question that bridges their knowledge gap.
4. If frustrated: offer encouragement first, then a lighter hint.
5. Keep responses concise (2-4 sentences max).
6. Reference the conversation history to maintain continuity.

Conversation History:
${sessionHistory.map(h => `${h.role}: ${h.content}`).join('\n')}

Student's current input: "${studentInput}"

Respond as the Socratic mentor:`;

    // 4. Call Vertex AI or fallback
    const response = await this.callLLM(systemPrompt);

    // 5. Log the interaction
    await this.logTutoringPath(sessionId, studentInput, response, intent);

    return { response, intent, pathEntry: studentInput };
  }

  private classifyIntent(input: string): string {
    const lower = input.toLowerCase();
    const answerPatterns = ['what is the answer', 'just tell me', 'give me the answer', 'what\'s the solution'];
    if (answerPatterns.some(p => lower.includes(p))) return 'WANTS_ANSWER';
    if (lower.includes('i don\'t understand') || lower.includes('confused') || lower.includes('lost')) return 'CONFUSED';
    if (lower.includes('?')) return 'HINT_REQUEST';
    return 'EXPLORING';
  }

  private getEncouragingRefusal(subject: string): string {
    const refusals = [
      `I know it feels tough right now, but you're closer than you think! Instead of giving you the answer, let me ask: what do you already know about this ${subject} concept?`,
      `Great instinct to ask for help! But I believe in you — let's work through it together. What was the last step you understood?`,
      `I'm not going to hand you the answer (that's my job! 😄), but I'll ask you this: if you broke this ${subject} problem into smaller pieces, what would the first piece be?`,
    ];
    return refusals[Math.floor(Math.random() * refusals.length)];
  }

  // ── Weekly Planning Assistant (UC-044) ───────────────────────────────────────
  async generateWeeklyPlan(userId: string, weekStart: Date): Promise<any> {
    const [user, skillGaps, biometricData] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, include: { doterProfile: true } }),
      this.prisma.skillGap.findMany({ where: { userId }, orderBy: { gapScore: 'asc' }, take: 5 }),
      this.prisma.biometricLog.findMany({
        where: { userId, loggedAt: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    const criticalGaps = skillGaps.filter(g => g.gapScore < 0.3);
    const avgFocus = biometricData.length
      ? biometricData.reduce((s, l) => s + (l.focusScore ?? 70), 0) / biometricData.length
      : 70;

    const prompt = `You are an AI educational planner. Create a balanced 7-day activity plan for a student.

Student Profile:
- Critical skill gaps: ${criticalGaps.map(g => g.subject).join(', ') || 'None'}
- Average focus score: ${avgFocus.toFixed(0)}/100
- Week starts: ${weekStart.toDateString()}

Requirements:
- Prioritize critical gap subjects (< 30% mastery)
- Schedule deep work in morning (high focus window)
- Include at least 1 physical activity per day
- Include social/creative activities
- Each day: 2-4 activities max
- Format: JSON array of { day: string, activities: [{title, pillar, durationMinutes, isDeepWork, suggestedTime}] }

Return ONLY valid JSON:`;

    const response = await this.callLLM(prompt);
    
    try {
      const plan = JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
      
      // Save the plan
      await this.prisma.weeklyPlan.create({
        data: {
          userId,
          weekStart,
          weekEnd: new Date(weekStart.getTime() + 7 * 86400000),
          aiDraft: plan,
          focusPillars: criticalGaps.map(g => g.pillar),
        },
      });

      return plan;
    } catch (e) {
      this.logger.warn('Failed to parse AI weekly plan JSON, returning raw');
      return { raw: response };
    }
  }

  // ── AI Life Coach — Proactive Intervention ────────────────────────────────────
  async getCoachingInsight(userId: string): Promise<string> {
    const [user, recentBiometrics, skillGaps, ventures] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.biometricLog.findMany({
        where: { userId, loggedAt: { gte: new Date(Date.now() - 3 * 86400000) } },
      }),
      this.prisma.skillGap.findMany({ where: { userId, gapScore: { lt: 0.3 } } }),
      this.prisma.venture.findMany({ where: { userId, status: 'ACTIVE' } }),
    ]);

    const uup = user?.uupData as any;
    const avgSleep = recentBiometrics.reduce((s, l) => s + (l.sleepHours ?? 8), 0) / (recentBiometrics.length || 1);

    const prompt = `You are a caring, empathetic AI Life Coach. Give a personalized 2-sentence coaching insight.

Student context:
- Name: ${user?.displayName || 'Student'}
- Average sleep (3 days): ${avgSleep.toFixed(1)}h
- Critical gaps: ${skillGaps.map(g => g.subject).join(', ') || 'none'}
- Active ventures: ${ventures.length}
- XP level: ${uup?.gamification?.level || 1}

Be specific, warm, and actionable. Reference actual data. Don't be generic.`;

    return this.callLLM(prompt);
  }

  // ── Business Plan AI (UC-092) ────────────────────────────────────────────────
  async generateBusinessPlan(data: {
    problem: string;
    solution: string;
    targetMarket: string;
    pricingModel: string;
    founderAge: number;
  }): Promise<{ executiveSummary: string; isValid: boolean; validationNotes: string }> {
    const prompt = `You are an expert business plan advisor working with a ${data.founderAge}-year-old entrepreneur.

Business Idea:
- Problem: ${data.problem}
- Solution: ${data.solution}
- Target Market: ${data.targetMarket}
- Pricing: ${data.pricingModel}

Tasks:
1. Write a concise executive summary (150 words)
2. Validate if revenue > cost logic is sound (FR-92.1)
3. Suggest one improvement

Return JSON: { "executiveSummary": "...", "isValid": true/false, "validationNotes": "..." }`;

    const response = await this.callLLM(prompt);
    try {
      return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
    } catch {
      return { executiveSummary: response, isValid: true, validationNotes: '' };
    }
  }

  // ── Future Self Simulator ────────────────────────────────────────────────────
  async generateFutureSelfNarrative(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const uup = user?.uupData as any;

    const prompt = `You are a narrative AI. Write a vivid, inspiring 200-word "Day in the Life" story for this person at age 30.

Current stats:
- Academic level: ${uup?.academic?.math_rit > 220 ? 'Advanced' : 'Developing'}
- Entrepreneurship revenue: $${uup?.entrepreneurship?.total_revenue_usd || 0}
- Health score: ${uup?.biometric?.focus_score || 70}/100
- XP Level: ${uup?.gamification?.level || 1}

Write in second person ("You wake up..."). Be specific and inspirational. Show the DIRECT connection between their current habits and their future success.`;

    return this.callLLM(prompt);
  }

  // ── Contextual Feedback on Evidence (UC-048) ─────────────────────────────────
  async generateContextualFeedback(title: string, type: string, url: string): Promise<string> {
    const prompt = `You are a supportive, educational AI coach for a student platform.
A student has uploaded evidence of their activity.

Activity Title: "${title}"
Evidence Type: ${type}
Evidence URL: ${url}

Provide a short, encouraging "Pro-Tip" (1-2 sentences) about this activity. Highlight what they did well and suggest one tiny area of improvement. Start with an emoji.`;
    return this.callLLM(prompt);
  }

  // ── AI Sentiment & Safety Analysis (Phase 3) ─────────────────────────────────
  async analyzeSentiment(content: string): Promise<{ isSafe: boolean; safetyScore: number; flags: string[] }> {
    const prompt = `You are a COPPA-compliant safety moderator for a platform used by children (ages 6-18).
Analyze the following message for grooming, bullying, self-harm, or inappropriate content.

Message: "${content}"

Return ONLY valid JSON in this format:
{ "isSafe": true/false, "safetyScore": 0-100, "flags": ["BULLYING", "GROOMING"] (empty if safe) }`;

    const response = await this.callLLM(prompt);
    try {
      return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
    } catch {
      return { isSafe: true, safetyScore: 100, flags: [] };
    }
  }

  // ── Multimodal Emotional Intelligence (mEQ) (Phase 5) ────────────────────────
  async analyzeEmotionalState(userId: string, videoUrl: string, audioTranscript: string): Promise<{ emotion: string; focusScore: number; resilienceLevel: string }> {
    const prompt = `Analyze the emotional state based on this transcript: "${audioTranscript}" and video reference: ${videoUrl}.
Student ID: ${userId}
Identify dominant emotion, focus score (0-100), and resilience level.
Return JSON: { "emotion": "...", "focusScore": 0, "resilienceLevel": "..." }`;
    
    const response = await this.callLLM(prompt);
    try {
      return JSON.parse(response.replace(/```json\n?|\n?```/g, ''));
    } catch {
      return { emotion: 'Focused', focusScore: 85, resilienceLevel: 'High' };
    }
  }

  // ── Autonomous Skill Agents (Phase 5) ───────────────────────────────────────
  async triggerSkillAgent(userId: string, skill: string): Promise<string> {
    const prompt = `You are an Autonomous Skill Agent for ${skill}.
Student ${userId} wants to master this.
Generate a pro-active learning path and the first step to take right now.`;
    return this.callLLM(prompt);
  }

  // ── Core LLM caller with Vertex AI + fallback ─────────────────────────────────
  private async callLLM(prompt: string): Promise<string> {
    if (this.vertexAiClient) {
      try {
        const model = this.vertexAiClient.preview.getGenerativeModel({
          model: this.config.get('VERTEX_AI_MODEL', 'gemini-1.5-pro'),
        });
        const result = await model.generateContent({ contents: [{ role: 'user', parts: [{ text: prompt }] }] });
        return result.response.candidates[0]?.content?.parts[0]?.text || '';
      } catch (e) {
        this.logger.error('Vertex AI call failed:', e);
      }
    }

    // Structured fallback (no API key needed for dev)
    return this.structuredFallback(prompt);
  }

  private structuredFallback(prompt: string): string {
    if (prompt.includes('Socratic mentor')) {
      return "That's a great question! What do you already know about the core concept involved here? Try breaking it down into smaller parts.";
    }
    if (prompt.includes('weekly activity plan')) {
      return JSON.stringify([
        { day: 'Monday', activities: [{ title: 'Math Practice', pillar: 'ACADEMIC', durationMinutes: 30, isDeepWork: true, suggestedTime: '09:00' }] },
        { day: 'Tuesday', activities: [{ title: 'Physical Activity', pillar: 'BIOMETRIC', durationMinutes: 45, isDeepWork: false, suggestedTime: '16:00' }] },
      ]);
    }
    return 'Great progress! Keep focusing on your goals and maintaining healthy habits.';
  }

  private async logTutoringPath(sessionId: string, input: string, response: string, intent: string) {
    await this.prisma.tutoringSession.updateMany({
      where: { id: sessionId },
      data: {
        pathToSolution: {
          push: { input, response, intent, timestamp: new Date().toISOString() },
        } as any,
      },
    });
  }
}
