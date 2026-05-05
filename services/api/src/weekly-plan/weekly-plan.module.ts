import { Module } from '@nestjs/common'; import { WeeklyPlanService } from './weekly-plan.service'; import { WeeklyPlanResolver } from './weekly-plan.resolver'; import { AiModule } from '../ai/ai.module'; import { PrismaModule } from '../prisma/prisma.module';
@Module({ imports: [AiModule, PrismaModule], providers: [WeeklyPlanService, WeeklyPlanResolver], exports: [WeeklyPlanService] })
export class WeeklyPlanModule {}
