# Phase 12: Production Deployment Proof

## Score: 6.0/10 (Deployment verification blocked by Docker Desktop)

## Current State
- **Docker Desktop:** Linux VM unreachable (post `wsl --shutdown`). Engine returns HTTP 500 on all API calls.
- **All containers:** Stopped (were running in WSL2 docker-desktop distro which was terminated)
- **All code changes:** Built and typechecked, awaiting container rebuild

## Deployment Readiness Checklist

### ✅ DONE — Code Complete
| # | Item | Status |
|---|------|--------|
| 1 | All source code compiles (`tsc --noEmit` passes on all 4 packages) | ✅ |
| 2 | API build succeeds (`nest build`) | ✅ |
| 3 | Prisma migrations applied (2 migrations, zero drift) | ✅ |
| 4 | 38 database tables present | ✅ |
| 5 | Security fixes applied (JWT algorithm, prompt injection, throttler) | ✅ |
| 6 | Metrics wiring complete (12 Prometheus counters wired) | ✅ |
| 7 | Frontend builds (40 routes, all compile) | ✅ |

### ✅ DONE — Infrastructure
| # | Item | Status |
|---|------|--------|
| 1 | `docker-compose.prod.yml` defines all 18 services | ✅ |
| 2 | All services have `restart: unless-stopped` | ✅ |
| 3 | All stateful services have persistent volume mounts | ✅ |
| 4 | Health checks configured on all production services | ✅ |
| 5 | PgBouncer connection pooling (transaction mode) | ✅ |
| 6 | Redis AOF + RDB persistence configured | ✅ |
| 7 | Prometheus + Grafana + Loki + Alertmanager provisioned | ✅ |
| 8 | Jaeger tracing (OTel collector) configured | ✅ |

### ⛔ BLOCKED — Requires Docker Recovery
| # | Item | Status | Command |
|---|------|--------|---------|
| 1 | `docker compose -f docker-compose.prod.yml build` | ⛔ | Rebuild all images with latest code |
| 2 | `docker compose -f docker-compose.prod.yml up -d` | ⛔ | Start all 18 containers |
| 3 | Verify all 18 containers healthy | ⛔ | `docker ps --filter "status=running" \| wc -l` |
| 4 | Verify GraphQL endpoint responds | ⛔ | `curl http://localhost:4000/graphql` |
| 5 | Verify metrics endpoint | ⛔ | `curl http://localhost:4000/metrics` |
| 6 | Verify prometheus targets UP | ⛔ | `curl http://localhost:9090/api/v1/targets` |
| 7 | Verify Grafana dashboards load | ⛔ | `curl http://localhost:3005/api/health` |
| 8 | Verify Loki log ingestion | ⛔ | `curl http://localhost:3100/ready` |
| 9 | Run E2E smoke test | ⛔ | k6 or curl-based flow test |
| 10 | Run load test (with fixed throttler) | ⛔ | k6 Docker container |

## Deployment Commands (When Docker Recovers)

```bash
# 1. Build all images
docker compose -f docker-compose.prod.yml build

# 2. Start all services
docker compose -f docker-compose.prod.yml up -d

# 3. Verify all 18 containers healthy
docker ps --format "table {{.Names}}\t{{.Status}}"

# 4. Check NestJS app responds (inside container)
docker exec udb-nestjs curl -s http://localhost:4000/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'

# 5. Check metrics
docker exec udb-nestjs curl -s http://localhost:4000/metrics | grep udb_signups

# 6. Check Prometheus
curl http://localhost:9090/api/v1/targets

# 7. Check Grafana
curl http://localhost:3005/api/health

# 8. Check Loki
curl http://localhost:3100/ready

# 9. Run load test (with fixed throttler)
docker run --rm --network sos-udb_default -v "%CD%\pilot\loadtest.js:/loadtest.js:ro" grafana/k6 run /loadtest.js

# 10. Check all containers logs for errors
docker compose -f docker-compose.prod.yml logs --tail=20
```

## Recovery from Docker Desktop Failure
```bash
# Option 1: Restart Docker service
Restart-Service -Name "com.docker.service" -Force

# Option 2: Restart WSL2
wsl --shutdown
# Wait 30s, then restart Docker Desktop

# Option 3: Full reboot
# Restart-Computer -Force

# After recovery:
docker compose -f docker-compose.prod.yml up -d
```

## New Files Added in This Phase
- `services/api/src/shared/http-metrics.middleware.ts` — HTTP request metrics middleware
- `services/api/src/shared/throttler.guard.ts` — Custom throttler (skips /metrics, per-user tracking)
- `pilot/loadtest.js` — k6 load test script (100→2000 VU stages)
