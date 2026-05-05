import { Injectable } from '@nestjs/common';
// lightweight fault-injection for production readiness

@Injectable()
export class AiLiteService {
  private faultDelayMs: number = parseInt(process.env.AI_FAULT_DELAY_MS || '0');
  private faultRate: number = parseFloat(process.env.AI_FAULT_RATE || '0');
  async hint(userId: string, prompt: string, context?: string) {
    // Simulated 500ms max latency with a single-step hint
    const t0 = Date.now();
    // immediate hard-coded hint for deterministic behavior
    const hints = [`Hint: consider simplifying ${prompt}`];
    const latency = Date.now() - t0 + this.faultDelayMs;
    if (latency > 500 || (this.faultRate > 0 && Math.random() < this.faultRate)) {
      return { userId, hints, confidence: 0.0, timedOut: true };
    }
    return { userId, hints, confidence: Math.min(0.95, 0.5 + Math.random() * 0.4) };
  }
}
