import { Module } from '@nestjs/common';
import { InstitutionalService } from './institutional.service';
import { InstitutionalResolver } from './institutional.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [InstitutionalService, InstitutionalResolver],
  exports: [InstitutionalService],
})
export class InstitutionalModule {}
