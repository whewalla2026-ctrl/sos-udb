# Billing and Multi-Tenant Architecture

## 1. Subscription Tiers

The UDB platform uses a three-tier subscription model defined in `services/api/prisma/phase3/shared/billing.js:4-8` via the `PLANS` constant. Each tier enforces rate limits, AI hint quotas, storage caps, and queue throughput via Redis-backed counters.

### Plan Definitions

| Metric | Free | Pro | Enterprise |
|--------|------|-----|------------|
| **Price** | $0/mo | $29/mo | $299/mo |
| **Requests/min** | 60 | 600 | 10,000 |
| **AI hints/day** | 10 | 500 | 50,000 |
| **Storage** | 50 MB | 500 MB | 5 GB |
| **Queues/day** | 100 | 5,000 | 100,000 |
| **Audit retention** | 30 days | 1 year | 7 years (WORM) |
| **Support** | Email (72h) | Chat (4h) | Priority + phone |
| **Future Self sims** | 1/mo | 4/mo | Unlimited |
| **Marketplace** | Basic browse | Full access | Full + creator tools |
| **AI Tutor sessions** | 5/mo | 50/mo | Unlimited |
| **Family members** | 4 (1 parent + 3 children) | 8 (2 parents + 6 children) | Unlimited |
| **Biometric tracking** | 7-day history | 90-day history | Unlimited history |
| **Data export** | Manual CSV | Auto CSV + PDF | API access + webhooks |

### Free Tier Constraints

The Free tier is designed for evaluation and light usage. Key limitations:
- Rate-limited to 60 requests per minute globally across all API gateway routes (`services/api/prisma/phase3/gateway.js:61` sets a global 200/min cap; per-tenant billing quota further restricts this)
- AI hint generation capped at 10 per day, enforced via `BillingService.checkQuota('aiHintsPerDay')`
- Storage limited to 50 MB — primarily for evidence gallery images and avatar uploads
- Only 100 queue jobs per day (analytics, notifications, cleanup)
- Suitable for a single parent-child pair exploring the platform

### Pro Tier

The Pro tier targets engaged families:
- 600 req/min burst capacity — sufficient for concurrent family members
- 500 AI hints/day enables daily tutoring across multiple subjects
- 500 MB storage covers evidence gallery (photos, videos of completed quests) and avatar customization
- 5,000 queue jobs/day supports moderate analytics and notification volume
- Full marketplace access including purchasing from other families

### Enterprise Tier

The Enterprise tier serves schools, districts, and youth organizations:
- 10,000 req/min supports hundreds of concurrent students
- 50,000 AI hints/day for classroom-wide AI tutoring
- 5 GB storage for portfolio-grade evidence galleries
- 100,000 queue jobs/day for batch processing, bulk analytics, and notification campaigns
- 7-year immutable audit trail for compliance (FR-38.2)
- Priority phone support with 1-hour SLA

## 2. Usage Tracking System

### Redis-Based Counter Architecture

Usage tracking is implemented in `BillingService` at `services/api/prisma/phase3/shared/billing.js:48-55` using Redis atomic counters with configurable TTL:

```javascript
async trackUsage(tenantId, metric, amount = 1) {
  const key = `usage:${tenantId}:${metric}`;
  const ttl = metric === 'requestsPerMin' ? 60 
    : metric === 'aiHintsPerDay' || metric === 'queuesPerDay' ? 86400 
    : 86400;
  const current = await this.client.incrby(key, amount);
  if (current === amount) await this.client.expire(key, ttl);
  return current;
}
```

**Key design decisions:**
- `INCRBY` with lazy TTL expiration: only sets TTL on first increment (`current === amount`), avoiding redundant `EXPIRE` calls on hot counters
- TTL-based auto-reset: `requestsPerMin` resets every 60 seconds (sliding window), `aiHintsPerDay` and `queuesPerDay` reset every 86,400 seconds (24 hours)
- No periodic cron needed — Redis handles key expiration natively
- Graceful degradation: if Redis is unreachable (`this.ready === false`), `trackUsage` returns `false` and `checkQuota` returns `{ allowed: true }` — the system becomes permissive rather than blocking legitimate traffic

### Tracked Metrics

| Metric Key | TTL | Granularity | Description |
|-----------|-----|-------------|-------------|
| `requestsPerMin` | 60s | Per minute | HTTP requests through the API gateway |
| `aiHintsPerDay` | 86400s | Per day | AI-generated hints via `/ai-lite/hint` |
| `storageMB` | 86400s | Per day | Upload storage consumption (evidence, avatars) |
| `queuesPerDay` | 86400s | Per day | Background job enqueues (analytics, notifications) |

