import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UupSyncModule } from '../uup-sync/uup-sync.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({ imports: [UupSyncModule, PrismaModule], providers: [UsersService, UsersResolver], exports: [UsersService] })
export class UsersModule {}
