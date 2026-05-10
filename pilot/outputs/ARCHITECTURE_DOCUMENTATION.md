# UDB Platform — Architecture Documentation

**Version:** 1.0.0  
**Last Updated:** 2026-05-09  
**Repository Root:** `D:\SOS-UDB`

---

## 1. System Architecture Overview

The Unified Developmental Backbone (UDB) is a microservice-based platform for adolescent development, gamification, academic planning, biometric tracking, and entrepreneurship. It runs 14 Docker containers across three architectural planes: **infrastructure services**, **UDB microservices**, and **observability stack**.

### 1.1 High-Level Container Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                               INTERNET                                      │
└──────────────────────────┬──────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐   NEXT_PUBLIC_API_URL=http://localhost:3000/graphql       │
│  │  udb-frontend │   Next.js 14 · Port 3030 · apps/web/src/                │
│  │  (Next.js)    │   Pages: dashboard/*, auth/                             │
│  └──────┬───────┘   Components: ChildDashboard, ParentDashboard, Sidebar   │
│         │           Apollo Client → Gateway (port 3000)                    │
│         ▼                                                                   │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                     udb-gateway (Express)                            │  │
│  │  Port 3000 · services/api/prisma/phase3/gateway.js                   │  │
│  │  • JWT verification (verifyToken)                                    │  │
│  │  • Cross-tenant isolation (enforceTenantAccess)                      │  │
│  │  • Circuit breakers per downstream service (5 failure threshold)     │  │
│  │  • Rate limiting (200 req/min global, 100 req/min API)               │  │
│  │  • Brute-force protection (Redis-backed, 10 req/min per IP)          │  │
│  │  • Correlation ID propagation (x-correlation-id)                     │  │
│  │  • OpenTelemetry tracing instrumentation                             │  │
│  └───┬─────┬─────┬─────┬─────┬──────────────────────────────────────────┘  │
│      │     │     │     │     │                                              │
│      ▼     ▼     ▼     ▼     ▼                                              │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌──────────┐                                 │
│  │Auth│ │Plnr│ │ AI │ │Mon │ │ udb-nestjs│                                 │
│  │:300│ │:302│ │:303│ │:304│ │ (NestJS)   │                                 │
│  │   1│ │   2│ │   3│ │   4│ │ Port 4000   │                                 │
│  └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ │ GraphQL    │                                 │
│    │      │      │      │     │ 21 modules  │                                 │
│    │      │      │      │     └──────┬──────┘                                 │
│    └──────┴──────┴──────┴────────────┘                                       │
│                                    │                                          │
│                                    ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              udb-pgbouncer (PgBouncer 1.22.1)                       │  │
│  │  Port 6432 · pgbouncer/ · Connection pooling for PostgreSQL         │  │
│  └──────────────────────────┬───────────────────────────────────────────┘  │
│                             ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              udb-postgres (PostgreSQL 16 Alpine)                     │  │
│  │  Port 5432 · prisma/schema.prisma (21 models, 13 enums)             │  │
│  │  Databases: udb (primary), postgres_data volume                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              udb-redis (Redis 7 Alpine)                              │  │
│  │  Port 6379 · AOF persistence (save 60 1, save 300 10)               │  │
│  │  Uses: Session state, rate limiting, token blacklist, queue,         │  │
│  │         event bus pub/sub, AI budget tracking, planner cache,        │  │
│  │         idempotency cache, brute-force counters, audit log           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ udb-jaeger │  │ udb-otel-  │  │ udb-       │  │ udb-grafana│    │  │
│  │  │ :16686     │◄─│ collector  │  │ prometheus │──►│ :3005      │    │  │
│  │  │ Distributed │  │ :4318      │  │ :9090      │  │ Dashboards │    │  │
│  │  │ Tracing    │  │ OTLP HTTP  │  │ Scrapes    │  │ Provisioned│    │  │
│  │  └────────────┘  └────────────┘  │ all 6 udb  │  │ datasources│    │  │
│  │                                   │ services   │  └────────────┘    │  │
│  │                                   └────────────┘                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Network Architecture

All 14 containers reside on a single Docker bridge network (default `docker-compose` network). Internal service discovery uses container names (e.g., `http://auth-service:3001`). Only four ports are exposed to the host:

| Host Port | Container | Purpose |
|-----------|-----------|---------|
| 3000 | gateway | API Gateway (external entry) |
| 3030 | frontend | Next.js web app |
| 4000 | nestjs-graphql | GraphQL API (internal/direct access) |
| 3005 | grafana | Observability dashboards |
| 16686 | jaeger | Distributed tracing UI |
| 9090 | prometheus | Metrics (internal) |

PostgreSQL (5432), Redis (6379), and pgBouncer (6432) are **not exposed** to the host — they communicate exclusively via the internal Docker network.

---

## 2. Service Map

### 2.1 Infrastructure Services

| # | Container | Image/Base | Port | Dependencies | Health Check |
|---|-----------|-----------|------|--------------|-------------|
| 1 | **udb-postgres** | `postgres:16-alpine` | 5432 | — | `pg_isready` |
| 2 | **udb-pgbouncer** | Custom (pgbouncer/Dockerfile) | 6432 | postgres | `pg_isready -p 6432` |
| 3 | **udb-redis** | `redis:7-alpine` | 6379 | — | `redis-cli ping` |

**pgBouncer Configuration** (`pgbouncer/`):  
- Listens on port 6432, connects to postgres:5432  
- Provides transaction-level pooling for all 6 UDB application services  
- All Prisma clients connect via `DATABASE_URL=postgresql://udb:${DB_PASSWORD}@pgbouncer:6432/udb`  

**Redis Configuration** (`docker-compose.prod.yml:49`):  
- AOF persistence: `--appendonly yes --save 60 1 --save 300 10`  
- Max memory: 256M limit, 128M reservation  
- Used by all 6 UDB services via `ioredis` for:  
  - Session state / token blacklist (`redis-state.js`)  
  - Distributed rate limiting (sliding window sorted sets)  
  - Brute-force counters (per-IP per-minute)  
  - AI budget tracking (`aispend:{userId}`)  
  - Planner cache (`plan:{userId}`, 10-min TTL)  
  - Idempotency cache (24h TTL)  
  - Event bus pub/sub (`events:*` lists)  
  - Job queue (`queue:*` / `dlq:*`)  
  - Monitoring signals and alerts  
  - Audit log (7-day retention)  

### 2.2 UDB Microservices

| # | Container | Framework | Port | Source | Dependencies | Mem Limit |
|---|-----------|-----------|------|--------|-------------|-----------|
| 4 | **udb-auth** | Express | 3001 | `services/api/prisma/phase3/services/auth-service.js` | Redis, PostgreSQL | 256M |
| 5 | **udb-gateway** | Express | 3000 | `services/api/prisma/phase3/gateway.js` | Redis, PostgreSQL | 256M |
| 6 | **udb-nestjs** | NestJS+GraphQL | 4000 | `services/api/src/main.ts` → `AppModule` | Redis, PostgreSQL | 512M |
| 7 | **udb-frontend** | Next.js 14 | 3030 | `apps/web/src/` | Gateway | 256M |
| 8 | **udb-planner** | Express | 3002 | `services/api/prisma/phase3/services/planner-service.js` | Redis, PostgreSQL | 256M |
| 9 | **udb-ai** | Express | 3003 | `services/api/prisma/phase3/services/ai-service.js` | Redis, PostgreSQL | 256M |
| 10 | **udb-monitoring** | Express | 3004 | `services/api/prisma/phase3/services/monitoring-service.js` | Redis, PostgreSQL | 256M |

#### 2.2.1 udb-auth (Port 3001)
**Source:** `services/api/prisma/phase3/services/auth-service.js`  
**Dockerfile:** `services/api/prisma/phase3/Dockerfile.auth`  

Endpoints:
- `POST /auth/register` — Register with email/password (rate limited: 30/min), creates user in PostgreSQL + Redis credential cache, issues JWT + refresh token
- `POST /auth/login` — Authenticate with email/password, verifies against Redis cache then PostgreSQL, issues JWT (300s expiry) + refresh token (86400s expiry)
- `POST /auth/refresh` — Refresh token rotation with SHA-256 hash replay detection
- `POST /auth/logout` — Blacklists JWT in Redis
- `GET /auth/me` — Returns current user from session
- `GET /auth/health` — Health check

Key architectural decisions:
- Password hashing uses `crypto.scryptSync` with 16-byte salt, stored as `salt:hash` in Redis
- JWT is HMAC-SHA256 (no library dependency, `security.js:10-15`)
- Refresh token uses SHA-256 hash stored in Redis with 24h TTL — replay detection via `refresh_replay_rejection_total` metric
- Mass assignment protection: register endpoint explicitly destructures only `email`, `password`, `displayName` — never `role`

#### 2.2.2 udb-gateway (Port 3000)
**Source:** `services/api/prisma/phase3/gateway.js`  
**Dockerfile:** `services/api/prisma/phase3/Dockerfile.gateway`  

The gateway is the **single entry point** for all external traffic. It proxies to four downstream services:

```javascript
const SERVICES = {
  auth:       { host: process.env.AUTH_SERVICE_HOST || 'localhost', port: 3001 },
  planner:    { host: process.env.PLANNER_SERVICE_HOST || 'localhost', port: 3002 },
  ai:         { host: process.env.AI_SERVICE_HOST || 'localhost', port: 3003 },
  monitoring: { host: process.env.MONITORING_SERVICE_HOST || 'localhost', port: 3004 },
};
```
(`gateway.js:20-25`)

Middleware stack (order matters):
1. `helmet` — CSP, HSTS (1 year), frameguard, referrer policy
2. `cors` — Origin-restricted, credentials enabled
3. `compression` — Gzip
4. `express.json` — 100kb body limit
5. `correlationId` — x-correlation-id propagation
6. `metricsMiddleware` — Prometheus HTTP metrics
7. `bruteForceProtect` — Per-IP Redis-backed (10 req/min)
8. `globalRateLimit` — 200 req/min
9. `verifyToken` — JWT validation + token blacklist check
10. `enforceTenantAccess` — Cross-tenant isolation (403 if `req.params.userId !== req.user.userId`)

Route proxying (`gateway.js:114-150`):
- `POST /auth/*`, `GET /auth/*` → auth-service
- `POST /planning/*`, `GET /planning/*` → planner-service  
- `POST /ai-lite/*`, `GET /ai-lite/*` → ai-service
- `GET /monitoring/*` → monitoring-service
- `GET /gateway/health`, `GET /gateway/metrics` → local handlers

Each proxy call wraps through a **CircuitBreaker** (`shared/circuit-breaker.js`):
- CLOSED → OPEN: 5 failures, 30s cooldown
- OPEN → HALF_OPEN: After cooldown, 1 probe request
- HALF_OPEN → CLOSED: 2 consecutive successes

#### 2.2.3 udb-nestjs (Port 4000)
**Source:** `services/api/src/main.ts`, `services/api/src/app.module.ts`  
**Dockerfile:** `services/api/Dockerfile` (multi-stage: builder + runner)

The NestJS application is the **GraphQL API** layer, using Apollo Driver with code-first schema generation. It registers 21 feature modules:

| Module | Source | Domain |
|--------|--------|--------|
| `PrismaModule` | `prisma/prisma.module.ts` | Database ORM |
| `RedisModule` | `redis/redis.module.ts` | Redis client (ioredis) |
| `AuthModule` | `auth/auth.module.ts` | Firebase + JWT auth |
| `UsersModule` | `users/users.module.ts` | User CRUD |
| `FamilyModule` | `family/family.module.ts` | Parent-child linking |
| `DoterModule` | `doter/doter.module.ts` | Gamified avatars |
| `QuestsModule` | `quests/quests.module.ts` | Quest lifecycle |
| `PointsModule` | `points/points.module.ts` | Points ledger |
| `GoalsModule` | `goals/goals.module.ts` | Goal tracking |
| `ActivitiesModule` | `activities/activities.module.ts` | Calendar events |
| `BiometricModule` | `biometric/biometric.module.ts` | Health data |
| `UupSyncModule` | `uup-sync/uup-sync.module.ts` | UUP sync |
| `AcademicModule` | `academic/academic.module.ts` | Academic tracking |
| `MessagingModule` | `messaging/messaging.module.ts` | Chat + safety |
| `EvidenceModule` | `evidence/evidence.module.ts` | Proof of work |
| `EntrepreneurshipModule` | `entrepreneurship/entrepreneurship.module.ts` | Ventures + escrow |
| `SafetyModule` | `safety/safety.module.ts` | Safety scores |
| `WeeklyPlanModule` | `weekly-plan/weekly-plan.module.ts` | Weekly planner |
| `NotificationsModule` | `notifications/notifications.module.ts` | Push/in-app |
| `AuditModule` | `audit/audit.module.ts` | WORM audit log |
| `AiModule` | `ai/ai.module.ts` | AI tutoring + coach |
| `BlockchainModule` | `blockchain/blockchain.module.ts` | SBT minting |
| `MarketplaceModule` | `marketplace/marketplace.module.ts` | Marketplace |
| `MetricsModule` | `shared/metrics.module.ts` | Prometheus metrics |

The GraphQL endpoint is at `POST /graphql` with `autoSchemaFile` generating `src/schema.gql`. Authentication uses a Passport JWT strategy (`auth/strategies/jwt.strategy.ts`) with Firebase Auth integration (`auth/strategies/firebase.strategy.ts`).

#### 2.2.4 udb-frontend (Port 3030)
**Source:** `apps/web/src/`  
**Dockerfile:** `apps/web/Dockerfile` (multi-stage)  
**Apollo Client:** `apps/web/src/lib/apollo-client.ts`  

Connects to the gateway at `NEXT_PUBLIC_API_URL=http://localhost:3000/graphql` (from `docker-compose.prod.yml:251`). The Apollo Client uses `localStorage` for JWT token management with an auth link that prepends `Authorization: Bearer <token>`.

Key pages:
- `/` — Landing page
- `/auth/login` — Login (`apps/web/src/app/auth/login/page.tsx`)
- `/auth/register` — Registration  
- `/auth/forgot-password` / `reset-password` — Password recovery
- `/dashboard` — Main dashboard (`dashboard/page.tsx`) with role-based rendering:
  - `ChildDashboard` — Doter avatar, XP/coins, streaks, activity feed
  - `ParentDashboard` — Family overview, child progress
- `/dashboard/doter` — Doter avatar management
- `/dashboard/quests` — Quest management
- `/dashboard/goals` — Goal tracking
- `/dashboard/academic` — Academic dashboard
- `/dashboard/biometric` — Biometric data
- `/dashboard/weekly-plan` — Weekly planner
- `/dashboard/family` — Family management (parent view)
- `/dashboard/messages` — Messaging with AI safety
- `/dashboard/safety` — Safety scores
- `/dashboard/evidence` — Evidence gallery
- `/dashboard/ventures` — Kid-preneur ventures
- `/dashboard/notifications` — Notifications
- `/dashboard/tutor` — AI Socratic tutor
- `/dashboard/joon-world` — Gamification world

#### 2.2.5 udb-planner (Port 3002)
**Source:** `services/api/prisma/phase3/services/planner-service.js`  

Endpoints:
- `POST /planning/generate` — Generates a daily plan with academic, biometric, and social activities. Idempotent (24h cache). Redis-backed plan cache (10-min TTL)
- `POST /planning/update` — Update plan activities
- `GET /planning/plan/:userId` — Retrieve cached plan
- `GET /planning/health` — Health check
- `GET /planning/metrics` — Prometheus metrics

Events published: `planner_created` (via event-bus)

#### 2.2.6 udb-ai (Port 3003)
**Source:** `services/api/prisma/phase3/services/ai-service.js`  

Endpoints:
- `POST /ai-lite/hint` — Generates a Socratic hint per subject (math, reading, science, or default). Budget-checked ($0.0004/hint, $0.50/user/month). Idempotent.
- `POST /ai-lite/batch` — Batch hint generation (max 10 per request)
- `GET /ai-lite/budget/:userId` — Returns current budget usage
- `POST /ai-lite/validate-proof` — AI-powered proof validation (confidence score)
- `GET /ai-lite/health` — Health check
- `GET /ai-lite/metrics` — Prometheus metrics

The NestJS AI module (`services/api/src/ai/ai.service.ts`) provides a more sophisticated Socratic tutor using Google Vertex AI (Gemini 1.5 Pro) with fallback to rule-based responses. It implements:
- Intent classification (WANTS_ANSWER, ON_TRACK, CONFUSED, OFF_TOPIC)
- Encouraging refusal for answer-seeking (never reveals final answer)
- Path-to-solution logging (FR-65.2)

#### 2.2.7 udb-monitoring (Port 3004)
**Source:** `services/api/prisma/phase3/services/monitoring-service.js`  

Endpoints:
- `GET /monitoring/health` — Aggregated health status (checks Redis connectivity)
- `GET /monitoring/signals` — 15 monitoring signals (latency p50/p95, error rate, active users, AI budget, queue depth, etc.)
- `GET /monitoring/alerts` — Alert history (Redis list)
- `POST /monitoring/alert` — Push new alert
- `GET /monitoring/audit` — Audit log retrieval
- `GET /monitoring/metrics` — Prometheus metrics

### 2.3 Observability Stack

| # | Container | Image | Port | Purpose |
|---|-----------|-------|------|---------|
| 11 | **udb-jaeger** | `jaegertracing/all-in-one:latest` | 16686 | Distributed tracing storage + UI |
| 12 | **udb-otel-collector** | `otel/opentelemetry-collector-contrib:latest` | 4318 | OTLP HTTP receiver, batch processor, export to Jaeger |
| 13 | **udb-prometheus** | `prom/prometheus:latest` | 9090 | Metrics storage (7-day retention) |
| 14 | **udb-grafana** | `grafana/grafana:latest` | 3005 | Pre-provisioned dashboards |

**OpenTelemetry Collector** (`infra/otel-collector/otel-collector-config.yml`):
```yaml
receivers:
  otlp:
    protocols:
      http: 0.0.0.0:4318
      grpc: 0.0.0.0:4317
exporters:
  otlp: jaeger:4317
  debug: detailed
processors:
  batch: { timeout: 1s, send_batch_size: 1024 }
```

**Prometheus** scrapes all 6 UDB services every 15s (`infra/prometheus/prometheus.yml`):
- `gateway:3000` → `api-gateway`
- `auth-service:3001` → `auth-service`
- `planner-service:3002` → `planner-service`
- `ai-service:3003` → `ai-service`
- `monitoring-service:3004` → `monitoring-service`
- `nestjs-graphql:4000` → `nestjs-graphql`

**Grafana** has two pre-provisioned dashboards (`infra/grafana/dashboards/`):
- `udb-overview.json` — System-wide health, request rates, error rates
- `udb-runtime.json` — Per-service runtime metrics, DB pool, Redis latency

---

## 3. Data Flow Diagrams

### 3.1 Authentication Flow

```
┌──────────┐    POST /auth/register      ┌───────────┐
│          │  ──────────────────────────► │           │
│ Frontend │    POST /auth/login          │  Gateway  │
│ (Next.js)│  ──────────────────────────► │  :3000    │
│          │    POST /auth/refresh        │           │
│  :3030   │  ◄────────────────────────── │           │
└──────────┘    { accessToken,            └─────┬─────┘
                 refreshToken,                  │
                 user }                         │ proxy to auth:3001
                                                ▼
                                        ┌───────────────┐
                                        │  Auth Service  │
                                        │   :3001        │
                                        │               │
                                        │ 1. Rate check  │
                                        │ 2. Validate    │
                                        │    email/pwd   │
                                        │ 3. Upsert user │
                                        │    in Postgres │
                                        │ 4. Cache creds │
                                        │    in Redis    │
                                        │ 5. Issue JWT   │
                                        │    (300s)      │
                                        │ 6. Issue       │
                                        │    refresh     │
                                        │    (86400s)    │
                                        │ 7. Audit log   │
                                        └───────┬───────┘
                                                │
                                ┌───────────────┼───────────────┐
                                ▼               ▼               ▼
                        ┌────────────┐  ┌────────────┐  ┌────────────┐
                        │ PostgreSQL │  │   Redis    │  │   Event    │
                        │  :5432     │  │   :6379    │  │   Bus      │
                        │  users     │  │  user:{id} │  │user_created│
                        │  audit_logs│  │  refresh:  │  └────────────┘
                        │  doter_    │  │  {id}:{h}  │
                        │  profiles  │  │  blacklist:│
                        └────────────┘  │  {hash}    │
                                        │  bruteforce│
                                        │  :{ip}:{m} │
                                        └────────────┘
```

**Step-by-step:**

1. User submits email + password on `apps/web/src/app/auth/login/page.tsx`
2. Apollo Client sends POST to gateway:3000 (`apps/web/src/lib/apollo-client.ts:8-12` adds JWT bearer if present)
3. Gateway applies middleware stack: helmet → cors → compression → rate limit → brute force check → routes to auth-service
4. Auth service (`auth-service.js:63-99`):
   - Rate limit (30 req/min)
   - Lookup user by email in PostgreSQL via Prisma
   - Retrieve password hash from Redis `user:{id}`
   - Verify password with `crypto.scryptSync`
   - Generate JWT: `createToken({ userId, role, email }, 300)` → HMAC-SHA256 base64url
   - Generate refresh token: `createRefreshToken(userId)` → SHA-256 hash stored in Redis
   - Create audit log entry in PostgreSQL via Prisma
5. Response flows back through gateway to frontend
6. Frontend stores token in `localStorage` for subsequent requests

### 3.2 Planner Flow

```
┌──────────┐  POST /planning/generate    ┌───────────┐
│ Frontend │  { userId, preferences }    │  Gateway  │
│  :3030   │  ──────────────────────────►│  :3000    │
└──────────┘                             └─────┬─────┘
      ▲                                        │
      │                                  verifyToken + proxy
      │                                        ▼
      │                               ┌─────────────────┐
      │                               │  Planner Service │
      │                               │   :3002          │
      │                               │                  │
      │                               │ 1. Check         │
      │                               │    idempotency   │
      │                               │    key (24h TTL) │
      │                               │ 2. Check Redis   │
      │                               │    plan:{userId} │
      │                               │    10-min cache  │
      │                               │ 3. Generate plan │
      │                               │ 4. Cache in Redis│
      │                               │ 5. Publish       │
      │                               │    planner_      │
      │                               │    created event │
      │                               │ 6. Enqueue       │
      │                               │    analytics job │
      └────────── { plan, cached } ◄──┴─────────────────┘
```

### 3.3 AI Hint Flow

```
┌──────────┐  POST /ai-lite/hint        ┌───────────┐
│ Frontend │  { userId, subject,        │  Gateway  │
│  :3030   │    question }              │  :3000    │
└──────────┘  ─────────────────────────►└─────┬─────┘
      ▲                                        │
      │                                  verifyToken + proxy
      │                                        ▼
      │                               ┌─────────────────┐
      │                               │   AI Service     │
      │                               │   :3003          │
      │                               │                  │
      │                               │ 1. Check         │
      │                               │    idempotency   │
      │                               │ 2. Get Redis     │
      │                               │    aispend:{id}  │
      │                               │ 3. Budget check  │
      │                               │    (<= $0.50/mo) │
      │                               │ 4. Increment     │
      │                               │    spend in Redis│
      │                               │ 5. Return hint   │
      │                               │    + cost info   │
      │                               │ 6. Publish       │
      │                               │    hint_generated│
      │                               │ 7. Enqueue       │
      │                               │    analytics job │
      └──── { hint, cost, budget } ◄──┴─────────────────┘
```

The NestJS AI service (`services/api/src/ai/ai.service.ts`) provides a more advanced Socratic tutor path:
1. Classify intent: WANTS_ANSWER, ON_TRACK, CONFUSED, OFF_TOPIC
2. If WANTS_ANSWER → encouraging refusal (never reveals answer)
3. Build system prompt with subject-specific context
4. Call Vertex AI Gemini 1.5 Pro → get scaffolded response
5. Log path-to-solution for mastery tracking (FR-65.2)

### 3.4 Dashboard Data Flow

```
┌──────────┐  GraphQL Query            ┌────────────┐
│ Frontend │  { GET_DASHBOARD_DATA }   │  Gateway    │
│  :3030   │  ────────────────────────►│  :3000      │
│          │                           │  (proxies   │
│          │                           │   GraphQL   │
│          │                           │   to NestJS)│
└──────────┘                           └─────┬──────┘
      ▲                                      │
      │                                      ▼
      │                              ┌────────────────┐
      │                              │  NestJS GraphQL│
      │                              │  :4000          │
      │                              │                 │
      │                              │ Resolvers:      │
      │                              │ - user()        │
      │                              │ - doterProfile()│
      │                              │ - quests()      │
      │                              │ - goals()       │
      │                              │ - activities()  │
      │                              │ - streaks()     │
      │                              │ - notifications()│
      │                              └────────┬───────┘
      │                                       │
      │                              ┌────────┴────────┐
      │                              │     Prisma       │
      │                              │  + Redis cache   │
      │                              └─────────────────┘
      │
      └── { user, doter, quests, goals, activities } ──┘
```

The GraphQL query joins data from 7+ tables via Prisma, with Redis caching for frequently accessed data (doter profiles, streaks).

---

## 4. Database Schema Overview

### 4.1 Schema Location

The canonical Prisma schema is at `D:\SOS-UDB\prisma\schema.prisma` (76 lines containing the Phase 2 legacy models). The full Phase 3 schema with 21 models and 13 enums is at `D:\SOS-UDB\services\api\prisma\schema.prisma` (668 lines).

### 4.2 Enums (13 total)

| Enum | Values | Used By |
|------|--------|---------|
| `UserRole` | `PARENT`, `CHILD`, `ADMIN` | User |
| `DoterState` | `EGG`, `HATCHLING`, `JUVENILE`, `ADOLESCENT`, `ADULT`, `LEGENDARY` | DoterProfile |
| `QuestStatus` | `PENDING`, `IN_PROGRESS`, `SUBMITTED`, `APPROVED`, `REJECTED`, `EXPIRED` | Quest |
| `QuestPillar` | `ACADEMIC`, `BIOMETRIC`, `GAMIFICATION`, `ENTREPRENEURSHIP`, `SOCIAL`, `LIFE_SKILLS` | Quest, Goal, Streak, Activity, SkillGap, Achievement |
| `TransactionType` | `EARN`, `SPEND`, `REVERSE`, `ESCROW_HOLD`, `ESCROW_RELEASE` | PointsLedger |
| `TransactionSource` | `QUEST`, `MANUAL_AWARD`, `ESCROW`, `PURCHASE`, `BONUS`, `STREAK_REWARD` | PointsLedger |
| `TransactionStatus` | `PENDING`, `SETTLED`, `REVERSED` | PointsLedger |
| `GoalStatus` | `ACTIVE`, `COMPLETED`, `PAUSED`, `ARCHIVED` | Goal |
| `ActivityStatus` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Activity |
| `MessageStatus` | `SENT`, `DELIVERED`, `READ` | Message |
| `VentureStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `COMPLETED` | Venture |
| `EscrowStatus` | `HELD`, `PROOF_SUBMITTED`, `RELEASED`, `DISPUTED`, `REFUNDED` | Escrow |
| `BiometricSource` | `APPLE_HEALTH`, `OURA`, `GOOGLE_FIT`, `MANUAL`, `WEARABLE` | BiometricLog |

### 4.3 Models (21 total)

#### 4.3.1 Core Identity

**User** (`schema.prisma:118-184`, table `users`)
- Primary model with UUID primary key
- `firebaseUid` — unique Firebase Authentication ID
- `role` — PARENT | CHILD | ADMIN (enum)
- `uupData` — JSONB for Unified User Profile (gamification, academic, biometric, entrepreneurship, metadata)
- `coppaConsentVerified`, `coppaConsentDate`, `gdprDeleteRequested` — COPPA/GDPR compliance
- `accessibilitySettings` — JSONB for dyslexia mode, high contrast, TTS, font size
- Relations: FamilyLink (parent/child), DoterProfile, Quest, PointsLedger, Goal, Streak, Activity, LmsConnection, SkillGap, TutoringSession, BiometricLog, Message (sent/received), EvidenceItem, Venture, Escrow, SafetyScore, AuditLog, Notification

#### 4.3.2 Family

**FamilyLink** (`schema.prisma:188-201`, table `family_links`)
- Links parent to child with consent verification
- Unique constraint on `(parentId, childId)`
- `consentMethod`: CREDIT_CARD | ID_CHECK

#### 4.3.3 Gamification

**DoterProfile** (`schema.prisma:205-232`, table `doter_profiles`)
- One-to-one with User
- State machine: EGG → HATCHLING → JUVENILE → ADOLESCENT → ADULT → LEGENDARY
- `isSluggy` flag (sleep < 6h), `isEnergetic` flag
- `debuffs`, `buffs` — JSON arrays for status effects
- `evolutionHistory` — JSON array tracking state changes
- `skinId`, `accessories` — Visual customization

**Quest** (`schema.prisma:236-276`, table `quests`)
- Full lifecycle: PENDING → IN_PROGRESS → SUBMITTED → APPROVED/REJECTED/EXPIRED
- Pillar-based classification
- AI verification: `aiConfidence`, `aiVerified`
- Micro-quest chunking: `isChunk`, `parentQuestId`, `chunkIndex` (ADHD support)
- Self-referential relation: `Quest → Quest[]` (chunks)

**PointsLedger** (`schema.prisma:280-297`, table `points_ledger`)
- Immutable ledger (no updatedAt — FR-38.1)
- `balanceAfter` for transaction history
- `sourceId` polymorphic reference to source entity
- Connection to Achievement/SBT system

**Goal** (`schema.prisma:301-321`, table `goals`)
- Status lifecycle: ACTIVE → COMPLETED/PAUSED/ARCHIVED
- `targetWeight` / `currentWeight` for progress tracking
- `certificateUrl` for verifiable completion
- Linked to Quests via `goalId`

**Streak** (`schema.prisma:361-377`, table `streaks`)
- Per-pillar streaks with `currentDays`, `longestDays`
- `freezeCount` for streak freeze mechanic (UC-051)
- Unique constraint on `(userId, pillar)`

#### 4.3.4 Calendar

**Activity** (`schema.prisma:325-357`, table `activities`)
- Scheduling with `startTime`, `endTime`
- `rrule` for recurring events (RFC 5545)
- Version history for conflict resolution (UC-014)
- `isDeepWork` flag for focus tracking
- Links to Quest and Goal

#### 4.3.5 Academic

**LmsConnection** (`schema.prisma:381-399`, table `lms_connections`)
- Provider: GOOGLE_CLASSROOM | CANVAS | MOODLE
- OAuth token management with refresh
- `syncStatus` for incremental sync

**LmsAssignment** (`schema.prisma:401-420`, table `lms_assignments`)
- Synced assignments with `difficulty` (AI-predicted workload 0-1)
- Grade tracking

**SkillGap** (`schema.prisma:424-439`, table `skill_gaps`)
- Per-subject gap analysis (0.0 critical → 1.0 mastered)
- `ritScore` for NWEA MAP Growth integration
- Unique constraint on `(userId, subject)`

**TutoringSession** (`schema.prisma:443-458`, table `tutoring_sessions`)
- Socratic tutor session logs (JSON array of `{role, content, timestamp}`)
- `pathToSolution` — chronological problem-solving steps (FR-65.2)
- `masteryGained` — delta mastery from session

#### 4.3.6 Biometric

**BiometricLog** (`schema.prisma:462-479`, table `biometric_logs`)
- Multi-source: Apple Health, Oura, Google Fit, Manual, Wearable
- `sleepHours`, `hrv`, `stressLevel`, `focusScore`, `heartRate`, `steps`
- Composite index on `(userId, loggedAt)`

#### 4.3.7 Social

**Message** (`schema.prisma:483-500`, table `messages`)
- AI safety screening: `isSafe`, `safetyScore`
- `isAiMessage` for Life Coach messages
- Status flow: SENT → DELIVERED → READ

**EvidenceItem** (`schema.prisma:504-522`, table `evidence_items`)
- Proof-of-work gallery: IMAGE | VIDEO | TEXT | DOCUMENT
- `aiProTip` — AI-generated feedback
- `comments` — JSON array of threaded comments
- Links to Quest

#### 4.3.8 Entrepreneurship

**Venture** (`schema.prisma:526-554`, table `ventures`)
- Kid-preneur business model: problem, solution, target market, pricing, revenue
- `parentApproved`, `parentApprovedAt` for parental oversight
- `totalRevenue` tracking

**Escrow** (`schema.prisma:558-578`, table `escrows`)
- Stripe PaymentIntent integration
- Status machine: HELD → PROOF_SUBMITTED → RELEASED/DISPUTED/REFUNDED

#### 4.3.9 Achievements

**Achievement** (`schema.prisma:582-596`, table `achievements`)
- Soulbound Token (SBT) integration on Polygon
- `sbtTokenId`, `sbtContract` for on-chain verification
- `isMinted` flag

#### 4.3.10 Safety

**SafetyScore** (`schema.prisma:600-612`, table `safety_scores`)
- Composite score 0-100 with component breakdown (messaging, content, social)
- `alerts` — JSON array of active safety alerts
- Composite index on `(userId, recordedAt)`

#### 4.3.11 Planning

**WeeklyPlan** (`schema.prisma:616-629`, table `weekly_plans`)
- AI-generated draft + final plan
- `focusPillars` — user-selected focus areas
- `isFinalized` state flag

#### 4.3.12 Notifications

**Notification** (`schema.prisma:633-647`, table `notifications`)
- Typed notifications: LOW_SLEEP_ALERT, QUEST_COMPLETE, SKILL_GAP, SAFETY_ALERT, etc.
- `data` — JSON payload for routing/actions

#### 4.3.13 Audit

**AuditLog** (`schema.prisma:651-667`, table `audit_logs`)
- Write-Once-Read-Many (WORM) semantics — no updates, no cascading deletes
- `BigInt` auto-increment primary key
- `actorId`, `action`, `targetType`, `targetId`, `payload`, `ipAddress`, `userAgent`
- Composite indexes on `(actorId, createdAt)` and `(action, createdAt)`

### 4.4 Entity Relationship Summary

```
User ──1:1── DoterProfile
User ──1:N── FamilyLink (as parent) ──N:1── User (as child)
User ──1:N── Quest ──N:1── Goal
User ──1:N── PointsLedger
User ──1:N── Goal ──1:N── Quest
User ──1:N── Activity
User ──1:N── Streak (one per pillar)
User ──1:N── BiometricLog
User ──1:N── LmsConnection ──1:N── LmsAssignment
User ──1:N── SkillGap (one per subject)
User ──1:N── TutoringSession
User ──1:N── Message (sent/received)
User ──1:N── EvidenceItem ──N:1── Quest
User ──1:N── Venture ──1:N── Escrow
User ──1:N── SafetyScore
User ──1:N── Notification
User ──1:N── AuditLog
Quest ──1:N── Quest (chunks, self-referential)
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

**Three-Layer Auth:**

1. **Firebase Authentication** (external IdP):
   - Initiated in `auth.service.ts:18-31` with Firebase Admin SDK
   - `verifyFirebaseToken(idToken)` validates Firebase JWT
   - Used for social login, email/password, and phone auth

2. **UDB JWT** (internal):
   - Generated in `services/api/prisma/phase3/shared/security.js:10-15`
   - HMAC-SHA256 signed, base64url encoded (no external JWT library)
   - 300-second (5 min) expiry
   - Contains: `userId`, `role`, `email`, `jti`, `iat`, `exp`, `sub`
   - Blacklisted in Redis on logout (`blacklist:{sha256(token)}`)

3. **Role-Based Access Control**:
   - Gateway: `requireRole(...roles)` middleware (`security.js:45-54`)
   - NestJS: `RolesGuard` (`auth/guards/roles.guard.ts:8-23`) using `@Roles()` decorator and `Reflector`
   - Role hierarchy in `security.js:38-39`: ADMIN(4) > TEACHER(3) > PARENT(2) > CHILD(1)

### 5.2 Tenant Isolation

The `enforceTenantAccess` middleware in `gateway.js:66-71` prevents cross-tenant data access:

```javascript
function enforceTenantAccess(req, res, next) {
  if (req.params.userId && req.user && req.params.userId !== req.user.userId) {
    return res.status(403).json({ error: 'Cross-tenant access denied' });
  }
  next();
}
```

This ensures a child user cannot access another child's data even with a valid JWT. The NestJS GraphQL layer enforces the same via the `GqlAuthGuard` and `CurrentUser` decorator.

### 5.3 Rate Limiting & Brute Force Protection

**Two-tier rate limiting:**

1. **Gateway-level** (global + API):
   - Global: 200 req/min per IP
   - API: 100 req/min per IP (routes under `/auth/*`, `/ai-lite/*`, etc.)
   - Brute-force: 10 req/min per IP for auth endpoints (Redis-backed)

2. **Service-level**:
   - Auth service: 30 req/min for `/auth/register` and `/auth/login`
   - Distributed sliding window using Redis sorted sets (`redis-state.js:26-48`)
   - In-memory fallback if Redis is unavailable (`security.js:69-79`)

### 5.4 Token Security

- **JWT Blacklist**: Tokens are blacklisted in Redis with SHA-256 hash (`redis-state.js:14-17`), TTL matches JWT expiry
- **Refresh Token Rotation**: Each refresh invalidates the previous token. Replay detection via SHA-256 hash comparison — tracked as `udb_refresh_replay_rejection_total` metric
- **Token Storage**: Frontend stores JWT in `localStorage` (not cookies — no CSRF, but XSS-vulnerable by design choice for simplicity)

### 5.5 Input Validation & Mass Assignment Protection

- Gateway: `express.json({ limit: '100kb' })` — body size limit
- Auth service: Manual validation of email format and password length (`auth-service.js:37-38`)
- Mass assignment protection: Register endpoint only destructures `email`, `password`, `displayName` — never `role`
- NestJS: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` (`main.ts:20-23`)

### 5.6 GDPR & COPPA Compliance

**GDPR (`User` model):**
- `gdprDeleteRequested` flag triggers data deletion workflow
- Audit log is WORM — never deleted (regulatory requirement)
- User data bulk deletion not yet implemented (flag-only at schema level)

**COPPA (Children's Online Privacy Protection Act):**
- `coppaConsentVerified` + `coppaConsentDate` on `User`
- `consentVerified` + `consentMethod` (CREDIT_CARD | ID_CHECK) on `FamilyLink`
- Child accounts cannot register without parent consent
- Age-gated features via `dateOfBirth` field

### 5.7 Security Headers

Configured in `gateway.js:33-38` via `helmet`:
- Content Security Policy: restricted default-src, script-src, style-src, img-src
- HSTS: 1 year, includeSubDomains, preload
- Frameguard: DENY (no iframe embedding)
- Referrer Policy: same-origin

---

## 6. Observability Architecture

### 6.1 Metrics (Prometheus + Grafana)

Each of the 6 UDB services exposes a `/metrics` endpoint via `prom-client` (`shared/prometheus.js`). Default metrics are collected with the `udb_` prefix.

**Custom Metrics (17 total):**

| Metric | Type | Labels | Source |
|--------|------|--------|--------|
| `udb_http_requests_total` | Counter | method, path, status, service | All services |
| `udb_http_request_duration_seconds` | Histogram | method, path, service | All services (buckets: 0.01-5s) |
| `udb_auth_failures_total` | Counter | reason, service | Auth service |
| `udb_queue_depth` | Gauge | queue | Queue service |
| `udb_queue_failures_total` | Counter | queue | Queue service |
| `udb_redis_latency_seconds` | Histogram | — | Auth service (buckets: 1-100ms) |
| `udb_db_pool_usage` | Gauge | state (active/idle/waiting) | Auth service |
| `udb_ai_budget_usage` | Gauge | userId | AI service |
| `udb_queue_lag_seconds` | Gauge | queue | Queue service |
| `udb_redis_reconnect_total` | Counter | service | All services |
| `udb_jwt_refresh_total` | Counter | status | Auth service |
| `udb_refresh_replay_rejection_total` | Counter | — | Auth service |
| `udb_request_drain_duration_seconds` | Gauge | — | Gateway |
| `udb_db_reconnect_total` | Counter | service | Gateway |
| `udb_idempotency_hits_total` | Counter | endpoint | Planner, AI services |

**Prometheus Configuration** (`infra/prometheus/prometheus.yml`):
- Scrape interval: 15s
- Retention: 7 days
- Target: all 6 UDB services via Docker container names (gateway, auth-service, planner-service, ai-service, monitoring-service, nestjs-graphql)

**Grafana** (`infra/grafana/`):
- Auto-provisioned Prometheus datasource (`datasources/prometheus.yml`)
- Two pre-built dashboards:
  - `udb-overview.json` — System health, request rate, error rate, latency p50/p95
  - `udb-runtime.json` — Per-service CPU/memory, DB pool, Redis latency, queue depth

### 6.2 Distributed Tracing (OpenTelemetry + Jaeger)

**Instrumentation** (`shared/tracing.js` for Phase 3, `src/tracing.ts` for NestJS):

Both use the same pattern:
1. `NodeSDK` with `OTLPTraceExporter` sending to `otel-collector:4318/v1/traces`
2. `BatchSpanProcessor` (max 512 spans/batch, 5s schedule delay, 30s export timeout)
3. Auto-instrumentations:
   - HTTP (`@opentelemetry/instrumentation-http`) — captures `x-correlation-id`
   - Express (`@opentelemetry/instrumentation-express`)
   - NestJS (`@opentelemetry/instrumentation-nestjs-core`) — NestJS only
   - iORedis (`@opentelemetry/instrumentation-ioredis`) — Phase 3 only
4. Resource attributes: `service.name`, `service.version`, `deployment.environment`

**Trace Pipeline:**
```
Service (OTLP HTTP) → otel-collector:4318 → batch processor → Jaeger:4317 (gRPC)
```

**Correlation ID Propagation:**
- Gateway generates `x-correlation-id` if not present (`correlationId` middleware)
- Passed to downstream services via HTTP headers
- Captured as span attribute in OpenTelemetry

### 6.3 Health Checking

Every UDB service has a `/health` endpoint with Docker health checks:
- Interval: 15s
- Timeout: 5s
- Start period: 30s
- Retries: 3

The monitoring service (`monitoring-service.js:41-58`) provides aggregated health across all services, checking Redis connectivity as a dependency signal.

### 6.4 Audit Logging

**Two-tier audit:**
1. **Redis audit** (`security.js:100-117`, `redis-state.js:131-152`):
   - 7-day retention
   - Used by Phase 3 services for operational audit
   - Event types: AUTH_REGISTER, AUTH_LOGIN, AUTH_LOGOUT, AUTH_REFRESH  
   
2. **PostgreSQL audit** (`AuditLog` model, `schema.prisma:651-667`):
   - WORM semantics: BigInt auto-increment, no updatedAt, no cascading deletes
   - Used by NestJS for compliance audit
   - Captures actor, action, target, payload, IP, user agent

### 6.5 Event Bus & Queue

**Event Bus** (`shared/event-bus.js`):
- Redis pub/sub with dual Redis connections (client + subscriber)
- Persistence via Redis lists (capped at 10,000 per event type)
- Events: `user_created`, `planner_created`, `hint_generated`, `budget_threshold_hit`
- Dead letter queue per event type (capped at 1,000)

**Job Queue** (`shared/queue.js`):
- Redis-backed with blocking pop (`brpop`)
- Retry with exponential backoff (1s × 2^n)
- Dead letter queue on exhausted retries
- Queues: `analytics` (hint_generated, planner_generated)
- Metrics tracked: queue depth, failures, latency, lag

---

## 7. Deployment Architecture

### 7.1 Docker Compose Configuration

**Base File:** `docker-compose.prod.yml` (340 lines)

**Volume Configuration:**
```yaml
volumes:
  postgres_data:      # PostgreSQL data persistence
  redis_data:         # Redis AOF persistence
  prometheus_data:    # 7-day metric retention
  grafana_data:       # Dashboard configuration
```

**Build Configuration:**
- Phase 3 services (gateway, auth, planner, ai, monitoring): Monorepo context (`.`), Dockerfiles in `services/api/prisma/phase3/`
- NestJS: Context `services/api`, Dockerfile `services/api/Dockerfile`
- Frontend: Context `apps/web`, Dockerfile `apps/web/Dockerfile`
- PostgreSQL, Redis, Jaeger, OTEL Collector, Prometheus, Grafana: Public images

**Resource Limits (all services):**

| Service | Memory Limit | Memory Reservation |
|---------|-------------|-------------------|
| postgres | 512M | 256M |
| pgbouncer | 128M | 64M |
| redis | 256M | 128M |
| gateway | 256M | 128M |
| auth-service | 256M | 128M |
| planner-service | 256M | 128M |
| ai-service | 256M | 128M |
| monitoring-service | 256M | 128M |
| nestjs-graphql | 512M | 256M |
| frontend | 256M | 128M |
| otel-collector | 256M | 128M |
| jaeger | 512M | 256M |
| prometheus | 512M | 256M |
| grafana | 256M | 128M |

**Total minimum reservation: 2.2 GB, total limit: 4.1 GB**

### 7.2 Startup Order & Dependencies

```
postgres ──► pgbouncer ──► gateway ──► frontend
                  │            │
                  │            ├──► auth-service
                  │            ├──► planner-service
                  │            ├──► ai-service
                  │            └──► monitoring-service
                  │
                  └──► nestjs-graphql
                        │
                        └──► (prometheus scrapes all 6 services)

jaeger ◄── otel-collector ◄── (all services send traces)

prometheus ──► grafana
```

All services depend on `postgres: condition: service_healthy` and/or `redis: condition: service_healthy`. The frontend depends on `gateway: condition: service_healthy`.

### 7.3 Environment Variables

**Shared across all application services:**
- `DATABASE_URL` — `postgresql://udb:${DB_PASSWORD}@pgbouncer:6432/udb?schema=public`
- `REDIS_URL` — `redis://redis:6379`
- `NODE_ENV` — `production`
- `OTEL_EXPORTER_OTLP_ENDPOINT` — `http://otel-collector:4318/v1/traces`

**Service-specific:**
| Service | Variables |
|---------|-----------|
| gateway | `GATEWAY_PORT`, `AUTH_SERVICE_HOST:PORT`, `PLANNER_SERVICE_HOST:PORT`, `AI_SERVICE_HOST:PORT`, `MONITORING_SERVICE_HOST:PORT`, `JWT_SECRET`, `CORS_ORIGIN` |
| auth | `AUTH_SERVICE_PORT`, `JWT_SECRET` |
| planner | `PLANNER_SERVICE_PORT` |
| ai | `AI_SERVICE_PORT`, `AI_COST_PER_HINT`, `AI_BUDGET_PER_USER_MONTHLY` |
| monitoring | `MONITORING_SERVICE_PORT` |
| nestjs | `API_PORT`, `JWT_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` |
| frontend | `PORT`, `NEXT_PUBLIC_API_URL` |
| grafana | `GF_SECURITY_ADMIN_USER`, `GF_SECURITY_ADMIN_PASSWORD` |

### 7.4 Infrastructure as Code

**Terraform** (`infra/terraform/`): Cloud infrastructure provisioning (GCP/AWS) for production deployment beyond Docker Compose.

**Environment Files:**
- `.env.production` — Production secrets and configuration
- `.env.development` — Development overrides
- `.env.example` — Template for new environments

### 7.5 Development Environment

**File:** `docker-compose.dev.yml` — Development variant with hot-reload, debug ports, and verbose logging.

**Monorepo Tooling:**
- `pnpm-workspace.yaml` — pnpm workspaces monorepo
- `turbo.json` — Turborepo task orchestration
- `.eslintignore` / `.prettierrc.json` — Code quality
- `.env` — Local development environment

### 7.6 Backup Strategy

**Backup directory:** `D:\SOS-UDB\backups\`  
**PostgreSQL dumps:** `D:\SOS-UDB\pgsql\`  
**Automated backup scripts** in `infra/terraform/` for cloud deployments.

---

## Appendix A: Key File Reference

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production service definitions (340 lines) |
| `docker-compose.dev.yml` | Development service definitions |
| `services/api/prisma/schema.prisma` | Full Phase 3 schema (668 lines, 21 models, 13 enums) |
| `prisma/schema.prisma` | Legacy Phase 2 schema (76 lines) |
| `services/api/prisma/phase3/gateway.js` | API Gateway — routing, auth, rate limiting, circuit breaker (278 lines) |
| `services/api/prisma/phase3/services/auth-service.js` | Auth microservice — register, login, refresh, logout (275 lines) |
| `services/api/prisma/phase3/services/planner-service.js` | Planner microservice — plan generation (96 lines) |
| `services/api/prisma/phase3/services/ai-service.js` | AI microservice — hints, budget, proof validation (108 lines) |
| `services/api/prisma/phase3/services/monitoring-service.js` | Monitoring — health, signals, alerts, audit (126 lines) |
| `services/api/prisma/phase3/shared/security.js` | JWT, RBAC, rate limiting, password hashing, audit (133 lines) |
| `services/api/prisma/phase3/shared/redis-state.js` | Redis-backed state management (171 lines) |
| `services/api/prisma/phase3/shared/prometheus.js` | Prometheus metrics definitions (182 lines) |
| `services/api/prisma/phase3/shared/tracing.js` | OpenTelemetry tracing initialization (84 lines) |
| `services/api/prisma/phase3/shared/circuit-breaker.js` | Circuit breaker pattern (160 lines) |
| `services/api/prisma/phase3/shared/event-bus.js` | Redis pub/sub event bus (114 lines) |
| `services/api/prisma/phase3/shared/queue.js` | Redis-backed job queue (133 lines) |
| `services/api/prisma/phase3/shared/idempotency.js` | Idempotency middleware (59 lines) |
| `services/api/src/main.ts` | NestJS bootstrap (32 lines) |
| `services/api/src/app.module.ts` | NestJS module registration (77 lines, 21 feature modules) |
| `services/api/src/tracing.ts` | NestJS OpenTelemetry initialization (72 lines) |
| `services/api/src/auth/auth.service.ts` | NestJS auth — Firebase + JWT (107 lines) |
| `services/api/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy (20 lines) |
| `services/api/src/auth/guards/roles.guard.ts` | GraphQL RBAC guard (23 lines) |
| `services/api/src/redis/redis.module.ts` | Redis client module (ioredis) (27 lines) |
| `services/api/src/ai/ai.service.ts` | NestJS AI — Vertex AI Socratic tutor (326 lines) |
| `apps/web/src/lib/apollo-client.ts` | Apollo Client — JWT auth link (29 lines) |
| `apps/web/src/app/dashboard/page.tsx` | Main dashboard — role-based rendering (54 lines) |
| `apps/web/src/components/ChildDashboard.tsx` | Child dashboard — Doter, XP, streaks (190 lines) |
| `apps/web/src/components/ParentDashboard.tsx` | Parent dashboard — family overview |
| `infra/prometheus/prometheus.yml` | Prometheus scrape config (35 lines) |
| `infra/otel-collector/otel-collector-config.yml` | OTEL collector pipeline (27 lines) |
| `infra/grafana/datasources/prometheus.yml` | Grafana datasource provisioning (8 lines) |

---

## Appendix B: Port Mapping Summary

| Port | Container | Protocol | Exposed | Purpose |
|------|-----------|----------|---------|---------|
| 3000 | gateway | HTTP | Yes | API Gateway |
| 3001 | auth-service | HTTP | No | Auth microservice |
| 3002 | planner-service | HTTP | No | Planner microservice |
| 3003 | ai-service | HTTP | No | AI microservice |
| 3004 | monitoring-service | HTTP | No | Monitoring microservice |
| 3005 | grafana | HTTP | Yes | Grafana dashboards (maps to container port 3000) |
| 3030 | frontend | HTTP | Yes | Next.js frontend |
| 4000 | nestjs-graphql | HTTP | Yes | GraphQL API |
| 4317 | otel-collector | gRPC | No | OTLP gRPC receiver |
| 4318 | otel-collector | HTTP | Yes | OTLP HTTP receiver |
| 5432 | postgres | PostgreSQL | No | Database |
| 6379 | redis | TCP | No | Cache/state |
| 6432 | pgbouncer | PostgreSQL | No | Connection pooler |
| 9090 | prometheus | HTTP | Yes | Metrics |
| 16686 | jaeger | HTTP | Yes | Distributed tracing UI |
