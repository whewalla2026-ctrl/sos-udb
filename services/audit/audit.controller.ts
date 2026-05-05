import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Post('log')
  log(@Body() body: { userId?: string; event: string; payload?: any }) {
    return this.audit.logEvent(body.userId, body.event, body.payload);
  }

  @Get('logs')
  logs(@Query('userId') userId?: string) {
    return this.audit.getLogs(userId);
  }
}