### Usage Report Generation

The `getReport` method (`billing.js:76-81`) aggregates plan limits and current usage into a single structure:

```javascript
async getReport(tenantId) {
  const plan = await this.getPlan(tenantId);
  const limits = this.getPlanLimits(plan);
  const usage = await this.getUsage(tenantId);
  return { tenantId, plan, limits, usage, timestamp: new Date().toISOString() };
}
```

This report is consumed by the admin billing dashboard to render usage bars ("45 of 500 AI hints used today") and by the frontend quota warning component.

### Integration Points

1. **API Gateway middleware** — each proxied request calls `checkQuota('requestsPerMin')` before forwarding
2. **AI Service** — calls `trackUsage(tenantId, 'aiHintsPerDay')` after generating each hint
3. **Upload service** — calls `trackUsage(tenantId, 'storageMB', fileSizeMB)` on evidence uploads
4. **Queue service** — calls `trackUsage(tenantId, 'queuesPerDay')` on each `enqueue`

## 3. Quota Enforcement

### checkQuota Method

The `checkQuota` method (`billing.js:57-64`) is the central enforcement point:

```javascript
async checkQuota(tenantId, metric) {
  if (!this.ready) return { allowed: true, used: 0, limit: Infinity };
  const plan = await this.getPlan(tenantId);
  const limits = this.getPlanLimits(plan);
  const limit = limits[metric] || Infinity;
  const used = parseInt(await this.client.get(`usage:${tenantId}:${metric}`)) || 0;
  return { allowed: used < limit, used, limit, plan };
}
```

**Behavior:**
- Returns `{ allowed: true, used: 0, limit: Infinity }` when Redis is down (fail-open)
- Plan lookup is a simple Redis string get (`tenant:{id}:plan`) — O(1)
- Metric lookup is a Redis string get (`usage:{tenantId}:{metric}`) — O(1)
- If the metric key doesn't exist (never tracked), `used` defaults to 0 and `allowed` is true
- The `plan` field in the response enables frontend to show upgrade prompts: "You've hit the Free plan limit. Upgrade to Pro for 500 hints/day."

### Gateway Integration

In the API gateway (`services/api/prisma/phase3/gateway.js`), quota is checked before proxy routing. The pattern (to be implemented) would be:

```javascript
// In each authenticated route handler:
const quota = await billingService.checkQuota(req.user.tenantId, 'requestsPerMin');
if (!quota.allowed) {
  return res.status(429).json({
    error: 'Plan rate limit exceeded',
    used: quota.used,
    limit: quota.limit,
    plan: quota.plan,
    upgradeUrl: '/dashboard/settings/billing'
  });
}
```

Current gateway rate limiting (gateway.js:61-63) provides a global 200 req/min guard. The billing quota adds per-tenant enforcement at the plan level.

### planChange Reset

When a plan changes (`billing.js:35-42`), all usage counters are reset via `keys usage:{tenantId}:*` pattern match + `DEL`. This ensures:
- A Free user upgrading to Pro gets a fresh quota window (no "you already used 10 hints today" lockout)
- An Enterprise user downgrading to Free is immediately constrained to Free limits

## 4. Multi-Tenant Isolation Approach

### Redis Key Namespacing

Every Redis key is prefixed with the tenant ID to prevent cross-tenant data leakage:

```
tenant:{tenantId}:plan          → Plan assignment
usage:{tenantId}:requestsPerMin → Usage counter
usage:{tenantId}:aiHintsPerDay  → Usage counter
```

The `getPlan` method (`billing.js:30-33`) and `getUsage` method (`billing.js:66-74`) both scope lookups by `tenantId`. No cross-tenant iteration or global aggregation occurs at the Redis layer.

### PostgreSQL Row-Level Security

Beyond Redis, the Prisma schema (`services/api/prisma/schema.prisma`) enforces tenant boundaries via the `User` model and `FamilyLink` model:

```prisma
model User {
  id          String   @id @default(uuid())
  role        UserRole  // PARENT | CHILD | ADMIN
  // ...
}

model FamilyLink {
  id        String @id @default(uuid())
  parentId  String
  childId   String
  // @@unique([parentId, childId])
}
```

