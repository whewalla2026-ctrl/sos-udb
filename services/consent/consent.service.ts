import { Injectable } from '@nestjs/common';

type ConsentState = 'PENDING' | 'GRANTED' | 'REJECTED';

@Injectable()
export class ConsentService {
  private state: Record<string, ConsentState> = {};
  grant(userId: string) {
    this.state[userId] = 'GRANTED';
    return { userId, status: 'GRANTED' };
  }
  revoke(userId: string) {
    this.state[userId] = 'REJECTED';
    return { userId, status: 'REJECTED' };
  }
  isGranted(userId: string): boolean {
    return this.state[userId] === 'GRANTED';
  }
  getState(userId: string): ConsentState {
    return this.state[userId] ?? 'PENDING';
  }
}
