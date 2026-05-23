# Rollout Plan — v10.0 Staging Deployment

**Generated:** 2026-05-23
**Branch:** `release/v1-production` | **Current Tag:** `v9.0-hardened`
**Target Tag:** `v10.0-staging-deployed`

---

## Deployment Target

- **Platform:** Localhost Docker Compose (19 containers)
- **API:** `http://localhost:4000`
- **Frontend:** `http://localhost:3030`
- **Grafana:** `http://localhost:3005`
- **Prometheus:** `http://localhost:9090`
- **Jaeger:** `http://localhost:16686`

---

## Commit Strategy

| Step | Action | Message Prefix |
|------|--------|---------------|
| 1a | Create docs/ feature flags + rollout plan | `docs:` |
| 1b | Create smoke test script | `test:` |
| 1c | Create CI/CD staging workflow | `ci:` |
| 2 | Start Docker stack, run migrations, seed DB | `deploy(staging):` |
| 3 | Run smoke tests against localhost | `test:` |
| 4 | Tag v10.0-staging-deployed | _(tag, no commit)_ |

---

## Phase 1: Documentation & Scripts

- [x] `docs/FEATURE_FLAGS.md` — 25 flags (12 ON / 13 OFF)
- [x] `docs/ROLLOUT_PLAN.md` — this file
- [ ] `scripts/smoke-test-staging.ps1` — 11 smoke tests against localhost
- [ ] `.github/workflows/staging-deploy.yml` — CI/CD pipeline

## Phase 2: Infrastructure — Start Docker Stack

- [ ] `docker compose -f docker-compose.prod.yml up -d`
- [ ] Verify all 9+ containers healthy
- [ ] Run `npx prisma migrate deploy` (services/api)
- [ ] Run `npx prisma db seed` (services/api)
- [ ] Verify TimescaleDB hypertables (if applicable)

## Phase 3: Smoke Tests

- [ ] Health endpoint returns 200 + `{"status":"ok"}`
- [ ] Database connection healthy
- [ ] Redis connection healthy
- [ ] GraphQL schema loads (introspection or basic query)
- [ ] Prometheus `/metrics` endpoint returns metrics
- [ ] Grafana dashboard loads (HTTP 200)
- [ ] Jaeger UI loads (HTTP 200)
- [ ] Frontend serves page (HTTP 200)
- [ ] Auth guard blocks unauthenticated queries
- [ ] Rate limiting returns 429 on excess
- [ ] CORS headers present on API response

## Phase 4: Monitoring Verification

- [ ] Prometheus scraping API metrics
- [ ] Grafana data source connected to Prometheus
- [ ] AlertManager rules loaded
- [ ] Loki + Promtail collecting container logs
- [ ] Jaeger receiving traces from OTel collector

## Phase 5: CI/CD Pipeline

- [ ] GitHub Actions workflow: `staging-deploy.yml`
- [ ] Jobs: test → build → deploy → smoke
- [ ] Concurrency group to prevent concurrent deploys
- [ ] Environment protection rules (if applicable)

## Phase 6: Readiness

- [ ] All 12 core feature flags ON (verified in logs)
- [ ] All 13 deferred feature flags OFF (verified in logs)
- [ ] Rollback script verified (`scripts/rollback.ps1`)
- [ ] Smoke test suite passes (0 failures)
- [ ] Tag `v10.0-staging-deployed` created

---

## Rollback Procedure

```powershell
# Stop current stack
docker compose -f docker-compose.prod.yml down

# Restore from v9.0-hardened tag
git checkout v9.0-hardened
docker compose -f docker-compose.prod.yml up -d --build

# Verify
curl http://localhost:4000/health
```

Or use the automated rollback script:
```powershell
.\scripts\rollback.ps1 -Target all
```

---

## Decision Gate

| Criterion | Threshold | Status |
|-----------|-----------|--------|
| All tests pass | 178 tests (127 unit + 33 E2E + 18 integration) | ❌ Not run on staging |
| Smoke tests pass | 11/11 PASS | ❌ Not run |
| Docker stack healthy | All containers "Up" + healthy | ❌ Not verified |
| Feature flags correct | 12 ON / 13 OFF | ❌ Not verified |
| Rollback verified | dry-run or actual rollback tested | ❌ Not verified |
| Score | ≥ 8.0/10 (current: 8.3) | **✅ 8.3/10** |

**Gate status:** ❌ NOT YET CLEARED — requires Docker stack, smoke tests, and CI/CD verification
