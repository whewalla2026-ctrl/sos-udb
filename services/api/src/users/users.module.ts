import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersResolver } from './users.resolver';
import { GdprService } from './gdpr.service';
import { UupSyncModule } from '../uup-sync/uup-sync.module';

@Module({
  imports: [UupSyncModule],
  providers: [UsersService, GdprService, UsersResolver],
  exports: [UsersService, GdprService],
})
export class UsersModule {}
