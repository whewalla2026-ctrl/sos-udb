import { Injectable } from '@nestjs/common';

@Injectable()
export class LmsService {
  getContextForStudent(userId: string) {
    // Placeholder LMS context for phase-2 scaffolding
    return {
      assignments: [],
      context: 'Sandbox LMS context'
    };
  }
}
