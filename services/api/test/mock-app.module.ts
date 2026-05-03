import { Module } from '@nestjs/common';
import { MockHealthController } from './test-health.controller';

@Module({
  controllers: [MockHealthController],
  providers: [],
})
export class MockAppModule {}
