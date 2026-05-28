# UDB — Unified Developmental Backbone

Education platform for child development (ages 6-23) with AI tutoring, gamification, parental oversight, and safety-first design.

## Quick Start

```bash
cp .env.example .env
# Fill in your API keys in .env
docker compose -f docker-compose.prod.yml up -d
pnpm install
pnpm prisma migrate deploy --schema=services/api/prisma/schema.prisma
pnpm dev
```

## Architecture

### Services (Microservices)
| Service | Port | Technology | Role |
|---------|------|-----------|------|
| Gateway | 3000 | Node.js | API gateway, request routing to microservices |
| Auth | 3001 | Node.js | Authentication, COPPA VPC enforcement |
| Planner | 3002 | Node.js | Learning plans, schedules, chronotype scheduling |
| AI | 3003 | Node.js | AI tutor, vision analysis, skill gap analysis |
| Monitoring | 3004 | Node.js | Health checks, metrics, alert routing |
| API | 4000 | NestJS | GraphQL, business logic, all core features |
| Frontend | 3030 | Next.js 14 | 40-route web application (auth, dashboard, admin) |

### Infrastructure
| Service | Port | Role |
|---------|------|------|
| PostgreSQL 16 | 5432 | Primary database (27 tables, 2 migrations) |
| PgBouncer | 6432 | Connection pooling |
| Redis 7 | 6379 | Cache, sessions, BullMQ queues |
| Nginx | 80/443 | Reverse proxy, TLS termination |

### Observability
| Service | Port | Role |
|---------|------|------|
| Prometheus | 9090 | Metrics collection (1 active target) |
| Grafana | 3005 | Dashboards (admin/admin123) |
| Jaeger | 16686 | Distributed tracing |
| Loki | 3100 | Log aggregation |
| AlertManager | 9093 | Alert routing |
| OTel Collector | 4318 | Telemetry pipeline (OTLP) |
| Promtail | — | Log shipping to Loki |

## Testing

```bash
pnpm test              # 127 unit tests (14 suites)
pnpm test:e2e          # E2E against Docker stack
pnpm test:integration  # API contract tests
pnpm lint              # ESLint (0 errors expected)
pnpm typecheck         # TypeScript strict mode
bash scripts/smoke-test.sh  # 11 smoke tests
```

## Feature Flags

See [docs/FEATURE_FLAGS.md](docs/FEATURE_FLAGS.md) for the full inventory:
- **12 core flags ON** — auth, security, safety, GDPR, gamification, messaging
- **13 deferred flags OFF** — offline, biometric, desktop agent, ventures, etc.

## Deployment

See [docs/ROLLOUT_PLAN.md](docs/ROLLOUT_PLAN.md) for staging → production rollout.

| Environment | Stack | Status |
|-------------|-------|--------|
| Localhost | Docker Compose (19 containers) | ✅ Running |
| Staging (AWS) | ECS Fargate + RDS + ElastiCache | ⏳ Terraform ready, not applied |
| Production | ECS Fargate (multi-AZ) | 📅 Future |

## Known Limitations

See [KNOWN_LIMITATIONS.md](KNOWN_LIMITATIONS.md) for honest accounting:
- 15/50 services with dedicated tests
- 3 stubs (desktop agent, offline tutor, mobile SDK)
- No cloud infrastructure deployed (requires AWS credentials)

## Documentation

| Document | Description |
|----------|-------------|
| `docs/FEATURE_FLAGS.md` | 25-flag inventory with activation criteria |
| `docs/ROLLOUT_PLAN.md` | 4-phase rollout with rollback procedures |
| `docs/RUNBOOK.md` | Deployment and incident response runbook |
| `docs/GITHUB_SECRETS.md` | Required GitHub Actions secrets |
| `KNOWN_LIMITATIONS.md` | Service coverage matrix and deferrals |
| `DEPLOYMENT_RUNBOOK.md` | Production deployment procedures |

## License

Proprietary — All rights reserved.
