import { Module } from '@nestjs/common';
import { UUPService } from './uup.service';
import { UUPResolver } from './uup.resolver';

@Module({
  providers: [UUPService, UUPResolver],
  exports: [UUPService],
})
export class UUPModule {}
