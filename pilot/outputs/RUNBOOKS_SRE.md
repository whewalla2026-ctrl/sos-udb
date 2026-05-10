# UDB Platform SRE Runbooks

**Platform:** SOS-UDB (Unified Developmental Backbone)
**Version:** 2.0 (Docker-native)
**Last Updated:** 2026-05-09
**Classification:** Production Operations — SRE

---

## Table of Contents

1. [INCIDENT RESPONSE GUIDE](#1-incident-response-guide)
2. [SERVICE RESTART PROCEDURES](#2-service-restart-procedures)
3. [DEBUGGING CHECKLIST](#3-debugging-checklist)
4. [FAILURE INJECTION RECOVERY](#4-failure-injection-recovery)
5. [SERVICE HEALTH CHECK REFERENCE](#5-service-health-check-reference)
6. [BACKUP & RECOVERY](#6-backup--recovery)

---

## 1. INCIDENT RESPONSE GUIDE

### 1.1 Incident Severity Levels (P0–P3)

| Severity | Definition | Response Time | SLO Impact | Examples |
|----------|-----------|--------------|------------|---------|
| **P0 (Critical)** | Complete platform outage, data loss, or security breach | < 5 min | Breach SLO | Gateway 503 for all users, PostgreSQL data corruption, unauthorized data access |
| **P1 (High)** | Major feature degradation affecting >25% of users | < 15 min | Risk SLO breach | Auth service down, Redis cluster failure, high latency (>2s p95) |
| **P2 (Medium)** | Partial degradation, single-user issues, non-critical feature broken | < 60 min | SLO intact | Frontend page error, planner service slow, individual login failures |
| **P3 (Low)** | Minor issues, cosmetic bugs, capacity planning | Next business day | No impact | Grafana dashboard missing, log verbosity too high, deprecation warnings |

### 1.2 Detection Methods

| Method | Tool | Endpoint/Config | Alert Example |
|--------|------|----------------|---------------|
| **Grafana Alerts** | Grafana (port 3005) | Pre-configured dashboards via `infra/grafana/dashboards/` | "Gateway p95 latency > 1s" |
| **Prometheus Queries** | Prometheus (port 9090) | `http://localhost:9090/api/v1/query?query=up` | Target `udb-auth` down |
| **Docker Health Checks** | Docker Engine | `docker ps --filter "health=unhealthy"` | Container status shows `(unhealthy)` |
| **Container Status** | Docker CLI / Desktop | `docker ps --format "{{.Names}} {{.Status}}"` | Container exited or restarting |
| **Jaeger Tracing** | Jaeger (port 16686) | `http://localhost:16686/search` | Span error rate > 5% |
| **Synthetic Health Checks** | curl / monitoring-service | `http://localhost:3000/gateway/health` | Non-200 response |
| **Docker Events** | Docker Engine | `docker events --filter type=container` | Unexpected container stop |

### 1.3 Incident Response Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                    DETECT (0–2 min)                             │
│  Alert fires OR monitoring dashboard shows anomaly              │
│  → Acknowledge alert in monitoring channel                     │
│  → Confirm impact scope (single service vs platform-wide)       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    TRIAGE (2–5 min)                             │
│  - Check `docker ps` for all 14 containers                     │
│  - Check `docker logs --tail=100 <unhealthy-container>`        │
│  - Check Prometheus targets: http://localhost:9090/targets    │
│  - Determine severity level (P0–P3)                            │
│  - Declare incident if P0/P1                                   │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MITIGATE (5–15 min)                          │
│  - Apply runbook-specific procedure below                      │
│  - Restart failing service(s) with dependency order            │
│  - If DB-related: check pgBouncer pools first                  │
│  - If all containers down: `docker compose up -d`              │
│  - Monitor recovery via health check endpoints                 │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RESOLVE (15–30 min)                          │
│  - All health checks return 200 OK                             │
│  - Prometheus targets all UP                                   │
│  - Jaeger traces flowing to all services                       │
│  - Load test passes: run `pilot\load-test.ps1`                 │
│  - Close incident / downgrade severity                         │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTMORTEM (within 48h)                      │
│  - Document timeline (detect → triage → mitigate → resolve)   │
│  - Identify root cause                                          │
│  - Create P0/P1 action items to prevent recurrence              │
│  - Update runbook with lessons learned                          │
│  - Update error budget if applicable                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 Escalation Paths

```
Level 1 (Primary On-Call SRE)
  → docker inspect, log analysis, container restart
  → Contact: sre@sos-udb.io

Level 2 (Backend/Service Owner)
  → Application-level debugging, code hotfix, config changes
  → Contact: backend@sos-udb.io

Level 3 (DB Admin / Security Lead)
  → Data recovery, security incident response
  → Contact: dba@sos-udb.io / security@sos-udb.io

Level 4 (Engineering Lead)
  → Platform-wide decisions, rollback authorization
  → Contact: eng-lead@sos-udb.io
```

---

## 2. SERVICE RESTART PROCEDURES

### 2.1 Docker Compose Command Reference

All commands run from `D:\SOS-UDB`:

```powershell
# Restart a single service
docker compose -f docker-compose.prod.yml restart <service-name>

# Restart with specific stop timeout (default 10s)
docker compose -f docker-compose.prod.yml stop -t 30 <service-name>
docker compose -f docker-compose.prod.yml start <service-name>

# Full stack restart
docker compose -f docker-compose.prod.yml down -t 30
docker compose -f docker-compose.prod.yml up -d

# Rebuild and restart a single service
docker compose -f docker-compose.prod.yml build <service-name>
docker compose -f docker-compose.prod.yml up -d <service-name>
```

### 2.2 Individual Service Restart Commands

| Service | Container Name | Restart Command |
|---------|---------------|----------------|
| PostgreSQL | `udb-postgres` | `docker compose -f docker-compose.prod.yml restart postgres` |
| pgBouncer | `udb-pgbouncer` | `docker compose -f docker-compose.prod.yml restart pgbouncer` |
| Redis | `udb-redis` | `docker compose -f docker-compose.prod.yml restart redis` |
| Gateway | `udb-gateway` | `docker compose -f docker-compose.prod.yml restart gateway` |
| Auth Service | `udb-auth` | `docker compose -f docker-compose.prod.yml restart auth-service` |
| Planner Service | `udb-planner` | `docker compose -f docker-compose.prod.yml restart planner-service` |
| AI Service | `udb-ai` | `docker compose -f docker-compose.prod.yml restart ai-service` |
| Monitoring Service | `udb-monitoring` | `docker compose -f docker-compose.prod.yml restart monitoring-service` |
| NestJS GraphQL | `udb-nestjs` | `docker compose -f docker-compose.prod.yml restart nestjs-graphql` |
| Frontend | `udb-frontend` | `docker compose -f docker-compose.prod.yml restart frontend` |
| OTEL Collector | `udb-otel-collector` | `docker compose -f docker-compose.prod.yml restart otel-collector` |
| Jaeger | `udb-jaeger` | `docker compose -f docker-compose.prod.yml restart jaeger` |
| Prometheus | `udb-prometheus` | `docker compose -f docker-compose.prod.yml restart prometheus` |
| Grafana | `udb-grafana` | `docker compose -f docker-compose.prod.yml restart grafana` |

### 2.3 Graceful Restart Procedures

Each service is configured with `restart: unless-stopped` and Docker Compose sends SIGTERM on restart. Services implement graceful shutdown handlers.

**Docker CLI equivalents (for targeted debugging):**
```powershell
# Graceful stop (SIGTERM, 5s timeout)
docker stop -t 5 udb-auth

# Check status
docker wait udb-auth

# Start
docker start udb-auth

# Force kill (SIGKILL — last resort only)
docker kill udb-auth
```

### 2.4 Dependency-Aware Restart Order

Critical: Services have `depends_on` conditions in `docker-compose.prod.yml`. When restarting the full stack, follow this order:

```
Phase 1 — Data Layer (start first, wait for healthy)
  └── postgres    (pg_isready health check, ~10s)
  └── redis       (redis-cli ping health check, ~10s)

Phase 2 — Connection Pooling
  └── pgbouncer   (depends on: postgres healthy, ~15s)

Phase 3 — Backend Services (depends on: postgres + redis healthy)
  ├── auth-service         (port 3001)
  ├── planner-service      (port 3002)
  ├── ai-service           (port 3003)
  └── monitoring-service   (port 3004)

Phase 4 — API Gateway (depends on: redis + postgres healthy)
  └── gateway              (port 3000)

Phase 5 — GraphQL API (depends on: postgres + redis healthy)
  └── nestjs-graphql       (port 4000)

Phase 6 — Frontend (depends on: gateway healthy)
  └── frontend             (port 3030)

Phase 7 — Observability (independent, start any time)
  ├── jaeger               (port 16686)
  ├── otel-collector       (port 4318, depends on: jaeger)
  ├── prometheus           (port 9090, depends on: gateway)
  └── grafana              (port 3005, depends on: prometheus)
```

**Full recovery script:**
```powershell
Write-Output "=== Full Stack Recovery ==="

# Phase 1
docker compose -f docker-compose.prod.yml up -d postgres redis
Wait-ContainerHealthy "udb-postgres" 30
Wait-ContainerHealthy "udb-redis" 30

# Phase 2
docker compose -f docker-compose.prod.yml up -d pgbouncer
Wait-ContainerHealthy "udb-pgbouncer" 30

# Phase 3
docker compose -f docker-compose.prod.yml up -d auth-service planner-service ai-service monitoring-service
Wait-ContainerHealthy "udb-auth" 30

# Phase 4
docker compose -f docker-compose.prod.yml up -d gateway
Wait-ContainerHealthy "udb-gateway" 30

# Phase 5
docker compose -f docker-compose.prod.yml up -d nestjs-graphql

# Phase 6
docker compose -f docker-compose.prod.yml up -d frontend
Wait-ContainerHealthy "udb-frontend" 30

# Phase 7
docker compose -f docker-compose.prod.yml up -d jaeger otel-collector prometheus grafana

Write-Output "=== Full Stack Recovery Complete ==="
```

Helper function used above:
```powershell
function Wait-ContainerHealthy($name, $timeoutSec = 60) {
    $elapsed = 0
    while ($elapsed -lt $timeoutSec) {
        $status = docker ps --filter "name=$name" --format "{{.Status}}" 2>&1
        if ($status -match "healthy") { return $true }
        Start-Sleep -Seconds 3
        $elapsed += 3
    }
    return $false
}
```

---

## 3. DEBUGGING CHECKLIST

### 3.1 Auth Failure (P0/P1)

**Step 1: Verify gateway is routing auth requests**
```powershell
# Check gateway logs for auth routing
docker logs --tail=50 udb-gateway

# Direct auth health check (bypasses gateway)
curl -s http://localhost:3001/auth/health
# Expected: {"service":"auth-service","status":"healthy","timestamp":"..."}
```

**Step 2: Check auth service logs**
```powershell
docker logs --tail=100 udb-auth
# Look for: "error", "ECONNREFUSED", "JWT", "Firebase", "Unauthorized"
```

**Step 3: Test auth endpoints directly**
```powershell
# Register test
curl -s -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"diag@test.com","password":"Diag123!","displayName":"Diagnostic"}'

# Login test
curl -s -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"diag@test.com","password":"Diag123!"}'
# Expected: 200 with {"token":"eyJ..."}
```

**Step 4: Verify Firebase connectivity (if configured)**
```powershell
# Check if Firebase env vars are set
docker inspect udb-auth | Select-String "FIREBASE\|GOOGLE"
```

**Step 5: Check Redis for brute-force lockout keys**
```powershell
docker exec udb-redis redis-cli KEYS '*bruteforce*'
# If keys exist, clear them:
docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0
```

**Step 6: Verify JWT secret consistency**
```powershell
# Both gateway and auth need the same JWT_SECRET
$gwEnv = docker inspect udb-gateway --format '{{range .Config.Env}}{{println .}}{{end}}' | Select-String "JWT_SECRET"
$authEnv = docker inspect udb-auth --format '{{range .Config.Env}}{{println .}}{{end}}' | Select-String "JWT_SECRET"
Write-Output "Gateway JWT: $gwEnv"
Write-Output "Auth JWT: $authEnv"
```

### 3.2 Database Connection Issues (P0/P1)

**Step 1: Check pgBouncer pool status**
```powershell
# Connect to pgBouncer admin console
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW POOLS"

# Expected output:
#  database | user  | cl_active | cl_waiting | sv_active | sv_idle | sv_used | sv_tested | sv_login | maxwait | maxwait_us | pool_mode |
#  ---------+-------+-----------+------------+-----------+---------+---------+-----------+----------+---------+------------+-----------+
#  udb      | udb   |         0 |          0 |         0 |      10 |       0 |         0 |        0 |       0 |          0 | transaction|

# Show all active connections
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW STATS"
```

**Step 2: Check PostgreSQL directly (bypass pgBouncer)**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "SELECT count(*) FROM pg_stat_activity"
docker exec udb-postgres psql -U udb -d udb -c "SELECT state, count(*) FROM pg_stat_activity GROUP BY state"
# Check for too many idle-in-transaction connections
```

**Step 3: Check postgres logs**
```powershell
docker logs --tail=100 udb-postgres
# Look for: "FATAL", "ERROR", "connection limit", "out of memory"
```

**Step 4: Verify pgBouncer config**
```powershell
docker exec udb-pgbouncer cat /etc/pgbouncer/pgbouncer.ini
# Verify: default_pool_size=50, max_client_conn=200, pool_mode=transaction
```

**Step 5: Check database connectivity from a service container**
```powershell
docker exec udb-gateway sh -c "curl -f http://pgbouncer:6432/ 2>&1 || echo 'pgBouncer reachable'"
```

### 3.3 Performance Degradation (P2/P1)

**Step 1: Check Prometheus metrics**
```powershell
# Query all service up status
curl -s "http://localhost:9090/api/v1/query?query=up" | ConvertFrom-Json | ConvertTo-Json

# Check HTTP request duration
curl -s "http://localhost:9090/api/v1/query?query=http_request_duration_ms_sum" | ConvertFrom-Json

# Check for high error rates
curl -s "http://localhost:9090/api/v1/query?query=rate(http_requests_total{status=~'5..'}[5m])" | ConvertFrom-Json
```

**Step 2: Trace slow requests in Jaeger**
```powershell
# Open in browser: http://localhost:16686/search
# Select service: "api-gateway"
# Look for traces with duration > 500ms
# Use the "Limit Results" field to find slow traces
```

**Step 3: Check Prometheus target health**
```powershell
curl -s "http://localhost:9090/api/v1/targets" | ConvertFrom-Json | ConvertTo-Json
# All targets should show health: "up"
# Target list: udb-gateway, udb-auth, udb-planner, udb-ai, udb-monitoring, udb-nestjs
```

**Step 4: Check Redis slow log and memory**
```powershell
docker exec udb-redis redis-cli SLOWLOG GET 10
docker exec udb-redis redis-cli INFO memory
# Check used_memory_rss vs maxmemory
```

**Step 5: Check container resource usage**
```powershell
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"
# Compare against resource limits:
# postgres: 512M, pgbouncer: 128M, redis: 256M, gateway: 256M, auth: 256M
# nestjs: 512M, frontend: 256M, prometheus: 512M, jaeger: 512M
```

### 3.4 Container Crashes (P0/P1)

**Step 1: List all containers and their status**
```powershell
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.RestartCount}}"
# Look for: "Exited", "Restarting", "unhealthy"
```

**Step 2: Get detailed crash logs**
```powershell
docker logs --tail=200 --timestamps <container-name>

# Get exit code and last state
docker inspect <container-name> --format '{{.State.ExitCode}} {{.State.FinishedAt}}'

# Get full container details
docker inspect <container-name>
```

**Step 3: Check Docker events around crash time**
```powershell
docker events --since 30m --filter type=container --filter event=die
```

**Step 4: Check OOM (Out of Memory) kills**
```powershell
docker inspect <container-name> --format '{{.State.OOMKilled}}'
# Returns: true or false
```

**Step 5: Check container logs for common crash patterns**
```powershell
# Node.js out of memory
docker logs <container-name> 2>&1 | Select-String "FATAL ERROR|heap limit|Allocation failed"

# Prisma/DB connection errors
docker logs <container-name> 2>&1 | Select-String "PrismaClientInitializationError|Can't reach database"

# Port conflicts
docker logs <container-name> 2>&1 | Select-String "EADDRINUSE|port already in use"

# SIGTERM handling
docker logs <container-name> 2>&1 | Select-String "SIGTERM|shutting down"
```

### 3.5 Frontend Issues (P2)

**Step 1: Check browser console**
- Open DevTools (F12) → Console tab
- Look for: CORS errors, 401/403 on API calls, JavaScript runtime errors
- Check Network tab for failed GraphQL queries

**Step 2: Check frontend container logs**
```powershell
docker logs --tail=100 udb-frontend
# Look for: Next.js build errors, API proxy errors, 404s
```

**Step 3: Verify API connectivity from frontend**
```powershell
# Frontend uses NEXT_PUBLIC_API_URL=http://localhost:3000/graphql
# Check the gateway GraphQL endpoint
curl -s -X POST http://localhost:3000/graphql -H "Content-Type: application/json" -d '{"query":"{__typename}"}'
# Expected: {"data":{"__typename":"Query"}}
```

**Step 4: Check the NestJS GraphQL endpoint (used by frontend)**
```powershell
curl -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{__typename}"}'
# Expected: {"data":{"__typename":"Query"}}
```

**Step 5: Verify frontend health endpoint**
```powershell
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030
# Expected: 200 (or 302 redirect to /login)
```

---

## 4. FAILURE INJECTION RECOVERY

These procedures correspond to the failure scenarios in `pilot\failure-injection.ps1`.

### 4.1 Redis Stop/Start Recovery

**Scenario**: Redis is stopped to simulate cache/queue failure.

**Expected degraded behavior:**
- Gateway continues serving but uses memory fallback for cache
- Queue processing pauses (events are lost in-flight)
- Service caches degrade to in-memory only

**Recovery steps:**
```powershell
# 1. Restart Redis
docker start udb-redis
# OR (if using compose)
docker compose -f docker-compose.prod.yml start redis

# 2. Wait for healthy
$recovered = $false
$elapsed = 0
while ($elapsed -lt 30) {
    $status = docker ps --filter "name=udb-redis" --format "{{.Status}}" 2>&1
    if ($status -match "healthy") { $recovered = $true; break }
    Start-Sleep -Seconds 3
    $elapsed += 3
}
Write-Output "Redis recovered: $recovered"

# 3. Verify Redis data (AOF persistence should restore)
docker exec udb-redis redis-cli PING
# Expected: PONG

docker exec udb-redis redis-cli INFO persistence
# Verify aof_enabled:1, aof_last_bgrewrite_status:ok

# 4. Verify gateway health
curl -s http://localhost:3000/gateway/health
# Expected: 200

# 5. Verify auth flow still works
curl -s -X POST http://localhost:3000/auth/health
# Expected: 200

# 6. Clear any stale brute-force keys if needed
docker exec udb-redis redis-cli EVAL "for _,k in ipairs(redis.call('keys','*bruteforce*')) do redis.call('del',k) end" 0
```

**Validation:**
- All services that depend on Redis (`gateway`, `auth-service`, `planner-service`, `ai-service`, `monitoring-service`) return healthy
- New auth registrations and logins succeed
- Queue processing resumes

### 4.2 Auth Service Restart Recovery

**Scenario**: Auth service is restarted to verify session persistence.

**Expected degraded behavior:**
- Existing JWT tokens remain valid (they are stateless JWTs, not session-cached)
- New login/register requests fail briefly during restart window (~5–15s)
- Gateway returns 502/503 for auth-routed requests during restart

**Recovery steps:**
```powershell
# 1. Restart auth service (failure-injection.ps1 uses docker restart)
docker restart udb-auth

# 2. Wait for healthy
$recovered = $false
$elapsed = 0
while ($elapsed -lt 30) {
    $status = docker ps --filter "name=udb-auth" --format "{{.Status}}" 2>&1
    if ($status -match "healthy") { $recovered = $true; break }
    Start-Sleep -Seconds 3
    $elapsed += 3
}
Write-Output "Auth recovered: $recovered"

# 3. Verify direct auth health
curl -s http://localhost:3001/auth/health
# Expected: 200 with healthy status

# 4. Verify gateway still routes to auth
curl -s http://localhost:3000/auth/health
# Expected: 200 (gateway proxies to auth)

# 5. Test full auth flow
# Register
$regResp = curl.exe -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d '{"email":"authrecovery@test.com","password":"Recovery123!","displayName":"AuthRecovery"}'
# Expected: 201 with token

# Login
$loginResp = curl.exe -s -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d '{"email":"authrecovery@test.com","password":"Recovery123!"}'
# Expected: 200 with token
```

**Validation:**
- Auth health endpoint returns 200
- Gateway routes auth requests successfully
- New registrations and logins complete with token
- Prometheus target `udb-auth` shows UP:
  ```powershell
  curl -s "http://localhost:9090/api/v1/query?query=up{job='udb-auth'}"
  ```

### 4.3 Gateway Restart Recovery

**Scenario**: Gateway is restarted to verify service discovery and route re-registration.

**Expected degraded behavior:**
- All API requests fail during restart window (~5–15s) — gateway is the single entry point
- Frontend shows errors/loading states
- Health checks to port 3000 fail
- Prometheus target `udb-gateway` goes down temporarily

**Recovery steps:**
```powershell
# 1. Restart gateway
docker restart udb-gateway

# 2. Wait for healthy (gateway has start_period: 30s, so this may take up to 45s)
$recovered = $false
$elapsed = 0
while ($elapsed -lt 60) {
    $status = docker ps --filter "name=udb-gateway" --format "{{.Status}}" 2>&1
    if ($status -match "healthy") { $recovered = $true; break }
    Start-Sleep -Seconds 3
    $elapsed += 3
}
Write-Output "Gateway recovered: $recovered"

# 3. Verify gateway health
curl -s http://localhost:3000/gateway/health
# Expected: 200

# 4. Verify gateway routes (all backend services should be registered)
curl -s http://localhost:3000/gateway/routes
# Expected: JSON listing routes to auth, planner, ai, monitoring

# 5. Verify proxying to each backend via gateway
curl -s http://localhost:3000/auth/health
curl -s http://localhost:3000/planner/health
curl -s http://localhost:3000/ai/health
curl -s http://localhost:3000/monitoring/health
# All expected: 200

# 6. Verify frontend can reach gateway
curl -s http://localhost:3030/
# Expected: 200 (frontend serves)
```

**Validation:**
- Gateway health endpoint returns 200
- All routes are registered (gateway/routes)
- Auth flow works through gateway
- Frontend loads and communicates with backend
- Prometheus target `udb-gateway` shows UP

### 4.4 pgBouncer Restart Recovery

**Scenario**: pgBouncer is restarted to verify pool recreation and connection resilience.

**Expected degraded behavior:**
- Active database connections are dropped during restart
- Backend services may see transient "connection refused" errors for ~2–5s
- pgBouncer pool resets to min_pool_size (10 connections) and warms up
- No data loss — PostgreSQL itself is unaffected

**Recovery steps:**
```powershell
# 1. Restart pgBouncer
docker restart udb-pgbouncer

# 2. Wait for healthy
$recovered = $false
$elapsed = 0
while ($elapsed -lt 30) {
    $status = docker ps --filter "name=udb-pgbouncer" --format "{{.Status}}" 2>&1
    if ($status -match "healthy") { $recovered = $true; break }
    Start-Sleep -Seconds 3
    $elapsed += 3
}
Write-Output "pgBouncer recovered: $recovered"

# 3. Verify pgBouncer pools
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -A -t -c "SHOW POOLS"
# Expected: row with database=udb, cl_active=0, sv_idle=10 (min_pool_size)

# 4. Check server connections
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -A -t -c "SELECT count(*) FROM show_servers WHERE state='idle'"
# Expected: >= 10 (min_pool_size connections established)

# 5. Verify DB connectivity through pgBouncer
docker exec udb-pgbouncer pg_isready -h localhost -p 6432 -U udb
# Expected: localhost:6432 - accepting connections

# 6. Verify backend services can reach DB through pgBouncer
curl -s http://localhost:3001/auth/health
curl -s http://localhost:3000/gateway/health
# Both expected: 200
```

**Validation:**
- pgBouncer container healthy
- Pools show correct configuration (default_pool_size=50, min_pool_size=10)
- All backend services that depend on DB return healthy
- PostgreSQL itself is unaffected (check: `docker ps --filter "name=udb-postgres"`)

### 4.5 Full Recovery Verification

After any failure scenario, run the complete verification:

```powershell
Write-Output "=== Full Recovery Verification ==="

# 1. All 14 containers running
$allContainers = @(
    "udb-postgres","udb-pgbouncer","udb-redis",
    "udb-gateway","udb-auth","udb-planner","udb-ai","udb-monitoring",
    "udb-nestjs","udb-frontend",
    "udb-jaeger","udb-otel-collector","udb-prometheus","udb-grafana"
)
foreach ($c in $allContainers) {
    $status = docker ps --filter "name=$c" --format "{{.Status}}" 2>&1
    Write-Output "  $c : $(if ($status) { $status } else { 'STOPPED' })"
}

# 2. All health endpoints returning 200
$healthEndpoints = @(
    @{name="Gateway"; url="http://localhost:3000/gateway/health"}
    @{name="Auth"; url="http://localhost:3001/auth/health"}
    @{name="Planner"; url="http://localhost:3002/planner/health"}
    @{name="AI"; url="http://localhost:3003/ai/health"}
    @{name="Monitoring"; url="http://localhost:3004/monitoring/health"}
    @{name="Frontend"; url="http://localhost:3030"}
)
foreach ($ep in $healthEndpoints) {
    try {
        $code = curl.exe -s -o "$env:TEMP\health_check.txt" -w "%{http_code}" $ep.url 2>&1
        Write-Output "  $($ep.name) : $code $(if ($code -eq 200) { 'OK' } else { 'FAIL' })"
    } catch { Write-Output "  $($ep.name) : FAIL (unreachable)" }
}

# 3. Prometheus all targets UP
$promResp = curl.exe -s "http://localhost:9090/api/v1/targets" 2>&1
$allUp = $promResp -match '"health":"up"' -and $promResp -notmatch '"health":"down"'
Write-Output "  Prometheus targets: $(if ($allUp) { 'ALL UP' } else { 'SOME DOWN' })"

# 4. Jaeger receiving traces
$jaegerSvc = curl.exe -s "http://localhost:16686/api/services" 2>&1
$hasTraces = $jaegerSvc -match 'api-gateway'
Write-Output "  Jaeger traces: $(if ($hasTraces) { 'FLOWING' } else { 'NO DATA' })"

# 5. Auth flow test
$email = "verify$(Get-Random -Maximum 99999)@sos.com"
$regResp = curl.exe -s -X POST "http://localhost:3000/auth/register" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"Verify123!\",\"displayName\":\"Verify\"}" 2>&1
$regOk = $regResp -match '"token"'
$loginResp = curl.exe -s -X POST "http://localhost:3000/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"Verify123!\"}" 2>&1
$loginOk = $loginResp -match '"token"'
Write-Output "  Auth flow: Register=$(if ($regOk) { 'OK' } else { 'FAIL' }) Login=$(if ($loginOk) { 'OK' } else { 'FAIL' })"

# 6. Run certification (optional)
# & "$PSScriptRoot\final-certification.ps1"

Write-Output "=== Verification Complete ==="
```

---

## 5. SERVICE HEALTH CHECK REFERENCE

### 5.1 PostgreSQL (`udb-postgres`)

| Property | Value |
|----------|-------|
| **Image** | `postgres:16-alpine` |
| **Port** | `5432` (internal), `5432` (host mapped) |
| **Health check** | `pg_isready -U udb -d udb` |
| **Interval / Timeout / Retries** | 10s / 5s / 5 |
| **Resource limits** | Memory: 512M limit / 256M reserved |

**Expected response:**
```powershell
docker exec udb-postgres pg_isready -U udb -d udb
# Expected: /var/run/postgresql:5432 - accepting connections
```

**What to check if unhealthy:**
- Disk space: `docker exec udb-postgres df -h /var/lib/postgresql/data`
- Connection count: `docker exec udb-postgres psql -U udb -d udb -c "SELECT count(*) FROM pg_stat_activity"`
- PostgreSQL logs: `docker logs --tail=50 udb-postgres`
- Volume mount: Check `postgres_data` volume exists: `docker volume inspect postgres_data`

### 5.2 pgBouncer (`udb-pgbouncer`)

| Property | Value |
|----------|-------|
| **Build context** | `pgbouncer/` (custom Dockerfile) |
| **Port** | `6432` (internal), `6432` (host mapped) |
| **Health check** | `pg_isready -h localhost -p 6432 -U udb` |
| **Interval / Timeout / Start Period / Retries** | 15s / 5s / 15s / 3 |
| **Resource limits** | Memory: 128M limit / 64M reserved |
| **Config** | `default_pool_size=50`, `min_pool_size=10`, `pool_mode=transaction` |

**Expected response:**
```powershell
docker exec udb-pgbouncer pg_isready -h localhost -p 6432 -U udb
# Expected: localhost:6432 - accepting connections
```

**pgBouncer admin commands:**
```powershell
# Show pools
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW POOLS"

# Show pool statistics
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW STATS"

# Show active servers
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW SERVERS"

# Show clients
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW CLIENTS"

# Show config
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "SHOW CONFIG"

# Force pool drain (kill idle server connections)
docker exec udb-pgbouncer psql -h localhost -p 6432 -U udb -d pgbouncer -c "RECONNECT"
```

**What to check if unhealthy:**
- PostgreSQL must be healthy first (pgBouncer depends on it)
- Check pgBouncer config: `docker exec udb-pgbouncer cat /etc/pgbouncer/pgbouncer.ini`
- Check auth file: `docker exec udb-pgbouncer cat /etc/pgbouncer/userlist.txt`
- Check pgBouncer logs: `docker logs --tail=50 udb-pgbouncer`
- Verify `ignore_startup_parameters`: should be `search_path,extra_float_digits`

### 5.3 Redis (`udb-redis`)

| Property | Value |
|----------|-------|
| **Image** | `redis:7-alpine` |
| **Port** | `6379` (internal), `6379` (host mapped) |
| **Health check** | `redis-cli ping` |
| **Interval / Timeout / Retries** | 10s / 5s / 5 |
| **Resource limits** | Memory: 256M limit / 128M reserved |
| **Persistence** | AOF enabled (`--appendonly yes`), `--save 60 1 --save 300 10` |

**Expected response:**
```powershell
docker exec udb-redis redis-cli PING
# Expected: PONG
```

**What to check if unhealthy:**
- AOF status: `docker exec udb-redis redis-cli INFO persistence`
- Memory usage: `docker exec udb-redis redis-cli INFO memory`
- Slow queries: `docker exec udb-redis redis-cli SLOWLOG GET 10`
- Connected clients: `docker exec udb-redis redis-cli CLIENT LIST`
- Redis logs: `docker logs --tail=50 udb-redis`
- Volume mount: Check `redis_data` volume: `docker volume inspect redis_data`

### 5.4 Gateway (`udb-gateway`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/prisma/phase3/Dockerfile.gateway` |
| **Port** | `3000` (internal), `3000` (host mapped) |
| **Health check** | `curl -f http://localhost:3000/gateway/health` |
| **Depends on** | `redis` (healthy), `postgres` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |

**Expected response:**
```powershell
curl -s http://localhost:3000/gateway/health
# Expected: {"service":"gateway","status":"healthy","timestamp":"...","uptime":...}
# OR similar JSON with status: healthy/ok
```

**What to check if unhealthy:**
- Dependencies: Redis and PostgreSQL must be healthy first
- Gateway logs: `docker logs --tail=100 udb-gateway`
- Route registration: `curl -s http://localhost:3000/gateway/routes`
- Backend connectivity (check each route proxy):
  - Auth: `curl -s http://localhost:3001/auth/health`
  - Planner: `curl -s http://localhost:3002/planner/health`
  - AI: `curl -s http://localhost:3003/ai/health`
  - Monitoring: `curl -s http://localhost:3004/monitoring/health`

### 5.5 Auth Service (`udb-auth`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/prisma/phase3/Dockerfile.auth` |
| **Port** | `3001` (internal) |
| **Health check** | `curl -f http://localhost:3001/auth/health` |
| **Depends on** | `redis` (healthy), `postgres` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |

**Expected response:**
```powershell
curl -s http://localhost:3001/auth/health
# Expected: {"service":"auth-service","status":"healthy","timestamp":"..."}
```

**What to check if unhealthy:**
- DB connection: Check DATABASE_URL connects via pgBouncer (port 6432)
- Redis connection: Verify `redis-cli PING` from within auth container
- JWT secret: Ensure `JWT_SECRET` env var is set and matches gateway
- Auth logs: `docker logs --tail=100 udb-auth`
- Prisma errors in logs: `Select-String "PrismaClientInitializationError"`

### 5.6 Planner Service (`udb-planner`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/prisma/phase3/Dockerfile.planner` |
| **Port** | `3002` (internal) |
| **Health check** | `curl -f http://localhost:3002/planner/health` |
| **Depends on** | `redis` (healthy), `postgres` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |

**Expected response:**
```powershell
curl -s http://localhost:3002/planner/health
# Expected: {"service":"planner-service","status":"healthy","timestamp":"..."}
```

**What to check if unhealthy:**
- Planner logs: `docker logs --tail=100 udb-planner`
- Redis connectivity from planner container
- DB connectivity through pgBouncer

### 5.7 AI Service (`udb-ai`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/prisma/phase3/Dockerfile.ai` |
| **Port** | `3003` (internal) |
| **Health check** | `curl -f http://localhost:3003/ai/health` |
| **Depends on** | `redis` (healthy), `postgres` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |
| **Cost config** | `AI_COST_PER_HINT=0.0004`, `AI_BUDGET_PER_USER_MONTHLY=0.50` |

**Expected response:**
```powershell
curl -s http://localhost:3003/ai/health
# Expected: {"service":"ai-service","status":"healthy","timestamp":"..."}
```

**What to check if unhealthy:**
- AI logs: `docker logs --tail=100 udb-ai`
- Budget-related errors in logs: `Select-String "budget|cost|hint"`
- Redis connectivity (budget tracking stored in Redis)
- DB connectivity (user budget data in PostgreSQL)

### 5.8 Monitoring Service (`udb-monitoring`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/prisma/phase3/Dockerfile.monitoring` |
| **Port** | `3004` (internal) |
| **Health check** | `curl -f http://localhost:3004/monitoring/health` |
| **Depends on** | `redis` (healthy), `postgres` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |

**Expected response:**
```powershell
curl -s http://localhost:3004/monitoring/health
# Expected: {"service":"monitoring-service","status":"healthy","timestamp":"..."}
```

**What to check if unhealthy:**
- Monitoring logs: `docker logs --tail=100 udb-monitoring`
- Redis event bus connectivity
- DB connectivity for audit/analytics storage

### 5.9 NestJS GraphQL (`udb-nestjs`)

| Property | Value |
|----------|-------|
| **Build file** | `services/api/Dockerfile` |
| **Port** | `4000` (internal), `4000` (host mapped) |
| **Health check** | GraphQL introspection `POST /graphql` with `{"query":"{__typename}"}` |
| **Depends on** | `postgres` (healthy), `redis` (healthy) |
| **Resource limits** | Memory: 512M limit / 256M reserved |

**Expected response:**
```powershell
curl -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{__typename}"}'
# Expected: {"data":{"__typename":"Query"}}
```

**What to check if unhealthy:**
- NestJS logs: `docker logs --tail=100 udb-nestjs`
- Prisma/DB connection errors
- GraphQL schema load errors: `Select-String "Query.*not found|schema"`

### 5.10 Frontend (`udb-frontend`)

| Property | Value |
|----------|-------|
| **Build context** | `apps/web/` |
| **Port** | `3030` (internal), `3030` (host mapped) |
| **Health check** | `curl -f http://localhost:3030` |
| **Depends on** | `gateway` (healthy) |
| **Resource limits** | Memory: 256M limit / 128M reserved |
| **Env** | `NEXT_PUBLIC_API_URL=http://localhost:3000/graphql` |

**Expected response:**
```powershell
curl -s -o /dev/null -w "%{http_code}" http://localhost:3030
# Expected: 200

curl -s http://localhost:3030 | Select-String "<html|<div|<title"
# Expected: HTML content (Next.js SSR page)
```

**What to check if unhealthy:**
- Frontend logs: `docker logs --tail=100 udb-frontend`
- Gateway must be healthy first (frontend depends on it)
- Check NEXT_PUBLIC_API_URL env var matches gateway
- Browser console for CORS errors

### 5.11 OTEL Collector (`udb-otel-collector`)

| Property | Value |
|----------|-------|
| **Image** | `otel/opentelemetry-collector-contrib:latest` |
| **Port** | `4318` (internal), `4318` (host mapped) |
| **Config** | `/etc/otel-collector-config.yml` (mounted from `infra/otel-collector/`) |
| **Depends on** | `jaeger` (started) |

**Expected response:**
```powershell
curl -s http://localhost:4318/v1/traces -X POST -H "Content-Type: application/json" -d '{}'
# Expected: 200 (even with empty body, endpoint responds)
```

**What to check if unhealthy:**
- OTEL logs: `docker logs --tail=50 udb-otel-collector`
- Config validity: `docker exec udb-otel-collector cat /etc/otel-collector-config.yml`
- Jaeger connectivity (OTEL collector exports to jaeger:4317)

### 5.12 Jaeger (`udb-jaeger`)

| Property | Value |
|----------|-------|
| **Image** | `jaegertracing/all-in-one:latest` |
| **Port** | `16686` (UI, mapped), `4317` (gRPC, internal) |
| **Resource limits** | Memory: 512M limit / 256M reserved |

**Expected response:**
```powershell
curl -s http://localhost:16686/api/services
# Expected: JSON array of service names (e.g., {"data":["api-gateway","auth-service",...]})

# Web UI: http://localhost:16686 (open in browser)
```

**What to check if unhealthy:**
- Jaeger logs: `docker logs --tail=50 udb-jaeger`
- Check OTEL collector is sending to jaeger:4317
- Verify services are instrumented (OTEL_EXPORTER_OTLP_ENDPOINT in each service env)

### 5.13 Prometheus (`udb-prometheus`)

| Property | Value |
|----------|-------|
| **Image** | `prom/prometheus:latest` |
| **Port** | `9090` (internal), `9090` (host mapped) |
| **Config** | `/etc/prometheus/prometheus.yml` (mounted from `infra/prometheus/`) |
| **Data retention** | 7 days (`--storage.tsdb.retention.time=7d`) |
| **Volume** | `prometheus_data` |
| **Scrape targets** | gateway:3000, auth-service:3001, planner-service:3002, ai-service:3003, monitoring-service:3004, nestjs-graphql:4000 |

**Expected response:**
```powershell
curl -s "http://localhost:9090/api/v1/query?query=up" | ConvertFrom-Json
# Expected: All 6 targets show "health":"up"

curl -s "http://localhost:9090/api/v1/targets" | ConvertFrom-Json
# Expected: 6 targets, all with health="up"
```

**What to check if unhealthy:**
- Prometheus logs: `docker logs --tail=50 udb-prometheus`
- Config: `docker exec udb-prometheus cat /etc/prometheus/prometheus.yml`
- Check which targets are down: `curl -s "http://localhost:9090/api/v1/targets"`
- Disk space for TSDB: `docker exec udb-prometheus df -h /prometheus`
- Volume mount: `docker volume inspect prometheus_data`

### 5.14 Grafana (`udb-grafana`)

| Property | Value |
|----------|-------|
| **Image** | `grafana/grafana:latest` |
| **Port** | `3000` (internal), `3005` (host mapped) |
| **Credentials** | admin / admin123 |
| **Provisioning** | Datasources from `infra/grafana/datasources/`, dashboards from `infra/grafana/dashboards/` |
| **Volume** | `grafana_data` |

**Expected response:**
```powershell
curl -s -o /dev/null -w "%{http_code}" http://localhost:3005/api/health
# Expected: 200

# Web UI: http://localhost:3005 (login: admin / admin123)
```

**What to check if unhealthy:**
- Grafana logs: `docker logs --tail=50 udb-grafana`
- Prometheus datasource must be configured and reachable
- Dashboard provisioning: check `infra/grafana/dashboards/` directory
- Grafana data volume: `docker volume inspect grafana_data`

### 5.15 Quick Health Check Command

Run this single command to check all 14 containers:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | Select-String "udb-"
```

---

## 6. BACKUP & RECOVERY

### 6.1 Database Backup Location and Schedule

| Detail | Value |
|--------|-------|
| **Backup directory** | `D:\SOS-UDB\backups\` (host) |
| **Schedule** | Daily at 2:00 AM (manual via scheduled task or cron) |
| **Retention** | 7 daily backups + 4 weekly backups |
| **Backup format** | Custom PostgreSQL dump (via `pg_dump`) |
| **Database** | `udb` (PostgreSQL 16 running in Docker) |

### 6.2 Backup Command Reference

**Manual backup via Docker:**
```powershell
# Create backup directory
$backupDir = "D:\SOS-UDB\backups"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Generate timestamped filename
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$backupDir\udb_backup_$timestamp.sql"

# Create database backup (via docker exec)
Write-Output "Creating backup: $backupFile"
docker exec udb-postgres pg_dump -U udb -d udb --clean --if-exists --no-owner > $backupFile

# Verify backup file
if ((Get-Item $backupFile).Length -gt 0) {
    Write-Output "Backup created: $(Get-Item $backupFile).Length bytes"
} else {
    Write-Output "ERROR: Backup file is empty!"
}
```

**Compressed backup:**
```powershell
$backupFileGz = "$backupDir\udb_backup_$timestamp.sql.gz"
docker exec udb-postgres pg_dump -U udb -d udb --clean --if-exists --no-owner | gzip > $backupFileGz
Write-Output "Compressed backup: $(Get-Item $backupFileGz).Length bytes"
```

**Custom format backup (recommended):**
```powershell
$backupFileCustom = "$backupDir\udb_backup_$timestamp.dump"
docker exec udb-postgres pg_dump -U udb -d udb --format=custom --no-owner > $backupFileCustom
Write-Output "Custom backup: $(Get-Item $backupFileCustom).Length bytes"
```

**Backup only schema (no data):**
```powershell
docker exec udb-postgres pg_dump -U udb -d udb --schema-only --no-owner > "$backupDir\udb_schema_$timestamp.sql"
```

**Backup only data (no schema):**
```powershell
docker exec udb-postgres pg_dump -U udb -d udb --data-only --no-owner > "$backupDir\udb_data_$timestamp.sql"
```

**Verify backup integrity:**
```powershell
# For SQL format: verify by counting lines and checking for common errors
$backupContent = Get-Content $backupFile
$hasErrors = $backupContent | Select-String "ERROR|FATAL"
if (-not $hasErrors) {
    Write-Output "Backup integrity check: PASSED ($($backupContent.Count) lines)"
} else {
    Write-Output "Backup integrity check: FAILED (contains errors)"
}

# For custom format: use pg_restore to list contents
docker exec -i udb-postgres pg_restore --list < $backupFileCustom
# Expected: lists all tables, schemas, and sequences in the backup
```

**Automated backup script (save as `backup.ps1`):**
```powershell
param(
    [string]$BackupDir = "D:\SOS-UDB\backups",
    [int]$RetentionDays = 7
)

New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = "$BackupDir\udb_backup_$timestamp.dump"

Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Starting backup..."
docker exec udb-postgres pg_dump -U udb -d udb --format=custom --no-owner > $backupFile
if ($?) {
    $size = (Get-Item $backupFile).Length
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Backup complete: $backupFile ($size bytes)"

    # Cleanup old backups
    Get-ChildItem -Path $BackupDir -Filter "udb_backup_*.dump" | Where-Object {
        $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays)
    } | Remove-Item -Force
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] Cleaned up backups older than $RetentionDays days"
} else {
    Write-Output "[$(Get-Date -Format 'HH:mm:ss')] ERROR: Backup failed!"
    exit 1
}
```

**Schedule with Windows Task Scheduler:**
```powershell
# Register daily backup at 2:00 AM
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -File D:\SOS-UDB\backup.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName "UDB-DatabaseBackup" -Action $action -Trigger $trigger -Principal $principal -Description "Daily UDB PostgreSQL backup"
Write-Output "Scheduled task created: UDB-DatabaseBackup"
```

### 6.3 Restore Procedure

**Pre-restore checks:**
```powershell
# 1. Ensure PostgreSQL is healthy
docker ps --filter "name=udb-postgres" --format "{{.Status}}"

# 2. List available backups
Get-ChildItem -Path "D:\SOS-UDB\backups" -Filter "*.sql" -Name
Get-ChildItem -Path "D:\SOS-UDB\backups" -Filter "*.dump" -Name

# 3. Select backup to restore
$restoreFile = "D:\SOS-UDB\backups\udb_backup_20260509_020000.dump"  # example
if (-not (Test-Path $restoreFile)) {
    Write-Error "Backup file not found: $restoreFile"
    exit 1
}
```

**Restore from SQL dump:**
```powershell
Write-Output "Starting restore from: $restoreFile"

# Drop and recreate database (optional — clears existing data)
docker exec udb-postgres psql -U udb -c "DROP DATABASE IF EXISTS udb WITH (FORCE)"
docker exec udb-postgres psql -U udb -c "CREATE DATABASE udb"

# Restore from SQL file
Get-Content $restoreFile | docker exec -i udb-postgres psql -U udb -d udb

if ($?) {
    Write-Output "Restore completed successfully!"
} else {
    Write-Output "ERROR: Restore failed!"
}
```

**Restore from custom format dump:**
```powershell
Write-Output "Starting restore from: $restoreFile"

# Drop and recreate database
docker exec udb-postgres psql -U udb -c "DROP DATABASE IF EXISTS udb WITH (FORCE)"
docker exec udb-postgres psql -U udb -c "CREATE DATABASE udb"

# Restore from custom format
Get-Content $restoreFile -AsByteStream | docker exec -i udb-postgres pg_restore -U udb -d udb --no-owner

if ($?) {
    Write-Output "Restore completed successfully!"
} else {
    Write-Output "ERROR: Restore failed!"
}
```

**Post-restore verification:**
```powershell
Write-Output "=== Post-Restore Verification ==="

# 1. Verify database exists and has tables
$tables = docker exec udb-postgres psql -U udb -d udb -A -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
Write-Output "  Tables restored: $tables"

# 2. Verify data exists
$users = docker exec udb-postgres psql -U udb -d udb -A -t -c "SELECT count(*) FROM users" 2>$null
if ($users) { Write-Output "  Users: $users" }

# 3. Verify auth flow still works
$health = curl.exe -s http://localhost:3001/auth/health
Write-Output "  Auth health: $(if ($health -match 'healthy') { 'OK' } else { 'FAIL' })"

# 4. Restart all backend services (they had DB connections before restore)
docker compose -f docker-compose.prod.yml restart auth-service planner-service ai-service monitoring-service gateway nestjs-graphql

# 5. Final verification
Start-Sleep -Seconds 5
curl -s http://localhost:3000/gateway/health
Write-Output "=== Verification Complete ==="
```

**Emergency restore (point-in-time recovery):**
```powershell
# If PostgreSQL has WAL archiving enabled, you can do PITR.
# For the current setup (no WAL archiving configured), only full backup restore is available.
Write-Output "WARNING: Point-in-time recovery not configured. Only full backup restore is possible."
Write-Output "To enable PITR, configure WAL archiving in postgresql.conf:"
Write-Output "  wal_level = replica"
Write-Output "  archive_mode = on"
Write-Output "  archive_command = 'cp %p /var/lib/postgresql/data/archive/%f'"
```

### 6.4 Redis Backup

Redis has AOF (Append Only File) persistence enabled: `--appendonly yes --save 60 1 --save 300 10`.

```powershell
# Trigger a manual Redis save
docker exec udb-redis redis-cli SAVE
# Expected: OK

# Verify AOF file exists
docker exec udb-redis ls -la /data/

# Check AOF rewrite status
docker exec udb-redis redis-cli INFO persistence
# aof_enabled:1
# aof_last_rewrite_time_sec:...

# Redis data is stored in the `redis_data` Docker volume
docker volume inspect redis_data
```

### 6.5 Backup Testing Schedule

| Frequency | Action | Responsible |
|-----------|--------|-------------|
| Daily (2:00 AM) | Automated SQL dump | Windows Task Scheduler |
| Weekly (Sunday) | Verify backup integrity + copy to alternate location | SRE On-Call |
| Monthly | Test full restore to a staging environment | SRE Lead |

---

*End of SRE Runbooks — UDB Platform*
