import { Controller, Get, Query } from '@nestjs/common';
import { PlanningService } from './planning.service';

@Controller('planning')
export class PlanningController {
  constructor(private readonly planningService: PlanningService) {}

  @Get('weekly')
  weekly(@Query('userId') userId: string) {
    // For now, generate a sample plan; in a real app we would read user skill gaps
    const gaps = ['Math practice', 'Reading', 'Coding mini-project', 'Art exercise', 'Science experiment'];
    return this.planningService.generateWeeklyPlan(gaps);
  }

  @Get('weekly-with-qs')
  weeklyWithQuests(@Query('userId') userId: string) {
    const gaps = ['Math practice', 'Reading', 'Coding mini-project', 'Art exercise', 'Science experiment'];
    return this.planningService.generateWeeklyPlanWithMicroQuests(gaps);
  }
}
