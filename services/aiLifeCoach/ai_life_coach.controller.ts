import { Controller, Post, Body } from '@nestjs/common';
import { AiLifeCoachService } from './ai_life_coach.service';

@Controller('ai-life-coach')
export class AiLifeCoachController {
  constructor(private readonly coach: AiLifeCoachService) {}
  @Post('advise')
  advise(@Body() body: { userId: string; context?: string }) {
    return this.coach.advise(body.userId, body.context);
  }
}
