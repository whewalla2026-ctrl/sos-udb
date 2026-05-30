import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { MetricsService } from '../shared/metrics.controller';

jest.mock('stripe', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      customers: { create: jest.fn().mockResolvedValue({ id: 'cus_mock' }) },
      checkout: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://example.com/success', id: 'cs_mock' }) } },
      billingPortal: { sessions: { create: jest.fn().mockResolvedValue({ url: 'https://example.com/portal' }) } },
      subscriptions: { cancel: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue({}) },
    })),
  };
});

describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret-32-chars-minimum!!';
    process.env.STRIPE_SECRET_KEY = 'sk_live_realKeyForTesting';
  });

  beforeEach(async () => {
    prisma = {
      billingPlan: { findMany: jest.fn(), findUnique: jest.fn() },
      subscription: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      user: { findUnique: jest.fn() },
      invoice: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
      usageRecord: { create: jest.fn(), aggregate: jest.fn() },
    };
    const mockRedis = { get: jest.fn(), set: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'STRIPE_SECRET_KEY') return 'sk_live_realKeyForTesting';
              return null;
            }),
          },
        },
        { provide: REDIS_CLIENT, useValue: mockRedis },
        {
          provide: MetricsService,
          useValue: {
            stripeWebhooksTotal: { inc: jest.fn() },
            httpRequestsTotal: { inc: jest.fn() },
            httpRequestDuration: { observe: jest.fn() },
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPlans', () => {
    it('should return active billing plans sorted by sortOrder', async () => {
      prisma.billingPlan.findMany.mockResolvedValue([
        { id: 'plan-1', name: 'Free', priceUsd: 0, active: true },
        { id: 'plan-2', name: 'Pro', priceUsd: 9.99, active: true },
      ]);

      const result = await service.getPlans();

      expect(prisma.billingPlan.findMany).toHaveBeenCalledWith({
        where: { active: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('getMySubscription', () => {
    it('should return the user subscription with plan', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'u1',
        plan: { id: 'plan-1', name: 'Pro' },
        status: 'active',
      });

      const result = await service.getMySubscription('u1') as any;

      expect(prisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        include: { plan: true },
      });
      expect(result!.status).toBe('active');
    });

    it('should return null if no subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.getMySubscription('u1');
      expect(result).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('should create a stub checkout session when stripe is not configured', async () => {
      prisma.billingPlan.findUnique.mockResolvedValue({ id: 'plan-1', name: 'Pro', priceUsd: 9.99, stripePriceId: null });
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'test@test.com' });
      prisma.subscription.findFirst.mockResolvedValue(null);

      const result = await service.createCheckoutSession('u1', 'plan-1', 'https://example.com/success', 'https://example.com/cancel');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('sessionId');
      expect(result.url).toBe('https://example.com/success');
    });

    it('should throw if plan not found', async () => {
      prisma.billingPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession('u1', 'nonexistent', 'https://example.com/success', 'https://example.com/cancel'),
      ).rejects.toThrow('Plan not found');
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel a subscription', async () => {
      prisma.subscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        userId: 'u1',
        stripeSubscriptionId: null,
        status: 'active',
      });
      prisma.subscription.update.mockResolvedValue({});

      const result = await service.cancelSubscription('u1');

      expect(prisma.subscription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sub-1' },
          data: expect.objectContaining({ status: 'canceled' }),
        }),
      );
      expect(result.canceled).toBe(true);
    });

    it('should throw if no subscription found', async () => {
      prisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.cancelSubscription('u1')).rejects.toThrow('No subscription found');
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for a user', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        { id: 'inv-1', amountUsd: 9.99, status: 'paid' },
      ]);

      const result = await service.getInvoices('u1', 10);

      expect(prisma.invoice.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('trackUsage', () => {
    it('should track usage and return allowance status', async () => {
      prisma.usageRecord.create.mockResolvedValue({});
      prisma.subscription.findFirst.mockResolvedValue({
        plan: { maxStorageMb: 500 },
      });
      prisma.usageRecord.aggregate.mockResolvedValue({ _sum: { value: 50 } });

      const result = await service.trackUsage('u1', 'STORAGE_MB', 10);

      expect(result.allowed).toBe(true);
      expect(result.current).toBe(50);
      expect(result.limit).toBe(500);
    });
  });

  describe('handleStripeWebhook', () => {
    it('should process checkout.session.completed event', async () => {
      prisma.subscription.create.mockResolvedValue({});

      const event = {
        type: 'checkout.session.completed',
        data: {
          object: {
            metadata: { userId: 'u1', planId: 'plan-1' },
            subscription: 'sub_stripe_1',
            customer: 'cus_123',
            created: Date.now() / 1000,
          },
        },
      };

      const result = await service.handleStripeWebhook(event as any);

      expect(prisma.subscription.create).toHaveBeenCalled();
      expect(result.received).toBe(true);
    });

    it('should process invoice.payment_succeeded event', async () => {
      prisma.subscription.findFirst.mockResolvedValue({ id: 'sub-1', userId: 'u1' });
      prisma.invoice.create.mockResolvedValue({});

      const event = {
        type: 'invoice.payment_succeeded',
        data: {
          object: {
            id: 'in_123',
            subscription: 'sub_stripe_1',
            customer_email: 'test@test.com',
            amount_paid: 999,
            hosted_invoice_url: 'https://stripe.com/invoice',
          },
        },
      };

      const result = await service.handleStripeWebhook(event as any);

      expect(prisma.invoice.create).toHaveBeenCalled();
      expect(result.received).toBe(true);
    });
  });
});
