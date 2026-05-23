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

| Component | Tech | Location |
|-----------|------|----------|
| API | NestJS (TypeScript) | `services/api/` |
| Frontend | Next.js 14 | `apps/web/` |
| AI Services | Python/FastAPI | `services/ai-mentor/` |
| Database | PostgreSQL 15 + TimescaleDB | Docker / RDS |
| Cache | Redis 7 | Docker / ElastiCache |
| Queue | BullMQ | Redis |
| Monitoring | Prometheus + Grafana + Jaeger + Loki | Docker / AWS |
| Tracing | OpenTelemetry | OTel Collector |

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
