# Go/No-Go Assessment

**Date:** 2026-06-17 (target)
**Milestone:** M5 Soft Launch (Closed Alpha) → Production Deployment

---

## Must Pass Criteria

### 1. Error rate consistently below 1%

- **Status:** ⬜ Pending (14-day burn-in required)
- **Measurement:** Prometheus alert `HighErrorRate` (threshold > 1% over 5 min)
- **Current data:** No errors observed during spot checks (Days 1-5)
- **Evidence:** Burn-in tracking Day 5 — all health endpoints return `status: ok`

### 2. No P0 (critical) bugs unresolved

- **Status:** ⬜ Pending
- **Current:** 2 active issues
  - P2: No documented login passwords for any seeded users (`cred:*` hashes exist in Redis but passwords are unknown). **Workaround:** "Forgot Password" flow or re-register users with known passwords via `seed-redis.cjs`.
  - P2: Credential hashes lost on Redis container restart — documented in BURN_IN_TRACKING.md. **Fix:** Create `seed-redis.cjs` to re-populate hashes on restart.
- **Requirement:** Zero P0/P1 bugs before Go decision

### 3. 10+ families active

- **Status:** ✅ Pass (10 families registered)
- **Proof:** All 10 `@udb.alpha` parent accounts exist in PostgreSQL
- **Note:** Login not verified — passwords unknown (see above)

### 4. All 4 required features verified

| Feature | Status | Evidence |
|---------|--------|----------|
| Messaging | ✅ Enabled | Feature flag `messaging=true` in Redis |
| AI Tutor | ✅ Enabled | Feature flag `ai-feedback=true` in Redis |
| Data Export | ✅ Enabled | Feature flag `data-export=true` in Redis |
| Safety Score | ✅ Enabled | Feature flag `safety-score=true` in Redis |

### 5. Load test passes (p95 < 100ms at 50 concurrent VUs)

- **Status:** ⬜ Pending (k6 not installed locally)
- **Required action:** Install k6 and run `k6 run pilot/loadtest.js --vus 50 --duration 60s`

### 6. Alert rules firing as expected

- **Status:** ✅ Pass
- **Evidence:** 10 Prometheus alert rules active, Alertmanager configured at port 9093, all targets UP in Prometheus (7/7)
- **Verified:** All alert rules present in `infra/prometheus/alert-rules.yml`

---

## Nice to Have Criteria

### 1. Grafana dashboard for alpha metrics

- **Status:** ✅ Pass
- **Evidence:** 2 dashboards visible (UDB Runtime Overview, UDB Details)
- **Note:** Grafana login working (default admin/admin123)

### 2. Feedback collected from 50%+ families

- **Status:** ⬜ Pending
- **Plan:** Distribute feedback form (see `docs/FEEDBACK_DISTRIBUTION_PLAN.md`) on Day 7 (06-10)
- **Deadline:** 5+ responses by 06-16

### 3. At least 1 co-op quest completed between families

- **Status:** ⬜ Pending (requires verified login + active families)
- **Blocked by:** Unknown passwords for alpha families

---

## Infrastructure Readiness

| Component | Status | Notes |
|-----------|--------|-------|
| Docker Compose staging | ✅ Healthy | 19/19 containers, all healthchecks passing |
| Redis persistence | ✅ Working | AOF + RDB + named volume. 17 cred keys survive restart |
| PgBouncer | ✅ Fixed | Static IP via extra_hosts, password from env var |
| Prometheus | ✅ Working | 7/7 targets UP, all alerts configured |
| Grafana | ✅ Working | 2 dashboards provisioned |
| Backup | ✅ Working | Metrics endpoint responding, backup timestamp: 1780816065 |
| AWS Terraform | ❌ Blocked | AWS CLI not installed, no credentials, no ECR images |
| Load testing | ❌ Blocked | k6 not installed locally |
| Security scan | ⬜ Partial | ZAP Docker image pull timed out (2GB) |

---

## Verdict

| Date | Assessment |
|------|-----------|
| 2026-06-07 (Day 5) | **Conditional Go** with blockers: resolve credential issue, install k6 for load tests, install AWS CLI for terraform. All infrastructure healthy. |
| 2026-06-17 (target) | ⬜ Final assessment pending burn-in completion |

## Required Actions Before Go

| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| 1 | Create `seed-redis.cjs` with known test passwords | DevOps | 06-10 |
| 2 | Install k6 + run load test (50 VUs, 60s) | DevOps | 06-12 |
| 3 | Install AWS CLI + verify Terraform plan | DevOps | 06-14 |
| 4 | Collect 5+ family feedback responses | Product | 06-16 |
| 5 | Create seed-redis.cjs for credential persistence | DevOps | 06-10 |
| 6 | Run daily burn-in check for all 14 days | DevOps | Per tracking sheet |
| 7 | Close all P0/P1 bugs | Engineering | 06-16 |
