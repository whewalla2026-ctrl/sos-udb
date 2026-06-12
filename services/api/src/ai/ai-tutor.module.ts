import { Module } from '@nestjs/common';
import { TutorService } from './tutor.service';
import { PineconeService } from '../ai/pinecone.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [TutorService, PineconeService],
  exports: [TutorService],
})
export class AITutorModule {}