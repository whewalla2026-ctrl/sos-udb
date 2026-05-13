# ARCHITECTURE REALITY REPORT — SOS-UDB Platform

**Date:** 2026-05-10  
**Phase:** Phase 0 — Deep Truth Audit

---

## ACTUAL DEPLOYMENT ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DOCKER HOST                                    │
│                   12 CPUs | 11.52GB RAM | Linux/amd64                    │
│                                                                         │
│  ┌─────────┐  ┌──────────┐  ┌──────┐  ┌────────────────────────────┐  │
│  │PostgreSQL│  │ pgBouncer│  │ Redis│  │  Observability Stack       │  │
│  │  16      │  │ :6432    │  │ 7    │  │  ┌──────┬───────┬────────┐│  │
│  │ :5432    │  │          │  │:6379 │  │  │Jaeger│Prometh│Grafana ││  │
│  └────┬─────┘  └────┬─────┘  └──┬───┘  │  │16686 │ :9090 │ :3005  ││  │
│       │              │          │       │  └──┬───┴───┬───┴────────┘│  │
│       └──────┬───────┘          │       │     │       │             │  │
│              │                  │       │  ┌──┴───────┴────────────┐│  │
│              │                  │       │  │  OTEL Collector       ││  │
│              │                  │       │  │  :4317 / :4318        ││  │
│              │                  │       │  └───────────────────────┘│  │
│              ▼                  ▼       └────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                      API GATEWAY (:3000)                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────┐  ┌────────────────┐  │    │
│  │  │ auth-svc │  │planner-sv│  │ ai-svc │  │ monitoring-svc │  │    │
│  │  │ :3001    │  │ :3002    │  │ :3003  │  │ :3004          │  │    │
│  │  └──────────┘  └──────────┘  └────────┘  └────────────────┘  │    │
│  │  ┌──────────────────────────────────────────────────────────┐ │    │
│  │  │              NestJS GraphQL API (:4000)                   │ │    │
│  │  │  30+ modules | Prisma | JWT Auth | RBAC | OTEL tracing   │ │    │
│  │  └──────────────────────────────────────────────────────────┘ │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Frontend (:3030)                       │   │
│  │  37 pages | Apollo GraphQL | Auth Context | 17+ mock data pages  │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘

External Services (NOT integrated):
  Firebase Auth ──── Missing credentials
  Stripe ─────────── Placeholder keys (stub mode)
  Vertex AI ──────── Mock fallback
  GCP Cloud ──────── Terraform scaffold only, never applied
```

---

## WHAT THE ARCHITECTURE SHOULD BE vs WHAT IT IS

### Intended Architecture (from docs)
```
Client → Gateway → Microservices → Database
                                → AI Service (Python)
                                → Stripe (payments)
                                → Firebase (auth)
```

### Actual Architecture
```
Client → Gateway → Microservices → Database (24 tables of 37)
         → NestJS API (the real backend)
         → Stripe stub (mock mode)
         → Firebase stub (missing credentials)
         → AI mock (fallback strings)
