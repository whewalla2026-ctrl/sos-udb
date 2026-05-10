# Feature Flag System

## 1. Feature Flag Architecture

UDB's feature flag system uses a Redis-backed, database-anchored architecture that combines runtime evaluation speed with persistent storage. The design is inspired by LaunchDarkly's model but self-hosted for cost efficiency and data sovereignty.

### Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend   │────▶│   API Gateway  │────▶│  NestJS API  │
│  (Next.js)   │     │  (Express)    │     │  (GraphQL)   │
└──────┬──────┘     └──────┬───────┘     └──────┬──────┘
       │                   │                    │
       │           ┌───────▼───────┐            │
       └───────────▶  Redis Cache  │◀───────────┘
                   │  (flags:TLL)  │
                   └───────┬───────┘
                           │
                   ┌───────▼───────┐
                   │  PostgreSQL   │
                   │  feature_flags│
                   └───────────────┘
```

**Data flow:**
1. Flags are defined and persisted in PostgreSQL (source of truth)
2. On service startup, all flags are loaded into Redis with 300s TTL
3. Runtime flag evaluation reads from Redis (sub-millisecond latency)
4. Flag mutations (admin toggle, percentage rollout change) write to PostgreSQL and invalidate the Redis cache key
5. Frontend fetches flags via GraphQL query `GET_FEATURE_FLAGS`, cached in Apollo client cache

### Storage Layer

**PostgreSQL model** (proposed addition to `services/api/prisma/schema.prisma`):

```prisma
model FeatureFlag {
  id          String   @id @default(uuid())
  key         String   @unique
  type        String   // boolean | percentage | plan | user
  value       Json     // { enabled: true } | { pct: 50 } | { plans: ["PRO","ENTERPRISE"] } | { userIds: [...] }
  description String?
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  @@map("feature_flags")
}
```

**Redis cache structure:**
```
Key: flag:{key}
Value: JSON string of flag definition
TTL: 300 seconds (refreshed on each read)
```

### Flag Evaluation Service

The `FeatureFlagService` (proposed in `services/api/src/feature-flags/feature-flags.service.ts`) centralizes evaluation:

```typescript
@Injectable()
export class FeatureFlagsService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService
  ) {}

  async isEnabled(key: string, context: { userId: string; plan: string; role: string }): Promise<boolean> {
    // 1. Try Redis cache
    const cached = await this.redis.get(`flag:${key}`);
    if (cached) return this.evaluate(JSON.parse(cached), context);
    
    // 2. Cache miss — load from DB
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) return false;
    
    // 3. Cache for 5 minutes
    await this.redis.setex(`flag:${key}`, 300, JSON.stringify(flag));
    return this.evaluate(flag, context);
  }

  private evaluate(flag: any, context: { userId: string; plan: string; role: string }): boolean {
    switch (flag.type) {
      case 'boolean': return flag.value.enabled === true;
      case 'percentage': return this.hashUserId(context.userId) < flag.value.pct;
      case 'plan': return flag.value.plans?.includes(context.plan) ?? false;
      case 'user': return flag.value.userIds?.includes(context.userId) ?? false;
      default: return false;
    }
  }

  private hashUserId(userId: string): number {
    // Deterministic hash 0-99 for percentage rollouts
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 100;
  }
}
```

## 2. Flag Definitions

| Flag Key | Type | Default | Description |
|----------|------|---------|-------------|
| `aiTutor` | plan | Free enabled | AI-powered tutoring across subjects |
| `biometricTracking` | plan | Pro+ | Apple Health, Oura, Google Fit integration |
| `marketplace` | plan | Free (basic) | Family-to-family marketplace |
| `ventures` | plan | Pro+ | Kid-preneur venture creation and escrow |
| `messaging` | plan | Free | In-app messaging with AI safety checks |
| `evidenceGallery` | plan | Free | Photo/video evidence upload for quests |
| `weeklyPlan` | plan | Free | AI-generated weekly planning |
| `futureSelf` | plan | Pro+ | Future Self visualization and simulations |
| `safetyMonitor` | plan | Free | Real-time safety scoring and alerts |
| `achievementNFTs` | plan | Enterprise | Blockchain-based achievement SBT minting |

### Detailed Flag Specifications

#### aiTutor
- **Type:** `plan`
- **Free:** enabled (5 sessions/month)
- **Pro:** enabled (50 sessions/month)
- **Enterprise:** enabled (unlimited)
- **Description:** AI tutoring across academic subjects with Socratic questioning, mastery tracking, and session logs stored in `TutoringSession` model

#### biometricTracking
- **Type:** `plan`
- **Free:** disabled
- **Pro:** enabled (90-day history)
- **Enterprise:** enabled (unlimited)
- **Gate:** All `BiometricLog` mutations check this flag; without it, only the manual entry form shows

#### marketplace
- **Type:** `plan`
- **Free:** enabled (browse only, no purchases)
- **Pro:** enabled (full buy/sell)
- **Enterprise:** enabled (full + creator storefront)
- **Description:** Family-to-family marketplace for goods and services, backed by escrow system

#### ventures
- **Type:** `plan`
- **Free:** disabled
- **Pro:** enabled
- **Enterprise:** enabled
- **Description:** Kid-preneur venture creation with AI business plan generation, parent approval workflow, and Stripe escrow

#### messaging
- **Type:** `plan`
- **Free:** enabled (family only)
- **Pro:** enabled (family + approved contacts)
- **Enterprise:** enabled (unlimited contacts)
- **Safety gate:** AI safety scoring runs on all messages regardless of plan

#### evidenceGallery
- **Type:** `plan`
- **Free:** enabled (50MB storage)
- **Pro:** enabled (500MB)
- **Enterprise:** enabled (5GB)

#### weeklyPlan
- **Type:** `plan`
- **Free:** enabled (1 AI draft/week)
- **Pro:** enabled (unlimited drafts)
- **Enterprise:** enabled (unlimited + batch generation)

#### futureSelf
- **Type:** `plan`
- **Free:** disabled
- **Pro:** enabled (4 simulations/month)
- **Enterprise:** enabled (unlimited)
- **Description:** AI-generated Future Self letters, visualizations, and career trajectory simulations

#### safetyMonitor
- **Type:** `boolean`
- **Global:** enabled for all users
- **Description:** Real-time safety scoring (`SafetyScore` model), messaging content analysis, and biometric anomaly detection. Always-on for regulatory compliance.

#### achievementNFTs
- **Type:** `plan`
- **Free:** disabled
- **Pro:** disabled
- **Enterprise:** enabled (Polygon SBT minting)
- **Description:** Blockchain-anchored achievement badges as soulbound tokens via `blockchain.service.ts`

## 3. Plan-Based Gating

### Gating Strategy

Feature flags use a **plan inheritance model**: higher tiers inherit all capabilities of lower tiers, with additional features unlocked. The `FeatureFlag` `plan` type stores allowable plans as an array:

```json
// aiTutor flag value:
{ "plans": ["FREE", "PRO", "ENTERPRISE"] }

