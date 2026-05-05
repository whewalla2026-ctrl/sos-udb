import { Controller, Post, Body } from '@nestjs/common';
import { AiMentorService } from './aiMentor.service';

@Controller('ai-mentor')
export class AiMentorController {
  constructor(private readonly mentor: AiMentorService) {}

  @Post('tutor')
  tutor(@Body() body: { userId: string; question: string; context?: string }) {
    const { userId, question, context } = body;
    // Simple scaffolding: craft a Socratic prompt and provide a hint path
    const prompt = context ?? 'LMS context';
    const hint = this.mentor.scaffoldPrompt(prompt, question);
    // naive path to solution and confidence
    const pathToSolution = [`Consider the underlying principles: ${question}`];
    const confidence = Math.min(0.99, 0.5 + Math.random() * 0.5);
    return { userId, question, hint, pathToSolution, confidence };
  }
}
