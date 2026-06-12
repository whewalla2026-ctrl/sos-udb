import { Module } from '@nestjs/common';
import { InstitutionalService } from './institutional.service';
import { InstitutionalResolver } from './institutional.resolver';
import { SharedModule } from '../shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [InstitutionalService, InstitutionalResolver],
  exports: [InstitutionalService],
})
export class InstitutionalModule {}