// biometric flag value:
{ "plans": ["PRO", "ENTERPRISE"] }

// achievementNFTs flag value:
{ "plans": ["ENTERPRISE"] }
```

### Middleware Integration

A `@FeatureFlag` decorator for NestJS resolvers gates GraphQL endpoints:

```typescript
// Decorator usage:
@Mutation(() => VentureType)
@UseGuards(GqlAuthGuard, FeatureFlagGuard)
@FeatureFlag('ventures')
async createVenture(@CurrentUser() user: any, @Args('data') data: CreateVentureInput) {
  return this.ventures.create(user.id, data);
}

// Guard implementation:
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private flags: FeatureFlagsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.get<string>('featureFlag', context.getHandler());
    if (!key) return true;
    
    const ctx = GqlExecutionContext.create(context);
    const { user } = ctx.getContext().req;
    
    return this.flags.isEnabled(key, {
      userId: user.userId,
      plan: user.plan || 'free',
      role: user.role
    });
  }
}
```

### Frontend Hook

A React hook provides client-side gating for conditional rendering:

```typescript
// apps/web/src/hooks/useFeatureFlag.ts
import { useQuery } from '@apollo/client';
import { GET_FEATURE_FLAGS } from '../lib/queries';

export function useFeatureFlag(key: string): { enabled: boolean; loading: boolean } {
  const { data, loading } = useQuery(GET_FEATURE_FLAGS, {
    variables: { keys: [key] },
    fetchPolicy: 'cache-and-network',
  });
  
  return {
    enabled: data?.featureFlags?.[key]?.enabled ?? false,
    loading,
  };
}
```

Usage in components:

```tsx
function TutorPage() {
  const { enabled, loading } = useFeatureFlag('aiTutor');
  
  if (loading) return <Spinner />;
  if (!enabled) return <UpgradePrompt plan="Pro" feature="AI Tutor" />;
  return <TutorSession />;
}
```

## 4. Implementation Approach

### Backend Middleware Chain

Request flow with feature flag enforcement:

```
HTTP Request
  → API Gateway (auth, rate limit)
    → NestJS GraphQL
      → GqlAuthGuard (JWT verification)
        → RolesGuard (RBAC)
          → FeatureFlagGuard (plan/percentage gate)
            → Resolver (business logic)
