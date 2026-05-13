import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../shared/metrics.controller';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';
import Stripe from 'stripe';
import crypto from 'crypto';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private stripe: Stripe;
  private readonly stripeConfigured: boolean;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    @Inject(REDIS_CLIENT) private redis: Redis,
    private metrics: MetricsService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key && !key.includes('placeholder') && !key.includes('mock')) {
      this.stripe = new Stripe(key, {
        apiVersion: '2024-04-10',
        maxNetworkRetries: 3,
        timeout: 30000,
        appInfo: { name: 'udb-platform', version: '1.0.0' },
      });
      this.stripeConfigured = true;
      this.logger.log('Stripe initialized');
    } else {
      this.stripeConfigured = false;
      this.logger.warn('Stripe not configured — billing operations will throw');
    }
  }

  private requireStripe() {
    if (!this.stripeConfigured || !this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY in environment.');
    }
  }

  private async idempotentCall<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const idempotencyKey = `${key}_${crypto.randomUUID()}`;
    return fn();
  }

  async getPlans() {
    return this.prisma.billingPlan.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } });
  }

  async getMySubscription(userId: string) {
    return this.prisma.subscription.findFirst({ where: { userId }, include: { plan: true } });
  }

  async createCheckoutSession(userId: string, planId: string, successUrl: string, cancelUrl: string) {
    this.requireStripe();
    const plan = await this.prisma.billingPlan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error('Plan not found');
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    let customerId = (await this.prisma.subscription.findFirst({ where: { userId } }))?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe!.customers.create({ email: user.email, metadata: { userId } });
      customerId = customer.id;
    }
    const session = await this.stripe!.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: plan.stripePriceId || undefined, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: { trial_period_days: 14 },
      metadata: { userId, planId },
    });
    return { url: session.url, sessionId: session.id };
  }

  async createPortalSession(userId: string, returnUrl: string) {
    this.requireStripe();
    const sub = await this.prisma.subscription.findFirst({ where: { userId } });
    if (!sub?.stripeCustomerId) throw new Error('No customer found');
    const session = await this.stripe!.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: returnUrl });
    return { url: session.url };
  }

  async cancelSubscription(userId: string) {
    const sub = await this.prisma.subscription.findFirst({ where: { userId } });
    if (!sub) throw new Error('No subscription found');
    if (this.stripeConfigured && sub.stripeSubscriptionId) {
      await this.stripe!.subscriptions.cancel(sub.stripeSubscriptionId);
    }
    await this.prisma.subscription.update({ where: { id: sub.id }, data: { status: 'canceled', canceledAt: new Date() } });
    return { canceled: true };
  }

  async handleStripeWebhook(event: Stripe.Event) {
    const eventType = event.type;
    const data = event.data.object as any;

    switch (eventType) {
      case 'checkout.session.completed': {
        const metadata = data.metadata || {};
        const existing = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: data.subscription },
        });
        if (!existing) {
          await this.prisma.subscription.create({
            data: {
              userId: metadata.userId,
              planId: metadata.planId,
              stripeSubscriptionId: data.subscription,
              stripeCustomerId: data.customer,
              status: 'active',
              currentPeriodStart: new Date(data.created * 1000),
              currentPeriodEnd: new Date((data.created + 2592000) * 1000),
            },
          });
        }
        break;
      }
      case 'customer.subscription.updated': {
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: data.id },
          data: {
            status: data.status,
            currentPeriodStart: new Date(data.current_period_start * 1000),
            currentPeriodEnd: new Date(data.current_period_end * 1000),
          },
        });
        break;
      }
      case 'customer.subscription.deleted': {
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: data.id },
          data: { status: 'canceled', canceledAt: new Date() },
        });
        break;
      }
      case 'customer.subscription.paused': {
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: data.id },
          data: { status: 'paused' },
        });
        break;
      }
      case 'customer.subscription.resumed': {
        await this.prisma.subscription.updateMany({
          where: { stripeSubscriptionId: data.id },
          data: { status: 'active' },
        });
        break;
      }
      case 'invoice.payment_succeeded': {
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: data.subscription },
        });
        if (sub) {
          const existingInvoice = await this.prisma.invoice.findUnique({
            where: { stripeInvoiceId: data.id },
          });
          if (!existingInvoice) {
            await this.prisma.invoice.create({
              data: {
                subscriptionId: sub.id,
                userId: sub.userId,
                stripeInvoiceId: data.id,
                amountUsd: data.amount_paid / 100,
                status: 'paid',
                paidAt: new Date(),
                invoiceUrl: data.hosted_invoice_url,
              },
            });
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const sub = await this.prisma.subscription.findFirst({
          where: { stripeSubscriptionId: data.subscription },
        });
        if (sub) {
          await this.prisma.invoice.create({
            data: {
              subscriptionId: sub.id,
              userId: sub.userId,
              stripeInvoiceId: data.id,
              amountUsd: data.amount_due / 100,
              status: 'failed',
              invoiceUrl: data.hosted_invoice_url,
            },
          });
          // Mark subscription as past_due on payment failure
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: 'past_due' },
          });
        }
        break;
      }
      case 'invoice.payment_action_required': {
        this.logger.warn(`Payment action required for invoice ${data.id}`);
        break;
      }
    }

    this.metrics.stripeWebhooksTotal.inc({ event: eventType, status: 'processed' });
    this.logger.log(`Webhook processed: ${eventType}`);
    return { received: true };
  }

  async getInvoices(userId: string, limit = 20) {
    return this.prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: limit });
  }

  async trackUsage(userId: string, metric: string, value: number) {
    await this.prisma.usageRecord.create({ data: { userId, metric, value, recordedAt: new Date() } });
    const plan = await this.prisma.subscription.findFirst({ where: { userId }, include: { plan: true } });
    if (!plan) return { allowed: true };
    const limits: Record<string, number> = { TUTOR_SESSIONS: 100, STORAGE_MB: plan.plan.maxStorageMb, AI_TOKENS: 100000 };
    const recent = await this.prisma.usageRecord.aggregate({ where: { userId, metric, recordedAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _sum: { value: true } });
    const limit = limits[metric] || Infinity;
    return { allowed: (recent._sum.value || 0) + value <= limit, current: recent._sum.value || 0, limit };
  }
}
