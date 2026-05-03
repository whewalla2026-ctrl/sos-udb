import { Module } from '@nestjs/common';
import { DoterService } from './doter.service';
import { DoterResolver } from './doter.resolver';
import { UupSyncModule } from '../uup-sync/uup-sync.module';

@Module({ imports: [UupSyncModule], providers: [DoterService, DoterResolver], exports: [DoterService] })
export class DoterModule {}
