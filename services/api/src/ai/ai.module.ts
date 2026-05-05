import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { MonteCarloService } from './monte-carlo.service';
import { SkillAgentService } from './skill-agent.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  providers: [AiService, AiResolver, MonteCarloService, SkillAgentService],
  exports: [AiService, MonteCarloService, SkillAgentService],
})
export class AiModule {}
