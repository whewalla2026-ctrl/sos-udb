import { Module } from '@nestjs/common';
import { LmsService } from './lms.service';
import { LmsSyncService } from './lms-sync.service';
import { LmsSyncController } from './lms-sync.controller';
@Module({ providers: [LmsService, LmsSyncService], controllers: [LmsSyncController], exports: [LmsService, LmsSyncService] })
export class LmsModule {}
