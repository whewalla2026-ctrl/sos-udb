import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service';
import { EvidenceResolver } from './evidence.resolver';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [EvidenceService, EvidenceResolver],
  exports: [EvidenceService]
})
export class EvidenceModule {}
