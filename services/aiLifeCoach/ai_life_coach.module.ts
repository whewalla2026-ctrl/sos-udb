import { Module } from '@nestjs/common';
import { AiLifeCoachService } from './ai_life_coach.service';
import { AiLifeCoachController } from './ai_life_coach.controller';

@Module({ providers: [AiLifeCoachService], controllers: [AiLifeCoachController], exports: [AiLifeCoachService] })
export class AiLifeCoachModule {}
