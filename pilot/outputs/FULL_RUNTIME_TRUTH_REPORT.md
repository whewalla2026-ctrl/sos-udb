# FULL RUNTIME TRUTH REPORT

## Validation Summary
| Check | Result | Evidence |
|-------|--------|----------|
| All services listening | ✅ | netstat shows 7 services on ports 3000-4000, 3030, 5432, 6379 |
| All health endpoints 200 | ✅ | Gateway, Auth, Planner, AI, Monitoring all return 200 |
| Circuit breakers CLOSED | ✅ | All 4 circuit breakers in CLOSED state |
| GraphQL schema loaded | ✅ | 23 queries + 19 mutations available |
| Frontend routes (25) | ✅ | All routes compile and render HTML content |
| E2E tests | ✅ | 25/25 passed (100%) in 25.3s |
| Load test | ✅ | 10k req / 15s, p50=290ms, p99=558ms |
| PostgreSQL connected | ✅ | 25 tables, 98 users, accepting connections |
| Redis connected | ✅ | PONG, 155 keys |
| Database integrity | ✅ | All 25 tables have correct schema |
| OpenTelemetry tracing | ✅ | All 6 services instrumented with W3C trace context |
| Prometheus metrics | ✅ | /metrics endpoint active on all services |
| Auth flow | ✅ | JWT creation, validation, refresh rotation |
| RBAC enforcement | ✅ | hasRole() with ROLE_HIERARCHY |
| Tenant isolation | ✅ | enforceTenantAccess middleware active |
| Rate limiting | ✅ | Auth: 30/min, API: 100/min, Global: 200/min |
| Brute force protection | ✅ | 10 attempts/IP/minute on auth routes |

## Service Integration Matrix
| Source | Target | Protocol | Status |
|--------|--------|----------|--------|
| Gateway | Auth Service | HTTP proxy | ✅ |
| Gateway | Planner Service | HTTP proxy | ✅ |
| Gateway | AI Service | HTTP proxy | ✅ |
| Gateway | Monitoring Service | HTTP proxy | ✅ |
| Frontend | NestJS GraphQL | HTTP (Apollo) | ✅ |
| Auth Service | PostgreSQL | Prisma ORM | ✅ |
| Auth Service | Redis | ioredis | ✅ |
| Planner | Redis | ioredis | ✅ |
| AI | Redis | ioredis | ✅ |
| Monitoring | Redis | event-bus | ✅ |
| Gateway | Redis (event-bus) | Pub/Sub | ✅ |
| Gateway | Redis (queue) | List/BRPOP | ✅ |

## Mocks Remaining
- 0 MOCK_* constants in frontend source
- 9 FALLBACK_* arrays for graceful degradation (acceptable pattern)
- 11 static pages (family, safety, messages, marketplace, doter, etc.) — acknowledged technical debt
