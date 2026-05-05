import { Injectable } from '@nestjs/common';
@Injectable()
export class BiometricsService {
  getFocusScore(userId: string) {
    return { userId, focus: 0.75 };
  }
}
