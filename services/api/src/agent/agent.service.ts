import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AgentHeartbeat {
  userId: string;
  timestamp: string;
  appUsage: { appName: string; category: string; durationSec: number }[];
  focusScore: number;
  agentVersion: string;
  platform: string;
}

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);

  constructor(private prisma: PrismaService) {}

  async receiveHeartbeat(heartbeat: AgentHeartbeat, userId: string): Promise<void> {
    const focusScore = this.calculateFocusScore(heartbeat.appUsage);

    await this.prisma.$executeRaw`
      INSERT INTO agent_heartbeats (id, user_id, timestamp, app_usage, focus_score, agent_version, platform, created_at)
      VALUES (
        gen_random_uuid(),
        ${userId},
        ${heartbeat.timestamp},
        ${JSON.stringify(heartbeat.appUsage)},
        ${focusScore},
        ${heartbeat.agentVersion},
        ${heartbeat.platform},
        NOW()
      )
    `;

    this.logger.debug(`Heartbeat from ${userId}, focus score: ${focusScore}`);
  }

  private calculateFocusScore(appUsage: { appName: string; category: string; durationSec: number }[]): number {
    const productiveCategories = ['productive', 'educational'];
    const totalTime = appUsage.reduce((sum, app) => sum + app.durationSec, 0);
    
    if (totalTime === 0) return 0.5;

    const productiveTime = appUsage
      .filter(app => productiveCategories.includes(app.category))
      .reduce((sum, app) => sum + app.durationSec, 0);

    return Math.min(1, productiveTime / totalTime);
  }

  async getFocusHistory(userId: string, days: number = 7): Promise<any[]> {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    return this.prisma.$queryRaw`
      SELECT DATE(timestamp) as date, AVG(focus_score) as avg_focus
      FROM agent_heartbeats
      WHERE user_id = ${userId} AND timestamp > ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
  }

  async registerAgent(userId: string, platform: string, version: string): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO registered_agents (id, user_id, platform, version, registered_at)
      VALUES (gen_random_uuid(), ${userId}, ${platform}, ${version}, NOW())
      ON CONFLICT (user_id) DO UPDATE SET platform = ${platform}, version = ${version}
    `;
  }
}