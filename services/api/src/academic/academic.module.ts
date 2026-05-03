import { Module } from '@nestjs/common'; import { AcademicService } from './academic.service'; import { AcademicResolver } from './academic.resolver'; import { AiModule } from '../ai/ai.module';
@Module({ imports: [AiModule], providers: [AcademicService, AcademicResolver], exports: [AcademicService] })
export class AcademicModule {}
