import { Module, Global } from '@nestjs/common';
import { MockIntegrationService } from './mock-integration.service';
import { S3Service } from './s3.service';

@Global()
@Module({
  providers: [MockIntegrationService, S3Service],
  exports: [MockIntegrationService, S3Service],
})
export class SharedModule {}