Tenant isolation is implemented through:
1. **Family-based grouping** — each family (1+ parents, 1+ children) forms a tenant boundary
2. **RLS policies** — PostgreSQL Row-Level Security on all data tables filters by `familyId` (derived from the authenticated user's family link)
3. **GraphQL context** — NestJS resolvers receive the authenticated user from JWT and filter all queries by `userId` or `familyId`

### Tenant Granularity

UDB uses a **logical multi-tenant model**:
- Each family unit is a tenant
- A parent user can see their own children's data but not other families' data
- Child users can only see their own data
- Admin users (role `ADMIN`) have cross-tenant visibility for support and moderation

## 5. Tenant Boundary Enforcement

### API Layer (Gateway)

The `enforceTenantAccess` middleware (`services/api/prisma/phase3/gateway.js:66-71`) verifies that `req.params.userId` matches `req.user.userId`:

```javascript
function enforceTenantAccess(req, res, next) {
  if (req.params.userId && req.user && req.params.userId !== req.user.userId) {
    return res.status(403).json({
      error: 'Cross-tenant access denied',
      requested: req.params.userId,
      authenticated: req.user.userId
    });
  }
  next();
}
```

This is applied to routes with `:userId` parameters:
- `GET /planning/:userId` (gateway.js:165) — weekly plan access
- `GET /ai-lite/budget/:userId` (gateway.js:170) — AI budget check

### GraphQL Layer (NestJS Resolvers)

All NestJS resolvers use the `@CurrentUser()` decorator to extract the authenticated user from the GraphQL context (`services/api/src/auth/decorators/current-user.decorator.ts`). Resolvers then filter by `user.id`:

```typescript
// Pattern in all resolvers:
@Query(() => [QuestType])
@UseGuards(GqlAuthGuard)
async myQuests(@CurrentUser() user: any) {
  return this.quests.findByUser(user.id);  // scoped to authenticated user
}
```

The `RolesGuard` (`services/api/src/auth/guards/roles.guard.ts`) further restricts admin-only operations. Route-level permission checks prevent cross-tenant data access even if a user crafts a malicious GraphQL query.

### Database Layer

All Prisma models in `schema.prisma` include a `userId` foreign key. Queries are always scoped:

```typescript
// Always filter by authenticated user
this.prisma.quest.findMany({ where: { userId: user.id } });
```

This creates a defense-in-depth approach: the API layer checks the user, the GraphQL layer scopes queries, and the database layer enforces referential integrity.

## 6. Pricing Model Design

### Unit Economics

| Cost Component | Free | Pro | Enterprise |
|---------------|------|-----|------------|
| Compute (req/min) | ~$0.50/mo | ~$3.00/mo | ~$30.00/mo |
| AI inference (hints) | ~$0.10/mo | ~$5.00/mo | ~$250.00/mo |
| Storage | ~$0.01/mo | ~$0.10/mo | ~$1.00/mo |
| Support cost | ~$0.50/mo | ~$3.00/mo | ~$20.00/mo |
| **Total cost** | **~$1.11/mo** | **~$11.10/mo** | **~$301.00/mo** |
| **Revenue** | **$0.00** | **$29.00** | **$299.00** |
| **Margin** | **-100%** | **~62%** | **~-1%** |

Enterprise margins are thin at the base tier but improve with volume discounts and dedicated infrastructure. The Pro tier is the primary revenue driver with a healthy 62% gross margin.

### Pricing Philosophy

1. **Freemium conversion funnel** — Free tier provides genuine value (10 AI hints/day, full feature set) but with hard limits that frustrate power users
2. **Value-based pricing for Pro** — $29/mo is positioned as "less than a tutoring session" while delivering daily AI tutoring
3. **Cost-plus for Enterprise** — $299/mo covers infrastructure costs for school deployments with compliance requirements
4. **Storage upselling** — Additional storage blocks at $5/GB/mo for users exceeding plan limits

### Billing Flow (Proposed)

1. User registers → auto-assigned Free plan (`billing.service.setPlan(tenantId, 'free')`)
2. User clicks "Upgrade" → Stripe Checkout Session created → redirect to Stripe
3. Stripe webhook (`checkout.session.completed`) → update subscription in DB → `billing.service.setPlan(tenantId, 'pro')`
4. On each GraphQL request, `BillingGuard` checks subscription status, blocking access to Pro features if plan is Free
5. Downgrade: retains Pro access until end of billing period, then `setPlan(tenantId, 'free')` via cron
6. Cancel: immediate access revocation, data retained for 30 days (grace period)
