# Billing Model Design

> Extends the existing design in `pilot/outputs/BILLING_AND_TENANT_MODEL.md` with implementation-specific details for Stripe integration, metering, invoicing, and enterprise pricing.

## 1. Subscription Tiers

### Plan Definitions

| Feature | Free | Pro ($29/mo) | Enterprise ($299/mo) |
|---|---|---|---|
| **Requests/min** | 60 | 600 | 10,000 |
| **AI hints/day** | 10 | 500 | 50,000 |
| **Storage** | 50 MB | 500 MB | 5 GB |
| **Queues/day** | 100 | 5,000 | 100,000 |
| **Audit retention** | 30 days | 1 year | 7 years (WORM) |
| **Support SLA** | Email (72h) | Chat (4h) | Priority + phone (1h) |
| **Future Self sims** | 1/mo | 4/mo | Unlimited |
| **AI Tutor sessions** | 5/mo | 50/mo | Unlimited |
| **Family members** | 4 (1 parent + 3 children) | 8 (2 parents + 6 children) | Unlimited |
| **Biometric history** | 7-day | 90-day | Unlimited |
| **Marketplace** | Basic browse | Full access | Full + creator tools |
| **Data export** | Manual CSV | Auto CSV + PDF | API access + webhooks |

### Plan Limits Storage

Plan definitions are stored in Redis (`tenant:{id}:plan`) and resolved via `BillingService.getPlanLimits()`. Each tier's limits are defined as a constant map:

```typescript
// Proposed: services/api/src/billing/constants.ts
export const PLAN_LIMITS: Record<string, Record<string, number>> = {
  free: {
    requestsPerMin: 60,
    aiHintsPerDay: 10,
    storageMB: 50,
    queuesPerDay: 100,
    auditRetentionDays: 30,
    familyMembers: 4,
    biometricHistoryDays: 7,
    tutorSessionsPerMonth: 5,
    futureSelfSimsPerMonth: 1,
  },
  pro: {
    requestsPerMin: 600,
    aiHintsPerDay: 500,
    storageMB: 500,
    queuesPerDay: 5000,
    auditRetentionDays: 365,
    familyMembers: 8,
    biometricHistoryDays: 90,
    tutorSessionsPerMonth: 50,
    futureSelfSimsPerMonth: 4,
  },
  enterprise: {
    requestsPerMin: 10000,
    aiHintsPerDay: 50000,
    storageMB: 5120,
    queuesPerDay: 100000,
    auditRetentionDays: 2556, // 7 years
    familyMembers: 999,
    biometricHistoryDays: 99999,
    tutorSessionsPerMonth: 99999,
    futureSelfSimsPerMonth: 99999,
  },
};
```

## 2. Stripe Integration Design

### Dependencies

- `stripe: ^15.5.0` in `services/api/package.json:55`
- Stripe API version `2024-11-20.acacia` or later (compatible with ^15.5.0)

### Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────────┐
│  Next.js UI  │────▶│ NestJS API   │────▶│ Stripe SDK       │
│  (Checkout)  │     │ (BillingMod) │     │ (REST API)       │
└─────────────┘     └──────┬───────┘     └────────┬─────────┘
                           │                       │
                           ▼                       ▼
                     ┌──────────┐          ┌──────────────┐
                     │  Redis   │          │ Stripe        │
                     │ (plan)   │          │ (subscription)│
                     └──────────┘          └──────────────┘
```

### Proposed Module Structure

```
services/api/src/billing/
├── billing.module.ts          # NestJS module registration
├── billing.resolver.ts        # GraphQL resolvers for billing queries/mutations
├── billing.service.ts         # Core billing logic, quota checks
├── stripe/
│   ├── stripe.module.ts       # Stripe provider registration
│   ├── stripe.service.ts      # Stripe API client wrapper
│   └── stripe.webhook.ts      # Webhook handler controller
├── constants.ts               # Plan definitions, limits map
├── dto/
│   ├── create-checkout.dto.ts
│   ├── manage-subscription.dto.ts
│   └── webhook-event.dto.ts
└── guards/
    └── billing.guard.ts       # Guards pro-only features
