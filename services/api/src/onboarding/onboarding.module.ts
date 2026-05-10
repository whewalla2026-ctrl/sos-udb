import { Module } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingResolver } from './onboarding.resolver';

@Module({ providers: [OnboardingService, OnboardingResolver], exports: [OnboardingService] })
export class OnboardingModule {}
