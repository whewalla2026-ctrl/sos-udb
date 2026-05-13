# Phase 8: Load Test Report

## Score: 5.5/10

## Methodology
- Tool: k6 (grafana/k6:latest Docker image — run on `sos-udb_default` network)
- Target: `http://nestjs-graphql:4000`
- Stages: 100 → 500 → 1000 → 2000 concurrent VUs (ramp-up/hold/ramp-down per stage)
- Duration: ~5 minutes total per test run
- Endpoints tested:
  - `GET /metrics` (unauthenticated)
  - `POST /graphql` — `{ me { id email role displayName } }` (JWT-authenticated read query)
  - `POST /graphql` — `createQuest` mutation (JWT-authenticated write)

## Results (First Run — before throttler fix)

```
http_req_duration..............: avg=1.41s   p(50)=466ms  p(90)=2.20s  p(95)=2.67s
  { expected_response:true }...: avg=1.46s   p(50)=1.31s  p(90)=2.45s  p(95)=2.86s
http_req_failed................: 76.86%  (92,394 / 120,208)
checks_succeeded...............: 23.13%  (27,814 / 120,208)
http_reqs......................: 120,208 (272.57/s)
iterations.....................: 119,850 (271.76/s)
```

### Per-Endpoint Breakdown
| Endpoint | Success Rate | p50 | p95 |
|----------|-------------|-----|-----|
| `me` (auth read) | 57% | ~450ms | ~2.6s |
| `metrics` (unauthenticated) | 1% | N/A | N/A |
| `createQuest` (auth write) | N/A (not yet tested on first run) | N/A | N/A |

## Root Cause of 77% Failure Rate

1. **ThrottlerGuard at 60 req/min per IP** — All k6 VUs share the k6 container's single source IP. At just 100 VUs making ~2 req/s each, the 60 req/min limit is instantly exhausted. This caused 100% of `/metrics` requests and ~40% of GraphQL requests to be rejected with HTTP 429.
2. **Introspection disabled in production** — 40% of first-run traffic targeted `{ __schema { types { name } } }` which returns 400 in production since `introspection: false`. All such requests failed.
3. **Single-threaded Node.js event loop** — NestJS runs a single process. At >500 concurrent requests, the event loop saturates and latency climbs non-linearly.

## Optimizations Applied

### 1. UdbThrottlerGuard (`src/shared/throttler.guard.ts`)
- Skips rate limiting for `/metrics` endpoint entirely
- Uses `user:{userId}` as tracker key for authenticated requests (per-user buckets)
- Increases global limit from 60 → 600 req/min
- Falls back to IP tracking for unauthenticated requests
- All changes typechecked and compiled

### 2. Test Script Redesigned (`pilot/loadtest.js`)
- 60% authenticated read queries (`me`), 20% write mutations (`createQuest`), 20% `/metrics`
- JWT generated in-script using k6 crypto (HMAC-SHA256 with production secret)
- Per-user rate limit tracking for authenticated calls
- Realistic sleep (0.2–1.2s) between iterations

### 3. Metrics Wiring (Phase 7 follow-up)
- All 12 custom counters (`signupsTotal`, `questsCompleted`, etc.) now wired to service code
- HTTP request metrics middleware (duration + status code)
- ActiveUsers gauge via `@Cron('*/5 * * * *')` in AnalyticsService
- `lastSeenAt` updated on every login for DAU accuracy

## Predicted Results After Fixes
| Metric | Before | Expected After |
|--------|--------|---------------|
| p95 latency (read) | 2.67s | <500ms |
| p95 latency (write) | N/A | <800ms |
| Error rate | 76.86% | <5% |
| Throughput | 273 req/s | >1000 req/s |
| Metrics endpoint | 1% success | 100% (unthrottled) |

## Recommendations for Sub-500ms p95 at 10k Users

| # | Action | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Enable Node.js clustering** (`pm2` or `cluster` module) — run 4+ workers | 4x throughput, lower p95 | Low |
| 2 | **Add Redis-based response caching** for `me`, `getUser`, `getDashboardData` queries | 50-80% fewer DB hits | Medium |
| 3 | **Connection pool tuning** — Increase PgBouncer `default_pool_size` from 25→100 | Higher concurrent DB throughput | Low |
| 4 | **GraphQL DataLoader** — Batch+N+1 elimination for nested resolvers | Eliminates N+1 waterfall queries | Medium |
| 5 | **Implement HTTP/2** for multiplexing | Reduces head-of-line blocking | Low |
| 6 | **Horizontal scaling** — Run 3+ NestJS replicas behind gateway | Linear throughput scaling | Medium |
| 7 | **Rate limit by user ID** (already done in throttler.guard.ts) | Per-user fairness | Done |

## Blocking Issue
Docker Desktop Linux VM entered unrecoverable state post `wsl --shutdown`. Container rebuild + re-run of load test with fixes could not be completed. Fix: Restart Docker Desktop or reboot host.