```

### Stripe Service (Proposed)

```typescript
// services/api/src/billing/stripe/stripe.service.ts
import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, tenantId: string) {
    return this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { tenantId },
      success_url: `${process.env.APP_URL}/dashboard/settings?billing=success`,
      cancel_url: `${process.env.APP_URL}/dashboard/settings?billing=canceled`,
      subscription_data: {
        metadata: { tenantId },
      },
    });
  }

  async createCustomer(email: string, name: string, tenantId: string) {
    return this.stripe.customers.create({
      email,
      name,
      metadata: { tenantId },
    });
  }

  async cancelSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }

  async updateSubscription(subscriptionId: string, params: Stripe.SubscriptionUpdateParams) {
    return this.stripe.subscriptions.update(subscriptionId, params);
  }
}
```

### Stripe Webhook Handler (Proposed)

```typescript
// services/api/src/billing/stripe/stripe.webhook.ts
@Controller('stripe/webhook')
export class StripeWebhookController {
  @Post()
  @Header('stripe-signature', 'string')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    const sig = req.headers['stripe-signature'] as string;
    const event = this.stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await this.billingService.setPlan(session.metadata.tenantId, 'pro');
        await this.billingService.resetUsage(session.metadata.tenantId);
        break;
      }
      case 'customer.subscription.updated': {
        // Handle upgrades, downgrades, cancellation
        break;
      }
      case 'customer.subscription.deleted': {
        // Mark tenant for Free plan at period end
        await this.billingService.schedulePlanChange(event.data.object.metadata.tenantId, 'free');
        break;
      }
      case 'invoice.payment_succeeded': {
        // Generate downloadable invoice
        await this.invoiceService.recordPayment(event.data.object);
        break;
      }
      case 'invoice.payment_failed': {
        // Notify tenant, apply grace period
        break;
      }
    }

    res.json({ received: true });
  }
}
```

### Product & Price Configuration (Stripe Dashboard)

| Product | Price ID (example) | Amount | Interval |
|---|---|---|---|
| UDB Pro Monthly | `price_pro_monthly` | $29.00 | month |
| UDB Pro Annual | `price_pro_annual` | $290.00 | year (2mo free) |
| UDB Enterprise Monthly | `price_ent_monthly` | $299.00 | month |
| UDB Enterprise Annual | `price_ent_annual` | $2,990.00 | year (2mo free) |
| Storage Add-on 1GB | `price_storage_1gb` | $5.00 | month |

## 3. Metering and Usage Tracking Approach

### Redis Counter Architecture

Existing implementation pattern in `pilot/outputs/BILLING_AND_TENANT_MODEL.md` §2. The counters are:

| Metric Key | TTL | Tracking Point |
|---|---|---|
| `usage:{tenantId}:requestsPerMin` | 60s | API Gateway middleware (all routes) |
| `usage:{tenantId}:aiHintsPerDay` | 86400s | AI Tutor service after hint generation |
| `usage:{tenantId}:storageMB` | 86400s | Evidence upload service |
| `usage:{tenantId}:queuesPerDay` | 86400s | Background queue enqueue |

### Usage Quota Guard (Proposed)

```typescript
// services/api/src/billing/guards/billing.guard.ts
@Injectable()
export class BillingGuard implements CanActivate {
  constructor(private billingService: BillingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = GqlExecutionContext.create(context);
    const { tenantId } = ctx.getContext().req.user;

    // Check if Pro tier is required (via @ProOnly() decorator)
    const proOnly = Reflect.getMetadata('pro-only', context.getHandler());
    if (proOnly) {
      const plan = await this.billingService.getPlan(tenantId);
      if (plan === 'free') {
        throw new ForbiddenException('Upgrade to Pro to access this feature');
      }
    }

    return true;
  }
}
```

### Usage Dashboard Reporting

The `getReport` method aggregates plan → limits → current usage into a structure consumed by the frontend settings page (apps/web/src/app/dashboard/settings/page.tsx):

```json
{
  "plan": "pro",
  "limits": { "aiHintsPerDay": 500, "storageMB": 500 },
  "usage": { "aiHintsPerDay": 45, "storageMB": 120.5 },
  "timestamp": "2026-05-09T12:00:00Z"
}
```

### Usage Reset on Plan Change

Per existing design (`BILLING_AND_TENANT_MODEL.md` §3, `planChange Reset`), all counters are flushed via Redis `DEL` on plan change. Additionally, active Stripe subscription status is verified via `stripe.subscriptions.retrieve()` on each quota check to catch out-of-band changes.

## 4. Invoice Generation

### Invoice Lifecycle

1. **Stripe handles invoice creation** automatically for subscription payments
2. **Webhook `invoice.payment_succeeded`** triggers storage of invoice metadata in local DB
3. **Invoice record** stored in a new `Invoice` model (proposed addition to `prisma/schema.prisma`):

```prisma
model Invoice {
  id              String   @id @default(uuid())
  tenantId        String
  stripeInvoiceId String   @unique
  amountPaid      Float
  currency        String   @default("usd")
  status          String   // paid, open, void, uncollectible
  periodStart     DateTime
  periodEnd       DateTime
  paidAt          DateTime?
  invoicePdf      String?  // Stripe-hosted PDF URL
  createdAt       DateTime @default(now())
}
```

4. **User-facing invoice list** in settings/billing page: shows paid invoices with download link to Stripe-hosted PDF
5. **Enterprise invoicing**: Custom VAT/GST handling via Stripe customer `tax_id` field. Monthly consolidated PDFs emailed to billing contact.

## 5. Plan Upgrade/Downgrade Flow

### Upgrade Flow (Free → Pro)

```
User clicks "Upgrade to Pro"
  → POST /graphql { mutation: createCheckoutSession(priceId: "pro_monthly") }
  → StripeService.createCheckoutSession() creates Stripe Checkout Session
  → Returns sessionUrl → frontend redirects to checkout.stripe.com
  → User completes payment on Stripe
  → Stripe sends webhook: checkout.session.completed
  → BillingService.setPlan(tenantId, 'pro')
  → Redis counters reset
  → Confirmation email sent
  → User redirected back to /dashboard/settings?billing=success
