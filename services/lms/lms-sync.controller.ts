import { Controller, Post, Body, Param } from '@nestjs/common';
import { LmsSyncService } from './lms-sync.service';

@Controller('lms-sync')
export class LmsSyncController {
  constructor(private readonly svc: LmsSyncService) {}

  @Post('ingest')
  ingest(@Body() body: { userId: string; payload: any }) {
    return this.svc.sync(body.userId, body.payload);
  }

  @Post('aggregate/:userId')
  aggregate(@Body() body: any, @Param('userId') userId: string) {
    return this.svc.fetchAggregated(userId);
  }
}