```

The `FeatureFlagGuard` is lazy: it only checks flags for operations that are explicitly decorated. Non-gated operations (e.g., profile updates, dashboard data) bypass evaluation entirely, keeping latency low.

### Redis Cache Invalidation

When an admin toggles a flag, the cache is invalidated:

```typescript
async setFlag(key: string, value: any): Promise<void> {
  // Write to PostgreSQL (source of truth)
  await this.prisma.featureFlag.upsert({
    where: { key },
    update: { value, updatedAt: new Date() },
    create: { key, type: 'boolean', value },
  });
  
  // Invalidate Redis cache
  await this.redis.del(`flag:${key}`);
}
```

### Rollout Strategy

| Rollout Phase | Percentage | Duration | Criteria |
|--------------|------------|----------|----------|
| Internal testing | 5% | 1 week | UDB team internal accounts |
| Beta | 25% | 2 weeks | Opt-in beta testers |
| Gradual rollout | 50% → 75% → 100% | 2 weeks | Monitoring error rates + latency |
| Full release | 100% | Permanent | Flag becomes permanent feature, removed from system |

## 5. Example Flag Definitions with Rollout Percentages

### Rollout via Percentage Flags

For staged rollouts, the flag type is `percentage` and can be updated gradually:

```json
// Week 1 — internal only
{ "key": "newEvidenceGallery", "type": "percentage", "value": { "pct": 5 } }

// Week 2 — beta
{ "key": "newEvidenceGallery", "type": "percentage", "value": { "pct": 25 } }

// Week 3 — gradual
{ "key": "newEvidenceGallery", "type": "percentage", "value": { "pct": 50 } }

// Week 4 — full
{ "key": "newEvidenceGallery", "type": "percentage", "value": { "pct": 100 } }
```

### User-Targeted Flags

For beta testers or specific families:

```json
{
  "key": "earlyAccessMarketplace",
  "type": "user",
  "value": {
    "userIds": [
      "uuid-beta-tester-1",
      "uuid-beta-tester-2",
      "uuid-beta-tester-3"
    ]
  }
}
```

### Full Flag Catalog (Default State)

```json
[
  { "key": "aiTutor",           "type": "plan", "value": { "plans": ["FREE","PRO","ENTERPRISE"] },       "description": "AI tutoring across subjects" },
  { "key": "biometricTracking", "type": "plan", "value": { "plans": ["PRO","ENTERPRISE"] },              "description": "Apple Health, Oura, Google Fit" },
  { "key": "marketplace",       "type": "plan", "value": { "plans": ["FREE","PRO","ENTERPRISE"] },        "description": "Family marketplace (browse=free, buy=pro)" },
  { "key": "ventures",          "type": "plan", "value": { "plans": ["PRO","ENTERPRISE"] },               "description": "Kid-preneur venture creation" },
  { "key": "messaging",         "type": "plan", "value": { "plans": ["FREE","PRO","ENTERPRISE"] },        "description": "In-app family messaging" },
  { "key": "evidenceGallery",   "type": "plan", "value": { "plans": ["FREE","PRO","ENTERPRISE"] },        "description": "Quest evidence uploads" },
  { "key": "weeklyPlan",        "type": "plan", "value": { "plans": ["FREE","PRO","ENTERPRISE"] },        "description": "AI weekly plan generation" },
  { "key": "futureSelf",        "type": "plan", "value": { "plans": ["PRO","ENTERPRISE"] },               "description": "Future Self simulations" },
  { "key": "safetyMonitor",     "type": "boolean", "value": { "enabled": true },                         "description": "Real-time safety monitoring (always on)" },
  { "key": "achievementNFTs",   "type": "plan", "value": { "plans": ["ENTERPRISE"] },                    "description": "Blockchain SBT minting" }
]
```

### Admin API

Flags are managed via the admin console at `/dashboard/admin/features` with GraphQL mutations:

```graphql
mutation UpdateFeatureFlag($key: String!, $value: JSON!, $type: String!) {
  updateFeatureFlag(key: $key, value: $value, type: $type) {
    key
    value
    updatedAt
  }
}

query GetFeatureFlags {
  featureFlags {
    key
    type
    value
    description
    updatedAt
  }
}
```

This system provides a flexible, performant, and auditable feature flag infrastructure that supports gradual rollouts, plan-based gating, and targeted beta testing without requiring application redeploys.