```

### Downgrade Flow (Pro → Free)

```
User clicks "Cancel Subscription" in Stripe Customer Portal
  → Stripe Portal handles cancellation UI
  → Stripe schedules subscription to end at period_end
  → Webhook: customer.subscription.updated (status: canceled)
  → BillingService.schedulePlanChange(tenantId, 'free', atPeriodEnd: true)
  → At period_end, cron job executes plan change
  → Redis counters reset
  → Pro features revoked
  → Data retained for 30-day grace period
  → Email notification: "Your Pro plan has ended. Data retained until [date]"
```

### Upgrade/Downgrade Matrix

| From → To | Effective | Counter Reset | Data Impact |
|---|---|---|---|
| Free → Pro | Immediate | Yes | Storage limit increases, history unlocks |
| Free → Enterprise | Immediate | Yes | Full access |
| Pro → Free | End of billing period | Yes (at period end) | Biometric history truncated to 7d |
| Pro → Enterprise | Immediate | Yes | All Pro data preserved |
| Enterprise → Pro | End of billing period | Yes | Enterprise-only data preserved (read-only) |
| Enterprise → Free | End of billing period | Yes | Limited to Free limits |

## 6. Free Trial Design

### Trial Parameters

| Parameter | Value |
|---|---|
| **Duration** | 14 days |
| **Tier during trial** | Pro (full features) |
| **Payment required** | Credit card on signup (no charge until trial ends) |
| **Usage limits during trial** | Pro limits (600 req/min, 500 AI hints/day, 500 MB storage) |
| **Max trials per email** | 1 |
| **Max trials per IP** | 3 per 90 days |
| **Ending action** | Auto-downgrade to Free or charge card on file |

### Trial Implementation

```typescript
// Proposed addition to BillingService
async setTrial(tenantId: string, email: string) {
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  // Set plan to 'pro' with trial metadata
  await this.redis.set(`tenant:${tenantId}:plan`, 'pro');
  await this.redis.set(`tenant:${tenantId}:trial_end`, trialEnd.toISOString());
  await this.redis.expire(`tenant:${tenantId}:trial_end`, 15 * 24 * 60 * 60); // 15 days TTL

  // Create Stripe customer without payment method initially
  const customer = await this.stripeService.createCustomer(email, '', tenantId);
  await this.redis.set(`tenant:${tenantId}:stripe_customer_id`, customer.id);
}

