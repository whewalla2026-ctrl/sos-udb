import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { VisionModule } from '../vision/vision.module';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [VisionModule, EventEmitterModule.forRoot()],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
