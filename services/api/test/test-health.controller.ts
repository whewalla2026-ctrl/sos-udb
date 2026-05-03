import { Controller, Get } from '@nestjs/common';

@Controller()
export class MockHealthController {
  @Get('health')
  health() {
    return { status: 'OK', service: 'udb-api' };
  }
}
