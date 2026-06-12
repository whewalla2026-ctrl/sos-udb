import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { OfflineTutorModule } from './offline-tutor.module';
import { PineconeService } from './pinecone.service';

@Module({
  imports: [OfflineTutorModule],
  providers: [AiService, AiResolver, PineconeService],
  exports: [AiService, OfflineTutorModule, PineconeService],
})
export class AiModule {}
