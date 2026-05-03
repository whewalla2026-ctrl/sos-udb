// services/api/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { UupSyncModule } from '../uup-sync/uup-sync.module';

@Module({ imports: [UupSyncModule], providers: [UsersService, UsersResolver], exports: [UsersService] })
export class UsersModule {}
