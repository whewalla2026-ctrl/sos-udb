import { Injectable } from '@nestjs/common';

@Injectable()
export class NFTService {
  private tokens: Record<string, string> = {};
  mint(userId: string, label: string) {
    const token = `SBT-${userId}-${Date.now()}`;
    this.tokens[userId] = token;
    return { userId, token, label };
  }
}