```

**The NestJS GraphQL API is the de facto primary backend**, handling all business logic. The Phase 3 microservices serve as a thin REST layer for auth, planning, AI hints, and monitoring, but they lack the domain knowledge of the NestJS modules.

---

## LAYER-BY-LAYER REALITY

### Layer 1: Client (Frontend)
- **Intended:** SSR Next.js with proper loading states, error boundaries, real data
- **Reality:** All client-side (`'use client'` everywhere), 17+ pages with mock data, no error boundaries, no loading.tsx, broken reset-password page, broken ParentDashboard references
- **Blockers:** Auth API mismatch prevents login flow from working end-to-end

### Layer 2: Gateway
- **Intended:** API gateway with routing, auth, rate limiting, circuit breakers
- **Reality:** Express gateway with Helmet, CORS, rate limiting (not actually functioning), circuit breakers. Running healthy.
- **Gap:** Rate limits are configured but frontend doesn't route through gateway for GraphQL

### Layer 3: Microservices (Phase 3)
- **Intended:** Independent services for auth, planner, AI, monitoring
- **Reality:** Thin Express services sharing a Prisma schema they don't own. All running healthy.
- **Gap:** Duplicate functionality with NestJS API. AI service returns hardcoded mock responses.

### Layer 4: NestJS GraphQL API
- **Intended:** Primary backend with all business logic
- **Reality:** 30+ modules well-structured, all resolvers defined, but:
  - Auth module: Only Firebase-based, no REST endpoints for frontend
  - Stripe: Stub mode only
  - RBAC: Guard exists but zero resolvers use it
  - Rate limiting: Not implemented
- **Gap:** Auth flow is completely broken due to frontend expecting REST and backend only serving GraphQL

### Layer 5: AI Service (Python)
- **Intended:** LangGraph + Vertex AI Gemini for Socratic tutoring
- **Reality:** FastAPI service exists with mock fallback. Not in any Docker compose.

### Layer 6: Database
- **Intended:** 37 tables with proper migrations, indexes, cascading
- **Reality:** 24 tables created via `db push` (no proper migrations), 13 Phase 4 tables missing, 3 orphaned tables, Achievement model disconnected from User, 18 indexes in DB not in schema

### Layer 7: Observability
- **Intended:** Full metrics + traces + logs + alerts
- **Reality:** Traces work end-to-end. Metrics are default Node.js only (no custom business metrics). Logs are plain text with no aggregation. Alerting is completely absent.

---

## SERVICE DEPENDENCY MAP

```
frontend(:3030) ───HTTP──▶ gateway(:3000) ───HTTP──▶ auth-service(:3001)
                                           ───HTTP──▶ planner-service(:3002)
                                           ───HTTP──▶ ai-service(:3003)
                                           ───HTTP──▶ monitoring-service(:3004)
                                           ───HTTP──▶ nestjs-graphql(:4000)

nestjs-graphql(:4000) ───Prisma──▶ pgbouncer(:6432) ────▶ postgres(:5432)
                      ───ioredis──▶ redis(:6379)
                      ───OTLP────▶ otel-collector(:4318) ──▶ jaeger(:16686)

All services ───/metrics──▶ prometheus(:9090) ──▶ grafana(:3005)
```

---

## DATA FLOW AUDIT

### Auth Flow (BROKEN)
```
Frontend                     Backend
    │                           │
    ├─ POST /auth/login ──────▶ │  ← No endpoint exists
    ├─ POST /auth/register ───▶ │  ← No endpoint exists
    ├─ POST /auth/refresh ────▶ │  ← No endpoint exists
    ├─ POST /auth/me ─────────▶  │  ← No endpoint exists
    │                           │
    ├─ GraphQL loginWithFirebase▶│  ← Only working path
    │   (requires Firebase SDK)  │
```

### Billing Flow (MOCKED)
```
Frontend                     Backend                    Stripe
    │                           │                         │
    ├─ GraphQL getPlans ──────▶ │                         │
    │                           ├─ new Stripe(sk_test) ──▶│  ← Never initializes
    │                           │   (stub mode, no key)   │
    │                           │                         │
    ├─ BillingDashboard ──────▶ │                         │
    │   (mock PLANS array)      │                         │
```

### Data Query Flow (MIXED)
```
Frontend                     Backend                    Database
    │                           │                         │
    ├─ GraphQL GET_ME ────────▶ │                         │
    │                           ├─ Prisma findUnique ───▶│  ✅ Works
    │                           │                         │
    ├─ GraphQL GET_CHILDREN ───▶│                         │
    │                           ├─ Prisma findMany ─────▶│  ✅ Works
    │                           │                         │
    ├─ GraphQL GET_ANALYTICS ──▶│                         │
    │                           ├─ Complex aggregation ──▶│  ✅ Works
    │                           │                         │
    ├─ Mock data page ────────▶ │                         │
    │   (no GraphQL call)       │  Never called            │
