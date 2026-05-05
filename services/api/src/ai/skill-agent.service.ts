import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class SkillAgentService {
  private readonly logger = new Logger(SkillAgentService.name);

  constructor(
    private prisma: PrismaService,
    private ai: AiService,
    private blockchain: BlockchainService,
  ) {}

  async deployAgent(userId: string, skillName: string) {
    const learningPathStr = await this.ai.triggerSkillAgent(userId, skillName);
    
    // Attempt to parse AI response into structured JSON learning path
    let learningPath: any[] = [];
    try {
      learningPath = JSON.parse(learningPathStr.replace(/```json\n?|\n?```/g, ''));
    } catch {
      learningPath = [{ step: 1, action: "Research fundamentals of " + skillName, status: "PENDING" }];
    }

    const agent = await this.prisma.skillAgent.create({
      data: {
        userId,
        skillName,
        status: 'WORKING',
        learningPath,
        lastAction: 'Agent deployed. Initializing learning path...',
      },
    });

    this.logger.log(`🤖 Skill Agent deployed: ${skillName} for user ${userId}`);
    return agent;
  }

  async getMyAgents(userId: string) {
    return this.prisma.skillAgent.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateAgentAutonomy(agentId: string, level: number) {
    return this.prisma.skillAgent.update({
      where: { id: agentId },
      data: { autonomyLevel: level },
    });
  }

  async completeSkillMastery(agentId: string) {
    const agent = await this.prisma.skillAgent.findUnique({ where: { id: agentId } });
    if (!agent) throw new Error('Agent not found');

    await this.prisma.skillAgent.update({
      where: { id: agentId },
      data: { status: 'COMPLETED', lastAction: 'Skill mastered! Minting credential...' },
    });

    // Create Achievement record
    const achievement = await this.prisma.achievement.create({
      data: {
        userId: agent.userId,
        title: `${agent.skillName} Mastery`,
        description: `Verified completion of the ${agent.skillName} autonomous learning path.`,
        pillar: 'SKILLS',
        badgeUrl: `https://storage.udb.dev/badges/skill-${agent.skillName.toLowerCase()}.png`,
        points: 500,
      },
    });

    // Mint SBT
    const mintResult = await this.blockchain.mintSBT(agent.userId, achievement.id, `https://udb.dev/credentials/${achievement.id}`);
    
    this.logger.log(`🏆 Skill mastery completed and minted: ${agent.skillName}`);
    return { achievement, mintResult };
  }
}
