import { Module } from '@nestjs/common';
import { VisionService } from './vision.service';
import { BullModule } from '@nestjs/bullmq';
import { QUEUES } from '../queue/queue.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.VISION }),
    SharedModule,
  ],
  providers: [VisionService],
  exports: [VisionService],
})
export class VisionModule {}
