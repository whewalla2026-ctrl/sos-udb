import { Controller, Post, Body } from '@nestjs/common';
import { BiometricFlowService } from './biometric_flow.service';

@Controller('biometric-flow')
export class BiometricFlowController {
  constructor(private readonly svc: BiometricFlowService) {}

  @Post('update')
  update(@Body() body: { userId: string; data: any }) {
    return this.svc.calculateFlowWindow(body.data);
  }
}
