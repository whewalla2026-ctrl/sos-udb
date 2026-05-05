import { Injectable } from '@nestjs/common';

@Injectable()
export class AiLifeCoachService {
  advise(userId: string, context?: string) {
    const advice = context || 'Today focus: balance and micro-quests.';
    return {
      userId,
      advice: `Coach says: ${advice}`,
      timestamp: new Date().toISOString(),
    };
  }
}
