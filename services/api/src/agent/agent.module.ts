import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { FeatureFlagsModule } from '../feature-flags/feature-flags.module';

@Module({
  imports: [PrismaModule, FeatureFlagsModule],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
