import { Injectable } from '@nestjs/common';

@Injectable()
export class GovernanceService {
  simulate(userId: string) {
    return { userId, status: 'overlay_applied', timestamp: new Date().toISOString() };
  }
}
