import { Injectable } from '@nestjs/common';

@Injectable()
export class ModerationService {
  analyze(text: string) {
    // Simple toxicity check placeholder
    const toxicKeywords = ['badword', 'hate', 'bully'];
    const found = toxicKeywords.filter((k) => text.toLowerCase().includes(k));
    return {
      text,
      toxic: found.length > 0,
      reasons: found,
    };
  }
}
