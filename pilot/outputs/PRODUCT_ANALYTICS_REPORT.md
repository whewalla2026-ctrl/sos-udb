# Product Analytics Report — UDB Platform

## Architecture

### Event Flow

```
Frontend (apps/web)
  ↓ trackEvent('quest_complete', { questId: '...' })
  ↓ POST /monitoring/signal { signal: 'analytics_event', payload: { event, metadata, timestamp } }
  ↓ AuthGuard('jwt') verifies Bearer token
  ↓ MonitoringController delegates to AnalyticsService.recordEvent()
  ↓ Prisma: INSERT INTO analytics_events (user_id, event, metadata, created_at)
```

### Storage

- **Table:** `analytics_events` (Prisma model `AnalyticsEvent`)
- **Index:** `(event, created_at)` for feature usage queries, `(user_id, created_at)` for per-user queries
- **User activity:** `users.last_seen_at` column for DAU/WAU/MAU calculations
- **Onboarding progress:** `onboarding_status` table for funnel analysis

### Backend Components

| File | Purpose |
|------|---------|
| `services/api/src/analytics/analytics.service.ts` | Core analytics logic: event recording, metric computations |
| `services/api/src/analytics/analytics.resolver.ts` | GraphQL resolver — admin-only queries |
| `services/api/src/analytics/analytics.module.ts` | NestJS module wiring |
| `services/api/src/monitoring/monitoring.controller.ts` | REST endpoint `POST /monitoring/signal` for frontend event ingestion |
| `services/api/src/monitoring/monitoring.module.ts` | NestJS module wiring |

### Frontend Components

| File | Purpose |
|------|---------|
| `apps/web/src/lib/analytics.ts` | `trackEvent()` helper — fires and forgets analytics events to the backend |
| `apps/web/src/app/dashboard/analytics/page.tsx` | My Activity page — personal stats, feature usage, progress charts |
| `apps/web/src/lib/queries.ts` | GET_ANALYTICS_OVERVIEW GraphQL query |

---

## Tracked Events

Events are recorded via `trackEvent(event, metadata)` in the frontend:

| Event | Trigger | Metadata |
|-------|---------|----------|
| `signup` | User registration | `{ method: 'google' / 'email' }` |
| `login` | User login | `{ provider: 'firebase' }` |
| `onboarding_step` | Onboarding progress | `{ step: 1-5 }` |
| `onboarding_complete` | Onboarding finished | `{ skipped: false }` |
| `profile_update` | Profile edited | `{ fields: [...] }` |
| `quest_create` | New quest created | `{ pillar, title }` |
| `quest_complete` | Quest submitted | `{ questId, pillar }` |
| `goal_create` | Goal created | `{ pillar, title }` |
| `goal_complete` | Goal achieved | `{ goalId }` |
| `doter_named` | Doter avatar named | `{ name }` |
| `billing_view` | Billing page visited | `{ page }` |
| `billing_subscription_created` | Subscription started | `{ plan, amount }` |
| `billing_subscription_cancelled` | Subscription ended | `{ plan }` |
| `feature_used` | Any feature interaction | `{ feature, section }` |
| `ai_tutor_session` | AI tutor session | `{ subject, duration }` |
| `activity_logged` | Activity tracking | `{ pillar, duration }` |

---

## Metric Definitions

### DAU (Daily Active Users)
- **Definition:** Number of unique users with `lastSeenAt >= start of today`
- **Query:** `SELECT COUNT(*) FROM users WHERE last_seen_at >= CURRENT_DATE`
- **Source:** `User.lastSeenAt` field

### WAU (Weekly Active Users)
- **Definition:** Number of unique users with `lastSeenAt` in the last 7 days
- **Query:** `SELECT COUNT(*) FROM users WHERE last_seen_at >= CURRENT_DATE - 6`

### MAU (Monthly Active Users)
- **Definition:** Number of unique users with `lastSeenAt` in the last 30 days
- **Query:** `SELECT COUNT(*) FROM users WHERE last_seen_at >= CURRENT_DATE - 29`

### Signup Funnel
- **Steps:** Signed Up → Onboarding Started → Profile Complete → First Quest Done
- **Source:** `OnboardingStatus` model and `User.createdAt`
- **Conversion rate:** Step count / total signups in period

### Onboarding Completion Rate
- **Definition:** Percentage of users who completed onboarding
- **Source:** `onboarding_status.completed = true`
- **Formula:** `completed / total`

### Retention (Day-N)
- **Definition:** For the signup cohort, % of users who performed any event on day N after signup
- **Days tracked:** 1, 3, 7, 14, 30
- **Source:** `AnalyticsEvent.createdAt` joined with `User.createdAt`
- **Formula:** `users_active_on_day_N / total_users_in_cohort`

### Churn Rate
- **Definition:** % of users (created >30 days ago) who haven't been seen in 30+ days
- **Source:** `User.lastSeenAt`
- **Formula:** `churned_users / total_users_older_than_30d`