```

---

## RUNTIME STATE

### All 14 Docker containers — HEALTHY
```
udb-postgres       Up 28 hours (healthy)
udb-pgbouncer      Up 24 hours (healthy)
udb-redis          Up 28 hours (healthy)
udb-gateway        Up 24 hours (healthy)
udb-auth           Up 25 hours (healthy)
udb-planner        Up 25 hours (healthy)
udb-ai             Up 25 hours (healthy)
udb-monitoring     Up 28 hours (healthy)
udb-nestjs         Up 24 hours (healthy)
udb-frontend       Up 28 hours (healthy)
udb-otel-collector Up 25 hours
udb-jaeger         Up 25 hours
udb-prometheus     Up 25 hours
udb-grafana        Up 25 hours
```

### Database State
- 24 tables created in public schema
- 1 user in DB (test user)
- 1 onboarding_status record
- All other tables EMPTY (seed not run)
- 13 Phase 4 tables NOT CREATED
- 3 orphaned tables (not in schema)

---

## ARCHITECTURAL CONCERNS

### 1. Dual Backend Architecture
The NestJS API and Phase 3 microservices represent two parallel implementations. The NestJS API is more complete but only exposed via GraphQL on port 4000. The Phase 3 microservices are simpler REST services but lack domain logic. This creates confusion about which layer owns which functionality.

**Recommendation:** Consolidate. Either the NestJS API should be the sole backend (with the gateway routing to it) or the microservices should be fully implemented.

### 2. No Kubernetes Path
The project cannot scale beyond a single Docker host. There are no Kubernetes manifests, Helm charts, or Kustomize overlays. The Terraform defines data stores but no compute.

**Recommendation:** Add K8s manifests for production deployment.

### 3. Monorepo Without Shared Packages
`pnpm-workspace.yaml` references `packages/*` but no such directory exists. Shared types and utilities should be extracted to a `packages/` directory.

**Recommendation:** Create `packages/` directory for shared types, configs, and utilities.

### 4. Database Migration Strategy
The project uses `prisma db push` instead of `prisma migrate dev`. This is not a production-safe migration strategy and has already led to drift between the schema and actual database.

**Recommendation:** Baseline the existing database, then use proper migrations going forward.

### 5. Frontend-Backend API Contract Mismatch
The frontend and backend were apparently developed independently. The frontend expects REST endpoints that don't exist, and the only working auth path (Firebase GraphQL) requires Firebase SDK credentials that aren't configured.

**Recommendation:** Either implement all REST endpoints or rewrite the frontend to use GraphQL exclusively.

### 6. Stripe as an Afterthought
The billing module is well-structured but never actually connects to Stripe due to placeholder keys. Webhook security has a dangerous fallback path that accepts unverified payloads.

**Recommendation:** Replace placeholder keys, remove stub bypass, implement all webhook handlers.

### 7. Security Credentials in Code
Secrets are hardcoded in docker-compose files, .env files committed to git, and even in source code (firebase.strategy.ts). There is no secrets management solution.

**Recommendation:** Implement a secrets management solution (HashiCorp Vault, AWS Secrets Manager, or at minimum Docker secrets).

---

## ARCHITECTURE SCORE: 6/10

| Category | Score | Notes |
|----------|-------|-------|
| Modularity | 8/10 | Clean monorepo, well-organized NestJS modules |
| Scalability | 3/10 | No K8s, no auto-scaling, single host |
| Security | 2/10 | 23 vulnerabilities found, credentials in plain text |
| Maintainability | 6/10 | Good structure but dual backend confusion |
| Testability | 5/10 | Some tests exist (billing, tutor) but no E2E |
| Deployability | 4/10 | Docker works but npm/pnpm mismatch, no secrets mgmt |
| Observability | 3/10 | Traces good, metrics/logs/alerting absent |
| Data Integrity | 5/10 | Schema drift, missing tables, orphaned tables |
| API Design | 4/10 | Frontend-backend contract mismatch |
| Reliability | 6/10 | Containers stable, but no DR testing |

---

## CRITICAL ARCHITECTURAL BLOCKERS

1. **Auth flow is broken** — The frontend login/register flow cannot reach any backend endpoint. Users cannot authenticate.
2. **Prisma migration cannot be applied** — The init migration will conflict with existing tables. Manual baselining required.
3. **Stripe billing is non-functional** — Placeholder keys prevent real payment processing.
4. **No production security** — JWT secret, DB password, GraphQL playground, and missing rate limiting make the platform unsafe for production.
5. **No Kubernetes path** — The platform is containerized but not orchestrated.
