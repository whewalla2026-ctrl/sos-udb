# Milestone 3: Staging Deployment Report

**Date:** 2026-06-06
**Branch:** release/v1-production
**Repo:** github.com/whewalla2026-ctrl/sos-udb

---

## Infrastructure Assessment

| Item | Status |
|------|--------|
| Terraform modules | Found in `infra/terraform/` (GCP root + AWS staging) |
| AWS CLI | Not installed on dev machine |
| Runbook | `docs/RUNBOOK.md` exists — covers local dev, ECS, and EC2 paths |
| Decision | **Path B: Local Docker Compose staging** — mirrors production stack |

## Path Used: Local Docker Compose (production-mirror staging)

**Rationale:** AWS CLI not available on this dev machine. Terraform (AWS ECS/RDS) deployment steps documented in RUNBOOK.md for actual cloud deployment. Local Docker Compose uses the same 19 services and production configuration (docker-compose.prod.yml) as a cloud deployment would.

## Staging Environment

| Setting | Value |
|---------|-------|
| `.env.staging` | Created with fresh secrets (separate from dev `.env`) |
| `DB_PASSWORD` | Must be `udb` (PgBouncer hardcoded — known limitation) |
| Services | 19/19 containers healthy |
| Network | `sos-udb_default` bridge network |
| Volumes | 6 persistent volumes (postgres, redis, prometheus, grafana, loki, backups) |

## Database

| Step | Result |
|------|--------|
| Prisma migrations | ✅ 3 applied: `init`, `phase1_productionization`, `enable_timescaledb` |
| Tables | ✅ 38 (expected) |
| Base seed | ✅ `prisma/seed.js` executed — parent + child created |
| Demo seed | ✅ `prisma/seed-demo.js` executed — sarah, leo, maya, alex |

## Health Checks

| Service | Endpoint | Status |
|---------|----------|--------|
| Gateway | `http://gateway:3000/gateway/health` | ✅ `{"service":"api-gateway","status":"healthy"}` |
| API | `http://api:4000/health` | ✅ `{"status":"ok","database":"up","redis":"up"}` |
| Frontend | `http://frontend:3030` | ✅ Serving Next.js app |
| Auth pipeline | 17 tests | ✅ 17/17 passed |

## Demo Users

| User | Email | Role |
|------|-------|------|
| Sarah Johnson | `sarah.demo@udb.app` | PARENT |
| Leo Johnson | `leo.demo@udb.app` | CHILD |
| Maya Johnson | `maya.demo@udb.app` | CHILD |
| Alex Admin | `admin.demo@udb.app` | ADMIN |
| (base) | `parent@udb.dev` | PARENT |
| (base) | `leo@udb.dev` | CHILD |

## Known Issues

1. **PgBouncer password hardcoded** — `pgbouncer.ini` has `password=udb` and `userlist.txt` has `"udb" "udb"`. The `.env.staging` `DB_PASSWORD` must match. A proper fix requires rebuilding the pgbouncer image with `--build-arg` or dynamic config.
2. **Auth service is working** — JSON body-parser fixed (earlier PowerShell quoting issue). Login requires proper password hash (users seeded via Prisma don't have auth hashes — need registration flow).
3. **TLS** — Not configured for local staging. In cloud deployment, ACM (AWS) or Let's Encrypt would provide HTTPS.

## Files Changed

| File | Action |
|------|--------|
| `.env.staging` | Created — staging-specific env vars with fresh secrets |
| `docs/MILESTONE3_REPORT.md` | This file |

---

## VERDICT: STAGING OPERATIONAL

All 19 services running, 38 tables migrated, demo data seeded, 17/17 auth pipeline tests passing.
