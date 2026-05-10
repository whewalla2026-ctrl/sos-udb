# TECHNICAL ARCHITECTURE REVIEW

## Frontend Architecture

### Quality: 8.5/10
- Next.js 14 App Router with SSR-safe Apollo Client
- 23 dashboard pages + public landing + auth pages
- Apollo `cache-and-network` fetch policy for live+offline
- Dynamic SSR-safe Apollo wrapper (`apollo-wrapper.tsx`)
- Design system via CSS globals (438 lines)
- 29 GraphQL operations defined (13 queries + 16 mutations)

### State Management: 8/10
- Apollo Client cache as primary state layer
- Local React state for UI-only concerns
- Fallback arrays (FALLBACK_*) for graceful degradation
- Missing: Global state management (Zustand/Redux) for complex cross-page state

### GraphQL Integration: 9/10
- 14 pages use Apollo hooks directly
- Auth token injection via Apollo Link `setContext`
- Cache-and-network policy for optimal UX
- All queries/mutations organized in single `queries.ts`

### SSR Safety: 9/10
- Apollo wrapper uses `next/dynamic` with `ssr: false`
- Client-side only rendering prevents hydration mismatch
- Layout hierarchy: RootLayout → DashboardLayout → Page

## Backend Architecture

### Microservice Boundaries: 8/10
- 7 services with clear responsibilities:
  - API Gateway (routing, auth, rate limiting, circuit breakers)
  - Auth Service (registration, login, JWT, token rotation)
  - Planner Service (weekly plan generation)
  - AI Service (hint generation, budget tracking)
  - Monitoring Service (health, alerts, signals, audit)
  - NestJS GraphQL API (data layer, resolvers, business logic)
  - Next.js Frontend (SSR React app)

### API Contracts: 8/10
- REST: Gateway → microservices via HTTP proxy
- GraphQL: Frontend → NestJS API (port 4000)
- 23 queries + 19 mutations available
- All resolvers have auth guards

### Queue Architecture: 7/10
- Redis-based queue service with 4 queues:
  - `ai-hints` (retries: 3)
  - `analytics` (retries: 3)
  - `notifications` (retries: 5)
  - `cleanup` (retries: 2)
- Idempotency support for POST endpoints
- Missing: DLQ monitoring, queue lag alerting

### Event Flows: 7/10
- Redis Pub/Sub event bus with 6 event types:
  - `user_created`, `user_logged_in`, `planner_created`
  - `hint_generated`, `budget_threshold_hit`, `alert_triggered`
- Event consumers in gateway for queues
- Missing: Event sourcing, dead letter tracking

### DB Architecture: 8/10
- PostgreSQL 16 with 25 tables, 53 indexes, 27 FKs
- Prisma ORM with type-safe queries
- Connection pool configured
- Query performance: p50=6ms

### Cache Correctness: 7/10
- Redis for: JWT refresh tokens, user credentials, planner cache
- Idempotency cache for POST endpoints
- Missing: Cache invalidation patterns, TTL monitoring

### Fault Isolation: 9/10
- Circuit breakers on all inter-service calls (threshold: 5 failures)
- Graceful shutdown with request draining
- Health checks on all services
- Retry strategies with backoff

## Infrastructure

### Docker Readiness: 9/10
- Dockerfiles for 5 services
- Docker Compose with 3 variants
- Healthchecks, startup ordering, resource limits
- Not deployed (Docker engine not running)

### K8s Readiness: 9/10
- Manifests for 7 deployments, services, ingress, HPA
- Network policies, PDB, secrets, configmaps
- Terraform for GCP exists
- Not deployed (no cluster available)

### Observability: 9/10
- Prometheus /metrics on all services (17 metric families)
- OpenTelemetry distributed tracing on all 6 Node.js services
- Structured JSON logging with correlation IDs
- Health endpoints on all services (HTTP 200)
- Missing: Centralized log aggregation (ELK/Loki), trace visualization (Jaeger)

### Deployment Safety: 7/10
- Graceful shutdown with drain timeout (10s)
- Request draining before SIGTERM
- Missing: Canary deployment, blue/green strategy
