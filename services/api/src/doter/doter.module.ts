import { Module } from '@nestjs/common';
import { DoterService } from './doter.service';
import { DoterResolver } from './doter.resolver';
import { UUPSyncModule } from '../uup-sync/uup-sync.module';

@Module({ imports: [UUPSyncModule], providers: [DoterService, DoterResolver], exports: [DoterService] })
export class DoterModule {}
