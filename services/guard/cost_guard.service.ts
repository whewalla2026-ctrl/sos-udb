import { Injectable } from '@nestjs/common';

type Budget = {
  perUserMonthly: number;
  perTenant: number;
  spentPerUser: Map<string, number>;
  spentPerTenant: Map<string, number>;
  cache: Map<string, { response: string; timestamp: number }>;
};

@Injectable()
export class CostGuardService {
  private budgets: Budget = {
    perUserMonthly: parseFloat(process.env.AI_BUDGET_PER_USER_MONTHLY || '0.50'),
    perTenant: parseFloat(process.env.AI_BUDGET_PER_TENANT || '50.0'),
    spentPerUser: new Map<string, number>(),
    spentPerTenant: new Map<string, number>(),
    cache: new Map<string, { response: string; timestamp: number }>(),
  };

  private lastResetDate: string = new Date().toISOString().slice(0, 7); // YYYY-MM

  canSpend(userId: string, amount: number): boolean {
    this.maybeResetMonthly();
    const perUserUsed = this.budgets.spentPerUser.get(userId) ?? 0;
    const newTotal = perUserUsed + amount;
    return newTotal <= this.budgets.perUserMonthly;
  }

  spend(userId: string, amount: number): boolean {
    if (!this.canSpend(userId, amount)) return false;
    this.maybeResetMonthly();
    const prev = this.budgets.spentPerUser.get(userId) ?? 0;
    this.budgets.spentPerUser.set(userId, prev + amount);
    return true;
  }

  getRemainingBudget(userId: string): number {
    this.maybeResetMonthly();
    const used = this.budgets.spentPerUser.get(userId) ?? 0;
    return Math.max(0, this.budgets.perUserMonthly - used);
  }

  getBudgetUsagePercent(userId: string): number {
    this.maybeResetMonthly();
    const used = this.budgets.spentPerUser.get(userId) ?? 0;
    return this.budgets.perUserMonthly > 0
      ? Math.round((used / this.budgets.perUserMonthly) * 100)
      : 0;
  }

  getBudgetWarning(userId: string): string | null {
    const pct = this.getBudgetUsagePercent(userId);
    if (pct >= 100) return 'Budget exhausted for this month. Fallback hints active.';
    if (pct >= 80) return `Warning: ${100 - pct}% of AI budget remaining this month.`;
    return null;
  }

  getCacheKey(userId: string, prompt: string): string {
    return `${userId}:${prompt.toLowerCase().trim()}`;
  }

  getCached(key: string): string | null {
    const cached = this.budgets.cache.get(key);
    if (!cached) return null;
    const ttl = parseInt(process.env.AI_CACHE_TTL_SECONDS || '3600', 10);
    if (Date.now() - cached.timestamp > ttl * 1000) {
      this.budgets.cache.delete(key);
      return null;
    }
    return cached.response;
  }

  setCache(key: string, response: string): void {
    this.budgets.cache.set(key, { response, timestamp: Date.now() });
  }

  private maybeResetMonthly(): void {
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (currentMonth !== this.lastResetDate) {
      this.budgets.spentPerUser.clear();
      this.budgets.spentPerTenant.clear();
      this.budgets.cache.clear();
      this.lastResetDate = currentMonth;
    }
  }
}
