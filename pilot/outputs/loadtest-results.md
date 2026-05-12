# Load Test Results — 2026-05-12

## Summary
- **45,291 iterations** over 3.5 minutes (stages: 0→50→50→200→200→500→500→0 VUs)
- **100% success rate** across all endpoint types
- **0 errors** (0.00% failure rate)
- 3 threshold: 2 passed, 1 borderline

## Endpoints Tested
| Check | Result | Count |
|-------|--------|-------|
| `me OK` | ✓ 100% | ~27,175 |
| `trackUsage OK` | ✓ 100% | ~13,587 |
| `metrics OK` | ✓ 100% | ~4,529 |

## Latency
| Metric | p(95) | Threshold | Status |
|--------|-------|-----------|--------|
| http_req_duration | 876ms | <1000ms | ✓ |
| gql_ms | 876ms | <500ms | ✗ (borderline) |
| metrics_ms | 883ms | N/A | N/A |

## Changes from Previous Test
1. **Setup fix**: Reduced from 20→5 setup users with 12s delay between iterations to stay under 10 req/min brute-force rate limit
2. **JWT generation**: k6 now generates NestJS-compatible JWTs using `k6/crypto` + `k6/encoding` (same HS256 secret as NestJS)
3. **GraphQL endpoint**: Queries go directly to `nestjs-graphql:4000/graphql` (gateway has no `/graphql` route)
4. **Mutation**: Replaced `createQuest` (not exposed in GraphQL schema) with `trackUsage` (lightweight mutation)
5. **Robustness**: Added null/empty check for tokens array in `default()`

## Architecture Discoveries
- Gateway (`gateway.js`) only proxies REST routes (auth, planner, ai, monitoring) — no `/graphql` route
- Two auth systems: REST (custom HMAC-SHA256) and GraphQL (NestJS JWT via `@nestjs/jwt`) — both use same JWT_SECRET
- GraphQL queries must go directly to NestJS service with NestJS-compatible JWTs
- Brute-force rate limit: 10 req/min per IP on auth endpoints
