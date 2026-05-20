import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiResolver } from './ai.resolver';
import { OfflineTutorModule } from './offline-tutor.module';

@Module({
  imports: [OfflineTutorModule],
  providers: [AiService, AiResolver],
  exports: [AiService, OfflineTutorModule],
})
export class AiModule {}
