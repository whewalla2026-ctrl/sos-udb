# Changelog

## [2.0.0] — 2026-05-09 — Enterprise Production Release

### Added
- **Frontend**: 23 dashboard pages with Apollo Client GraphQL integration
- **Frontend**: 5 new routes (Calendar, Achievements, Marketplace, Settings, Child Detail)
- **Frontend**: SSR-safe Apollo wrapper with dynamic import
- **Frontend**: 29 GraphQL operations (13 queries, 16 mutations)
- **Backend**: NestJS GraphQL API with 30 modules, auth guards on all resolvers
- **Backend**: OpenTelemetry distributed tracing on all 6 Node.js services
- **Backend**: W3C Trace Context propagation with correlation ID integration
- **Infrastructure**: Docker Compose (3 variants) + Dockerfiles for 5 services
- **Infrastructure**: Kubernetes manifests for 7 services with HPA, PDB, network policies
- **Security**: Input validation, rate limiting, brute force protection, audit logging

### Fixed
- **CRITICAL**: Firebase strategy — mock-secret-for-testing replaced with env var
- **CRITICAL**: Blockchain service — simulated Math.random() txHash replaced with proper error
- **HIGH**: Escrow service — sk_test_mock Stripe key replaced with env validation
- **MEDIUM**: LMS sync — hardcoded mockAssignments replaced with real API calls
- **Security**: CSP, HSTS, CORS headers enforced on all services

### Changed
- **Frontend**: All 10+ dashboard pages rewired from MOCK_* constants to Apollo hooks
- **Frontend**: Sidebar uses live GET_ME query instead of hardcoded user
- **Backend**: Auth service with JWT refresh token rotation
- **Backend**: Queue-based async processing with idempotency support
- **Observability**: Enhanced Prometheus metrics with 17 metric families

### Removed
- All MOCK_* constants from frontend source (0 remaining)
- Hardcoded test secrets from service code
- Simulated blockchain transactions

### Security
- JWT authentication with refresh rotation
- RBAC with 4-level role hierarchy (ADMIN→CHILD)
- Tenant isolation middleware
- Rate limiting on all endpoints
- Brute force protection on auth routes
- Input validation on all API endpoints

### Performance
- Load test: 10k requests in 15s, p50=290ms, p99=558ms
- 663 req/s sustained throughput
- PostgreSQL query p50=6ms
- Auto-scaling with HPA configured
