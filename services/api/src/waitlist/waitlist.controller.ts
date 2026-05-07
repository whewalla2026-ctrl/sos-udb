import { Controller, Post, Body, HttpCode } from '@nestjs/common';

@Controller('waitlist')
export class WaitlistController {
  private entries: Array<{ email: string; childAge?: string; source: string; createdAt: string }> = [];

  @Post()
  @HttpCode(201)
  join(@Body() body: { email: string; childAge?: string; source?: string }) {
    const entry = {
      email: body.email,
      childAge: body.childAge || null,
      source: body.source || 'direct',
      createdAt: new Date().toISOString(),
    };
    this.entries.push(entry);

    // In production: persist to database, send welcome email, add to CRM
    return {
      ok: true,
      message: 'You are on the waitlist! We will reach out when we launch.',
    };
  }
}
