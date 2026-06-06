# Milestone 2: CI/CD Activation Report

**Date:** 2026-06-06
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

- Repo visibility changed from private → public via `gh repo edit --visibility public`
- Applied via `gh api` with `required_status_checks` (strict, 4 checks: typecheck, lint, test, docker-build) and `enforce_admins: true`
- PR reviews removed from rule (impractical for solo project — no second account to approve)
- Effective workflow: push feature branch → create PR → CI runs 4 jobs → merge via UI (or direct push only if commit already has passing CI)

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
- `required_status_checks` with `strict: true` and 4 required contexts (typecheck, lint, test, docker-build)
- `enforce_admins: true` — no bypassing rules
- PR reviews removed (solo project constraint — cannot self-approve)
- PR #1 created and merged to `release/v1-production` to validate the flow

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

## Pre-existing Workflows (Not Modified)

The repo also contains these workflow files that were NOT part of this milestone:
- `validate.yml` — typecheck, lint, test, build (overlaps with ci.yml; uses `pnpm run` commands)
- `security.yml` — npm-audit, truffleHog secret-scan (failing on historical secrets), Snyk dependency-scan
- `docker.yml` — API-only Docker build (redundant with ci.yml docker-build)
- `staging-deploy.yml` — Full staging pipeline (test→deploy→smoke→readiness) on push to release/v1-production
- `release.yml` — DB validation + audit on PR to main
- `load.yml` — k6 load test (PR to main or manual dispatch)
- `pentest.yml` — OWASP ZAP + security checks (scheduled 2x/month or manual)

**Note:** `validate.yml`, `security.yml`, and `docker.yml` have overlapping triggers with `ci.yml` and will run on every push/PR, causing redundant CI minutes. Consider consolidating or disabling redundant workflows.
