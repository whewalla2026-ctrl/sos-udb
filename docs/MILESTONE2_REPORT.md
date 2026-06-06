# Milestone 2: CI/CD Activation Report

**Date:** 2026-06-05
**Branch:** release/v1-production
**Repo:** github.com/whewalla2026-ctrl/sos-udb

---

## Task 1: Audit Existing CI Workflow

**Existing `ci.yml`**: Single monolithic `build-test` job — no service containers, no Docker build, no caching.

**Changes made:**
- Split into 4 parallel jobs: `typecheck`, `lint`, `test`, `docker-build`
- Added `postgres:16-alpine` and `redis:7-alpine` service containers for tests
- Added `docker compose build --parallel` job to verify Docker images
- Added pnpm caching via `actions/setup-node` with `cache: pnpm`
- Updated triggers: `push` to `main` + `release/v1-production`, `pull_request` to `release/v1-production`
- Removed unnecessary `pnpm run build` step (Docker build covers it)

## Task 2: Local Dry Run

| Check | Result |
|-------|--------|
| `pnpm typecheck` | ✅ 4 tasks successful, 0 errors |
| `pnpm lint` | ✅ 4 tasks, 0 errors (402 warnings — pre-existing) |
| `npx jest --testPathPattern="password.service"` | ✅ 14/14 tests passed |

## Task 3: GitHub Secrets

Generated 6 strong random secrets via `setup-secrets.ps1` and configured via `gh secret set`:
- `JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `BACKUP_ENCRYPTION_KEY`, `CI_JWT_SECRET`

## Task 4: Branch Protection

**✅ Completed — repo made public, rules enforced via REST API.**

- Repo visibility changed from private → public to unlock branch protection on Free plan
- Applied via `gh api` with `required_status_checks` (strict, 4 checks), `required_pull_request_reviews` (1 approval), `enforce_admins: true`

## Task 5: CI Trigger + Fixes

**First run (27044178333):** 2 of 4 jobs failed
- `typecheck` ❌ — `PrismaClient` not exported; Prisma client types not generated
- `test` ❌ — Same root cause; blockchain test failed to compile
- Root cause: `prisma generate` never ran in CI, so `@prisma/client` had no model types

**Fix applied:** Added `pnpm --filter @udb/api prisma:generate` step before typecheck and test.

**Second run (27060477063):** ✅ **All 4 jobs green**
| Job | Time | Status |
|-----|------|--------|
| typecheck | 1m 5s | ✅ |
| lint | 50s | ✅ |
| test | 1m 32s | ✅ |
| docker-build | 4m 38s | ✅ |

## Task 6: Branch Protection (Resolved)

⚠️ Initial attempt blocked — API returned "Upgrade to GitHub Pro or make this repository public."

**Resolution:** Made the repo public (user choice), then applied branch protection via REST API:
- `required_status_checks` with `strict: true` and 4 required contexts
- `required_pull_request_reviews` with 1 approving review
- `enforce_admins: true`

## Files Changed

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | Rewritten — 4 parallel jobs, service containers, prisma generate |
| `.github/workflows/setup-secrets.ps1` | Created — secret generation helper |

---

## CI Workflow Summary

```yaml
# 4 parallel jobs:
#   typecheck   → prisma:generate + pnpm typecheck
#   lint        → pnpm lint
#   test        → prisma:generate + pnpm test:api (postgres + redis service containers)
#   docker-build → docker compose -f docker-compose.prod.yml build --parallel
```

## GitHub Secrets Configured

6 secrets added via `gh secret set`:
`JWT_SECRET`, `DB_PASSWORD`, `REDIS_PASSWORD`, `GRAFANA_ADMIN_PASSWORD`, `BACKUP_ENCRYPTION_KEY`, `CI_JWT_SECRET`
