import { Controller, Post, Body } from '@nestjs/common';
import { ConsentService } from './consent.service';

@Controller('consent')
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}
  @Post('grant')
  grant(@Body() body: { userId: string }) {
    return this.consent.grant(body.userId);
  }
  @Post('revoke')
  revoke(@Body() body: { userId: string }) {
    return this.consent.revoke(body.userId);
  }
}
