# Deployment Runbook — Phase 1-2 MVP

## Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL 14+ (optional for demo, required for persistent state)
- Docker (optional, for containerized deployment)

## Environment Variables

```env
# Required
JWT_SECRET=<random-64-char-hex>
AI_BUDGET_PER_USER_MONTHLY=0.50
AI_COST_PER_HINT=0.0004
AI_CACHE_TTL_SECONDS=3600

# Database (optional for demo)
DATABASE_URL=postgresql://user:pass@localhost:5432/udb

# Security (optional)
CORS_ORIGIN=http://localhost:3000,http://localhost:3001
PORT=3000
TLS_KEY=/path/to/key.pem
TLS_CERT=/path/to/cert.pem
```

## Deploy Steps

### 1. Install Dependencies
```bash
pnpm install --no-frozen-lockfile
```

### 2. Build
```bash
pnpm build
```

### 3. Run Database Migrations (if using PostgreSQL)
```bash
cd services/api
npx prisma migrate deploy
npx prisma db seed
```

### 4. Start
```bash
pnpm --filter api start:prod
```

### 5. Verify
```bash
curl http://localhost:3000/monitoring/health
curl http://localhost:3000/monitoring/metrics
node pilot/scripts/mvp-validate.js
node pilot/scripts/failure-injection-tests.js
```

### Docker Deploy
```bash
docker build -t udb-api:phase-1-2-mvp-rc1 -f services/api/Dockerfile services/api/
docker run -d --name udb-api --network host \
  -e JWT_SECRET=<secret> \
  -e AI_BUDGET_PER_USER_MONTHLY=0.50 \
  -e AI_COST_PER_HINT=0.0004 \
  udb-api:phase-1-2-mvp-rc1
```

## Kill Switch

If any of the following thresholds are exceeded:

| Metric | Threshold |
|--------|-----------|
| Onboarding completion | < 75% |
| AI cost vs baseline | > 2x for 2 cycles |
| Error rate | > 5% |
| Fallback rate | > 10% |

Execute: `FINAL_ROLLBACK_RUNBOOK.md`