### Churn Indicators
- **Definition:** List of users whose `lastSeenAt` is older than N days
- **Use:** Re-engagement targeting

### Billing Conversion
- **Definition:** % of users who have a paid subscription
- **Source:** `AnalyticsEvent where event = 'billing_subscription_created'`
- **Formula:** `paid_users / total_users`

### Activation Metrics
- Onboarding completed: `onboarding_status.completed = true`
- Doter named: `doter_profiles.name != 'My Doter'`
- Quest created: distinct user IDs in `quests`
- Quest completed: `quests.status = 'APPROVED'`

---

## Admin Dashboard Additions

The admin dashboard (`/dashboard/admin`) now includes three new analytics sections:

### Signup Funnel (Last 30 Days)
Horizontal progress bars showing count and conversion rate for:
- Signed Up → Onboarding → First Quest → Active User

### Day-N Retention Chart
Bar chart showing retention percentages for Day 1, 3, 7, 14, 30.

### Activation Metrics
Progress bars for:
- Onboarding Completed
- Doter Named
- Quest Created
- Quest Completed

### Mock Data
All admin analytics use mock data with realistic values. The `AdminDashboard` component accepts `funnel`, `retention`, and `activationMetrics` arrays in its `data` prop.

---

## Frontend Analytics Tracker

**File:** `apps/web/src/lib/analytics.ts`

```typescript
export function trackEvent(event: string, metadata?: Record<string, any>) {
  var token = localStorage.getItem('accessToken');
  if (!token) return;
  fetch('http://localhost:3000/monitoring/signal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ signal: 'analytics_event', payload: { event, metadata: metadata || {}, timestamp: new Date().toISOString() } }),
  }).catch(function() {});
}
```

**Usage:**
```typescript
import { trackEvent } from '../../lib/analytics';

trackEvent('quest_complete', { questId: 'abc123', pillar: 'ACADEMIC' });
trackEvent('login', { provider: 'firebase' });
```

**Design:**
- Fire-and-forget (no `await`, `.catch(() => {})`)
- Reads JWT from `localStorage`
- Sends to `POST /monitoring/signal` with Auth header
- Backend validates JWT via Passport `AuthGuard('jwt')`
- If no token (unauthenticated), event is silently dropped

---

## My Activity Page

**Route:** `/dashboard/analytics`
**File:** `apps/web/src/app/dashboard/analytics/page.tsx`

Shows per-user analytics with mock data:
- **Personal Stats:** Quests completed, goals set, days active, streak
- **Weekly Activity:** Area chart of daily activity counts
- **Feature Usage:** Horizontal bar chart of most-used features
- **Progress Over Time:** Line chart tracking quests, goals, and XP

---

## GraphQL API

### Queries (Admin-only, `@Roles(ADMIN)`)

| Query | Returns | Description |
|-------|---------|-------------|
| `analyticsOverview` | `AnalyticsOverviewType` | DAU, WAU, MAU, totalUsers, signupsToday, onboardingCompletionRate, churnRate |
| `analyticsRetention(days)` | `RetentionType` | day1, day3, day7, day14, day30 retention rates |
| `analyticsFeatureUsage(feature, days)` | `[FeatureUsageType]` | Usage count per event name |
| `analyticsFeatureUsageDaily(feature, days)` | `[FeatureUsageDailyType]` | Daily breakdown |
| `analyticsSignupFunnel(days)` | `[FunnelStepType]` | Funnel steps with counts and conversion rates |
| `analyticsDAU(days)` | `[DAUType]` | DAU time series |
| `analyticsWAU(weeks)` | `[WAUType]` | WAU time series |
| `analyticsMAU(months)` | `[MAUType]` | MAU time series |
| `analyticsOnboardingCompletion` | `OnboardingCompletionType` | Onboarding stats |
| `analyticsChurnIndicators(days)` | `[ChurnIndicatorType]` | At-risk users |
| `analyticsBillingConversion` | `BillingConversionType` | Free → paid rate |
| `analyticsActivationMetrics` | `ActivationMetricsType` | Key activation rates |

---

## Setup

After deploying this code:

1. **Generate Prisma client:**
   ```bash
   cd services/api
   npx prisma generate
   ```

2. **Run migration:**
   ```bash
   npx prisma migrate dev --name add_analytics_events
   ```

3. **Add analytics tracking to frontend features:**
   ```typescript
   import { trackEvent } from '../../lib/analytics';
   // Call trackEvent() at key user actions
   ```

4. **Verify:** Check that `POST /monitoring/signal` returns `{ ok: true }` when called with a valid JWT.

---

## Future Enhancements

- **Cohort analysis:** Retention by signup week
- **Funnel segmentation:** By role (PARENT vs CHILD), by tenant
- **Real-time dashboard:** WebSocket push for live metrics
- **Export:** CSV/JSON export of analytics data
- **Prometheus metrics:** Expose DAU/WAU/MAU as Prometheus gauges
- **Scheduled reports:** Weekly email digests via `@nestjs/schedule`