async isTrialActive(tenantId: string): Promise<boolean> {
  const trialEnd = await this.redis.get(`tenant:${tenantId}:trial_end`);
  if (!trialEnd) return false;
  return new Date(trialEnd) > new Date();
}
```

### Trial CTA in Registration

In `apps/web/src/app/auth/register/page.tsx`, after successful registration:
- Show trial banner: "🎉 You're on a 14-day free Pro trial! Full access, no charge."
- Explicit trial terms: "Your trial ends [date]. We'll remind you 3 days before. No charges until trial ends."
- Admin scheduled task checks daily for expiring trials and sends reminder emails at T-3 and T-1 days.

## 7. Enterprise Custom Pricing Approach

### Pricing Model

Enterprise pricing is **quote-based**, not self-serve:
- Base: $299/mo for up to 50 students
- Volume tiers: 51-200 ($499/mo), 201-1000 ($999/mo), 1000+ (custom)
- Annual contracts preferred (2 months free vs monthly)
- Additional services: dedicated AI model fine-tuning, custom integrations, white-labeling
- SOC 2 Type II reports provided under NDA
- 7-year WORM audit retention included

### Stripe Implementation

Enterprise subscriptions use **Stripe Quotes** rather than standard Checkout:

```typescript
async createEnterpriseQuote(tenantId: string, lineItems: Stripe.QuoteCreateParams.LineItem[]) {
  const customerId = await this.getStripeCustomerId(tenantId);
  return this.stripe.quotes.create({
    customer: customerId,
    line_items: lineItems,
    subscription_data: {
      metadata: { tenantId, tier: 'enterprise' },
    },
    expires_at: Math.floor(Date.now() / 1000) + 30 * 24 * 3600, // 30-day quote validity
  });
}
```

### Admin Plan Override

Admins can override any tenant's plan via admin console (`/dashboard/admin`):

```typescript
// services/api/src/billing/billing.service.ts (admin method)
async adminSetPlan(adminUserId: string, targetTenantId: string, plan: string) {
  // Audit log the override
  await this.prisma.auditLog.create({
    data: {
      actorId: adminUserId,
      action: 'PLAN_OVERRIDE',
      payload: { targetTenantId, newPlan: plan },
    },
  });

  await this.setPlan(targetTenantId, plan);
  await this.resetUsage(targetTenantId);
}
```

### Revenue Recognition

- Monthly subscriptions: recognized monthly on payment
- Annual subscriptions: recognized monthly (deferred revenue tracked in accounting system)
- Enterprise annual contracts: recognized ratably over contract term
- Usage overages (storage add-ons): billed in arrears on next invoice

### Key Stripe Webhook Events to Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate plan, reset usage, send welcome |
| `customer.subscription.updated` | Handle prorated upgrades/downgrades |
| `customer.subscription.deleted` | Schedule Free plan downgrade, begin grace period |
| `invoice.payment_succeeded` | Record payment, generate local invoice record |
| `invoice.payment_failed` | Retry logic (3 retries over 5 days), then suspend |
| `customer.subscription.pending_update_applied` | Apply pending plan change (downgrade at period end) |
| `customer.subscription.pending_update_expired` | Clear pending if customer cancels downgrade |

## Integration Points Summary

| Integration | Location | Purpose |
|---|---|---|
| Stripe Checkout | `services/api/src/billing/stripe/stripe.service.ts` | Create subscription sessions |
| Stripe Webhook | `services/api/src/billing/stripe/stripe.webhook.ts` | Handle async payment events |
| Redis Counters | `services/api/src/billing/billing.service.ts` | Real-time usage metering |
| NestJS Guards | `services/api/src/billing/guards/billing.guard.ts` | Protect Pro/Enterprise routes |
| GraphQL Resolvers | `services/api/src/billing/billing.resolver.ts` | Expose plan/usage data to frontend |
| Admin Console | `apps/web/src/app/dashboard/admin/page.tsx` | Manual plan overrides, revenue reports |
| Settings Page | `apps/web/src/app/dashboard/settings/page.tsx` | User-facing plan management UI |
| Prisma Schema | `prisma/schema.prisma` | Invoice records, customer references |
