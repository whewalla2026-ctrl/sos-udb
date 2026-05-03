import { Module } from '@nestjs/common'; import { WeeklyPlanService } from './weekly-plan.service'; import { WeeklyPlanResolver } from './weekly-plan.resolver'; import { AiModule } from '../ai/ai.module';
@Module({ imports: [AiModule], providers: [WeeklyPlanService, WeeklyPlanResolver], exports: [WeeklyPlanService] })
export class WeeklyPlanModule {}
