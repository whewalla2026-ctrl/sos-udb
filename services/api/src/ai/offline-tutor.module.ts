import { Module } from '@nestjs/common';
import { OfflineTutorService } from './offline-tutor.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [OfflineTutorService],
  exports: [OfflineTutorService],
})
export class OfflineTutorModule {}
