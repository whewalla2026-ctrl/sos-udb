import { Controller, Post, Body } from '@nestjs/common';
import { ModerationService } from './moderation.service';

@Controller('moderation')
export class ModerationController {
  constructor(private readonly mod: ModerationService) {}
  @Post('analyze')
  analyze(@Body() body: { text: string }) {
    return this.mod.analyze(body.text);
  }
}
