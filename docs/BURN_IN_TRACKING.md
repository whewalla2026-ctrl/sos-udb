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
|  5 | 06-07 | 100% | 0% | 7 | 0 | Phase 5C families onboarded |
|  6 |      |      |            |           |               | |
|  7 |      |      |            |           |               | |
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
