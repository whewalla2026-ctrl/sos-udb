import { Injectable } from '@nestjs/common';

@Injectable()
export class AiMentorService {
  scaffoldPrompt(context: string, input: string) {
    return `Socratic scaffolding placeholder for context: ${context}, input: ${input}`;
  }

  private paths: Array<{ userId: string; question: string; pathToSolution: string[]; timestamp: string }> = [];
  logPath(userId: string, question: string, pathToSolution: string[]) {
    const rec = { userId, question, pathToSolution, timestamp: new Date().toISOString() };
    this.paths.push(rec);
    return rec;
  }
}
