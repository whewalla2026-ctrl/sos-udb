# UDB — Unified Developmental Backbone

Education platform for child development (ages 6-23) with AI tutoring, gamification, parental oversight, and safety-first design.

**Version:** v15.0-hardened | **Status:** Engineering complete — transitioning to operations.

## Quick Start

```bash
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d
pnpm install
pnpm test              # Run all tests (446+ unit, 29 E2E)
```

## Architecture (18 Containers)

### Application Services
| Service | Port | Technology | Role |
|---------|------|-----------|------|
| Gateway | 3000 | Express | API proxy, rate limiting, auth enforcement |
| Auth | 3001 | Express | Auth health stub |
| Planner | 3002 | Express | Planning health stub |
| AI | 3003 | Express | AI-lite hints, batch, budget endpoints |
| Monitoring | 3004 | Express | Health aggregation, alert forwarding |
| API | 4000 | NestJS | GraphQL, all business logic (52 services, 26 resolvers) |
| Frontend | 3030 | Next.js 14 | 38-page SSR web application |

### Infrastructure
| Service | Port | Role |
|---------|------|------|
| PostgreSQL 16 + TimescaleDB 2.17.2 | 5432 | Primary database (38 tables, 3 migrations) |
| PgBouncer | 6432 | Connection pooling |
| Redis 7 | 6379 | Cache, BullMQ queues, rate limiting |
| Nginx | 80/443 | Reverse proxy, TLS termination (self-signed) |
| db-backup | — | AES-256 encrypted pg_dump every 6h |

### Observability
| Service | Port | Role |
|---------|------|------|
| Prometheus | 9090 | Metrics collection |
| Grafana | 3005 | Dashboards |
| Jaeger | 16686 | Distributed tracing |
| Loki | 3100 | Log aggregation |
| AlertManager | 9093 | Alert routing with webhook receivers |
| OTel Collector | 4318 | OTLP telemetry pipeline |

## Testing

```bash
pnpm test              # 446 unit tests (34 suites) + 29 E2E
pnpm lint              # ESLint (0 errors expected)
pnpm typecheck         # TypeScript strict mode (0 errors)
```

## Feature Flags

See [docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md) — 13 flags total (4 ON, 9 OFF).

## Deployment

| Environment | Stack | Status |
|-------------|-------|--------|
| Localhost | Docker Compose (18 containers) | ✅ Running |
| Staging (AWS) | ECS Fargate + RDS + ElastiCache | ⏳ Terraform ready |
| Production | ECS Fargate (multi-AZ) | 📅 Future |

## Documentation

| Document | Description |
|----------|-------------|
| `KNOWN_LIMITATIONS.md` | Current known limitations and score |
| `DEPLOYMENT_HISTORY.md` | Version history from v1.0.0 → v15.0 |
| `docs/FEATURE_FLAGS.md` | 13-flag inventory with activation criteria |
| `docs/USE_CASE_AUDIT.md` | 120 use case completion audit (98.3%) |
| `docs/DELIVERY_CHECKLIST.md` | Requirements verification (53 items) |
| `docs/TRAINING_GUIDE.md` | End user training guide |
| `docs/TEST_REPORT_v15.0.md` | Comprehensive test verification report |
| `docs/RUNBOOK.md` | Deployment and incident response runbook |
| `docs/ROLLOUT_PLAN.md` | 4-phase rollout with rollback procedures |
| `docs/DISASTER_RECOVERY_RUNTIME.md` | DR procedures and runtime ops |

## Demo v19.0

All services running via Docker Compose on `https://localhost/`.

**Known Limitation:** `/auth/login` page returns 404 because Nginx proxies all `/auth/*` requests to the gateway (which has no HTML handler). Fix requires nginx config reload (blocked by Docker CLI unresponsiveness).

**Workaround:** Login via curl, then navigate dashboard pages directly with the JWT cookie:

```bash
curl -sk -X POST https://localhost/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"sarah.demo@udb.app","password":"DemoParent123!"}'
```

Pre-seeded demo accounts: Sarah (PARENT), Leo (CHILD), Maya (CHILD), Alex (ADMIN). See `docs/DEMO_SCRIPT.md` for full walkthrough.

| Demo Account | Email | Password |
|---|---|---|
| Sarah Johnson | sarah.demo@udb.app | DemoParent123! |
| Leo Johnson | leo.demo@udb.app | DemoKid123! |
| Maya Johnson | maya.demo@udb.app | DemoTeen123! |
| Alex Admin | admin.demo@udb.app | DemoAdmin123! |

## License

Proprietary — All rights reserved.
