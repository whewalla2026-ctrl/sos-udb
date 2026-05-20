import { Controller, Post, Body, Headers, HttpException, HttpStatus } from '@nestjs/common';
import { BiometricService } from './biometric.service';

interface BiometricSyncBody {
  userId: string;
  hrv?: number;
  sleep_hours?: number;
  stress_index?: number;
  resting_hr?: number;
  steps?: number;
  source: 'healthkit' | 'googlefit' | 'manual';
}

@Controller('api/v1/biometric')
export class BiometricController {
  constructor(private bio: BiometricService) {}

  @Post('sync')
  async sync(
    @Body() body: BiometricSyncBody,
    @Headers('authorization') auth: string,
  ) {
    if (!auth) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (!body.userId) {
      throw new HttpException('userId is required', HttpStatus.BAD_REQUEST);
    }

    const entry = {
      time: new Date(),
      userId: body.userId,
      hrv: body.hrv,
      sleepHours: body.sleep_hours,
      stressIndex: body.stress_index,
      restingHr: body.resting_hr,
      steps: body.steps,
      source: body.source || 'manual',
    };

    const result = await this.bio.syncEntries(body.userId, [entry]);

    return {
      success: result.ingested > 0,
      ingested: result.ingested,
      duplicates: result.duplicates,
      errors: result.errors,
    };
  }
}