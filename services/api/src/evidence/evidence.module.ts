import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceResolver } from './evidence.resolver';
import { AiModule } from '../ai/ai.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [AiModule, PrismaModule],
  providers: [EvidenceService, EvidenceResolver],
  exports: [EvidenceService]
})
export class EvidenceModule {}
