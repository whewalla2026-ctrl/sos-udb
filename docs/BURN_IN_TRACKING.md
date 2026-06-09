# Closed Alpha Burn-In Tracking Sheet

**Milestone:** M5 Soft Launch (Closed Alpha)
**Start Date:** 2026-06-03
**End Date (Go/No-Go):** 2026-06-17 (14 days)

## Metrics Dashboard

| Day | Date | Uptime % | Error Rate | New Users | Reported Bugs | Notes |
|-----|------|----------|------------|-----------|---------------|-------|
|  1 | 06-03 | 100% | 0% | 3 | 0 | Phase 5B families onboarded |
|  2 | 06-04 | 100% | 0% | 0 | 0 | Auth crash-loop (PgBouncer DNS) resolved |
|  3 | 06-05 | 100% | 0% | 0 | 0 | Monaco editor issue (pre-existing) |
|  4 | 06-06 | 100% | 0% | 0 | 0 | Stable |
|  5 | 06-07 | 100% | 0% | 7 | 0 | Phase 5C onboarded + PR #6 deployed. Burn-in check 12/12 pass. Backup ts: 1780816065. Known: no known login password for seeded users |
|  6 | 06-08 | 100% | 0% | 0 | 0 | Stable |
|  7 | 06-09 | 100% | ~0.03% | 0 | 0 | All 7/7 Prometheus targets UP, 19 cred keys, 18 users, 566 errors (24h), auth pipeline 16/17 pass |
|  8 |      |      |            |           |               | |
|  9 |      |      |            |           |               | |
| 10 |      |      |            |           |               | |
| 11 |      |      |            |           |               | |
| 12 |      |      |            |           |               | |
| 13 |      |      |            |           |               | |
| 14 | 06-17 |      |            |           |               | Go/No-Go Gate |

## Go/No-Go Criteria

### Must Pass
- [ ] Error rate consistently below 1%
- [ ] No P0 (critical) bugs unresolved
- [ ] 10+ families active (10 registered ✅)
- [ ] All 4 required features verified (messaging, ai-tutor, data-export, safety-score)
- [ ] Load test passes (p95 < 100ms at 50 concurrent VUs)
- [ ] Alert rules firing as expected

### Nice to Have
- [ ] Grafana dashboard for alpha metrics
- [ ] Feedback collected from 50%+ families
- [ ] At least 1 co-op quest completed between families

## Incident Log

| Date | Severity | Description | Resolution | Owner |
|------|----------|-------------|------------|-------|
| 06-04 | P1 | Auth container crash-loop (PgBouncer DNS resolve failure) | Restart PgBouncer | DevOps |
| 06-04 | P2 | Redis credential hashes lost on container restart | Re-run seed-redis.cjs | DevOps |
| 06-04 | P3 | Monaco editor font rendering bug after auth service restart | Refresh browser | Frontend |
| 06-07 | P2 | No documented passwords for any seeded users — all cred:* hashes exist in Redis but passwords are unknown | Create seed-redis.cjs with known test passwords | DevOps |
