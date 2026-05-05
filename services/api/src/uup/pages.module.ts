import { Module } from '@nestjs/common';
import { UUPService } from './uup.service';

@Module({
  providers: [UUPService],
  exports: [UUPService],
})
export class PagesModule {}
