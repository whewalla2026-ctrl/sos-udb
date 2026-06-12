import { Module, Global } from '@nestjs/common';
import { MockIntegrationService } from './mock-integration.service';

@Global()
@Module({
  providers: [MockIntegrationService],
  exports: [MockIntegrationService],
})
export class SharedModule {}
