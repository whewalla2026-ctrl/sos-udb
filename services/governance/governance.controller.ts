import { Controller, Post, Body } from '@nestjs/common';
import { GovernanceService } from './governance.service';

@Controller('governance')
export class GovernanceController {
  constructor(private readonly gov: GovernanceService) {}
  @Post('overlay')
  overlay(@Body() body: { userId: string; policy?: string }) {
    return this.gov.simulate(body.userId);
  }
}
