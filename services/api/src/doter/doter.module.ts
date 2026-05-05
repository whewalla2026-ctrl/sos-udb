import { Module } from '@nestjs/common';
import { DoterService } from './doter.service';
import { DoterResolver } from './doter.resolver';
import { UupSyncModule } from '../uup-sync/uup-sync.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [UupSyncModule, PrismaModule], providers: [DoterService, DoterResolver], exports: [DoterService] })
export class DoterModule {}
