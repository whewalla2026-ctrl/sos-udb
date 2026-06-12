import { Module } from '@nestjs/common';
import { DataExportService } from './data-export.service';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [PrismaModule, QueueModule, SharedModule],
  providers: [DataExportService],
  exports: [DataExportService],
})
export class ExportModule {}
