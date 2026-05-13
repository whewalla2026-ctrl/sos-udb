import { Module, Logger } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { TutorResolver } from './tutor.resolver';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [TutorService, TutorResolver, Logger],
  exports: [TutorService],
})
export class TutorModule {}
