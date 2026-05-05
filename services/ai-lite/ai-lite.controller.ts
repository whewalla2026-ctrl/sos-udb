import { Controller, Post, Body } from '@nestjs/common';
import { AiLiteService } from './ai-lite.service';

@Controller('ai-lite')
export class AiLiteController {
  constructor(private readonly ai: AiLiteService) {}
  @Post('hint')
  hint(@Body() body: { userId: string; prompt: string; context?: string }) {
    return this.ai.hint(body.userId, body.prompt, body.context);
  }
}
