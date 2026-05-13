import { Controller, Post, Req, RawBodyRequest, Logger, UnauthorizedException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ConfigService } from '@nestjs/config';
import { MetricsService } from '../shared/metrics.controller';
import Stripe from 'stripe';

@Controller('billing')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);
  private stripe: Stripe;

  constructor(
    private billing: BillingService,
    private config: ConfigService,
    private metrics: MetricsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && !key.includes('placeholder') && !key.includes('mock')) {
      this.stripe = new Stripe(key, {
        apiVersion: '2024-04-10',
        maxNetworkRetries: 3,
      });
    }
  }

  @Post('webhook')
  async handleWebhook(@Req() req: RawBodyRequest<Request>) {
    const sig = req.headers['stripe-signature'] as string;
    const endpointSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!this.stripe || !endpointSecret) {
      throw new UnauthorizedException('Stripe webhook secret not configured');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(req.body as any, sig, endpointSecret);
      return this.billing.handleStripeWebhook(event);
    } catch (err) {
      this.metrics.stripeWebhooksTotal.inc({ event: 'unknown', status: 'signature_failed' });
      this.logger.error(`Webhook signature verification failed: ${err}`);
      return { error: 'Invalid signature' };
    }
  }
}
