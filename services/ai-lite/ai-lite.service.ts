import { Injectable } from '@nestjs/common';
import { CostGuardService } from '../guard/cost_guard.service';

const HINT_TEMPLATES = [
  (p: string) => `Break "${p}" into 3 small steps. Start with the first one.`,
  (p: string) => `What's one thing you can do right now for "${p}"?`,
  (p: string) => `Set a 5-minute timer and just begin "${p}". You can stop after 5 min.`,
  (p: string) => `Ask yourself: what's the easiest part of "${p}"? Do that first.`,
];

@Injectable()
export class AiLiteService {
  constructor(private readonly costGuard: CostGuardService) {}

  async hint(userId: string, prompt: string, context?: string) {
    const t0 = Date.now();
    const estimatedCost = parseFloat(process.env.AI_COST_PER_HINT || '0.0004');
    const cacheKey = this.costGuard.getCacheKey(userId, prompt);

    // 1. Check cache first (zero cost)
    const cached = this.costGuard.getCached(cacheKey);
    if (cached) {
      return { userId, hints: [cached], confidence: 0.85, fallback: false, cached: true };
    }

    // 2. Check budget before spending
    if (!this.costGuard.canSpend(userId, estimatedCost)) {
      const fb = `You've used your AI hints for this month. Keep going manually!`;
      return { userId, hints: [fb], confidence: 0.0, fallback: true, budgetExhausted: true };
    }

    const budgetWarning = this.costGuard.getBudgetWarning(userId);

    // 3. Generate hint (capped at 500ms with template fallback)
    const templateIdx = Math.floor(Math.random() * HINT_TEMPLATES.length);
    const hintText = HINT_TEMPLATES[templateIdx](prompt);
    const latency = Date.now() - t0;

    if (latency > 500) {
      const fb = `Simplify and focus on the next action.`;
      return { userId, hints: [fb], confidence: 0.0, fallback: true, timedOut: true };
    }

    // 4. Spend cost and cache
    this.costGuard.spend(userId, estimatedCost);
    this.costGuard.setCache(cacheKey, hintText);

    return {
      userId,
      hints: [hintText],
      confidence: Math.min(0.9, 0.5 + Math.random() * 0.35),
      fallback: false,
      remainingBudget: this.costGuard.getRemainingBudget(userId),
      budgetWarning: budgetWarning || undefined,
    };
  }
}
