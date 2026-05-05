import { Injectable } from '@nestjs/common';

@Injectable()
export class AiMentorService {
  scaffoldPrompt(context: string, input: string) {
    return `Socratic scaffolding placeholder for context: ${context}, input: ${input}`;
  }
}
