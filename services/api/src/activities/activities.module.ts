import { Module } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { ActivitiesResolver } from './activities.resolver';
@Module({ providers: [ActivitiesService, ActivitiesResolver], exports: [ActivitiesService] })
export class ActivitiesModule {}
