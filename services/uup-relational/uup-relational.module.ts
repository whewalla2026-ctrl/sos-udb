import { Module } from '@nestjs/common';
import { UupRelationalService } from './uup-relational.service';
@Module({ providers: [UupRelationalService], exports: [UupRelationalService] })
export class UupRelationalModule {}
