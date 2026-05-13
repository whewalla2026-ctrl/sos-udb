import { Module, Logger } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingResolver } from './billing.resolver';
import { BillingWebhookController } from './billing-webhook.controller';

@Module({
  controllers: [BillingWebhookController],
  providers: [BillingService, BillingResolver, Logger],
  exports: [BillingService],
})
export class BillingModule {}
