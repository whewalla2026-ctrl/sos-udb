import { Injectable } from '@nestjs/common';

@Injectable()
export class PlanningService {
  // Very naive weekly planner generator based on skill gaps and optional calendar
  generateWeeklyPlan(skillGaps: string[] = [], days: string[] = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) {
    const plan = days.map((d, idx) => {
      const gap = skillGaps[idx % Math.max(1, skillGaps.length)];
      return { day: d, task: gap ?? 'General Study' };
    });
    return plan;
  }

  generateWeeklyPlanWithMicroQuests(skillGaps: string[] = [], days: string[] = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']) {
    const plan = days.map((d, idx) => {
      const gap = skillGaps[idx % Math.max(1, skillGaps.length)];
      const mq = (idx % 3 === 0) ? `MQ-${Math.floor(idx/3) + 1}` : null;
      return { day: d, task: gap ?? 'General Study', microQuest: mq };
    });
    return plan;
  }
}
