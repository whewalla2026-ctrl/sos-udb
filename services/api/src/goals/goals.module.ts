import { Module } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { GoalsResolver } from './goals.resolver';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GoalsService, GoalsResolver],
  exports: [GoalsService]
})
export class GoalsModule {}
