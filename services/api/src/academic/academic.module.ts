import { Module } from '@nestjs/common'; import { AcademicService } from './academic.service'; import { AcademicResolver } from './academic.resolver'; import { AiModule } from '../ai/ai.module'; import { PrismaModule } from '../prisma/prisma.module'; import { UupSyncModule } from '../uup-sync/uup-sync.module';
@Module({ imports: [AiModule, PrismaModule, UupSyncModule], providers: [AcademicService, AcademicResolver], exports: [AcademicService] })
export class AcademicModule {}
