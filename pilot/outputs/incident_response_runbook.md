# SOS-UDB Incident Response Runbook

**Version**: 1.0  
**Classification**: Production Operations  
**Last Updated**: 2026-05-08  

---

## 1. SERVICE MAP

| Service | Port | Dependencies | Health Check |
|---------|------|-------------|--------------|
| Gateway | 3000 | Auth, Planner, AI, Monitoring, Redis | `GET /gateway/health` |
| Auth | 3001 | PostgreSQL, Redis | `GET /auth/health` |
| Planner | 3002 | Redis | `GET /planner/health` |
| AI | 3003 | Redis, PostgreSQL (budget) | `GET /ai/health` |
| Monitoring | 3004 | Redis, PostgreSQL | `GET /monitoring/health` |
| PostgreSQL | 5432 | — | TCP connect |
| Redis | 6379 | — | `PING` |

**Architecture**: Express.js microservices behind Gateway proxy. Redis List-based queues + Pub/Sub event bus. PostgreSQL with Prisma ORM (pool: 20).

---

## 2. INCIDENT SEVERITY LEVELS

| Level | Definition | Response Time | Example |
|-------|-----------|--------------|---------|
| SEV1 | Complete outage or data loss | < 5 min | Gateway down, DB inaccessible |
| SEV2 | Partial degradation | < 15 min | One service down, high latency |
| SEV3 | Minor issue, no user impact | < 60 min | Queue backlog, cache warning |
| SEV4 | Informational | Next business day | Deprecation, optimization |

---

## 3. RUNBOOKS

### RUNBOOK-01: Database Outage (SEV1)

**Symptoms**:
- Auth service returning 502
- All service health checks failing
- Prisma connection errors in logs

**Immediate Actions**:
```
1. Verify PostgreSQL process:
   Get-Process -Name "postgres" -ErrorAction SilentlyContinue

2. Check PostgreSQL port:
   netstat -ano | findstr ":5432"

3. Check Windows Service:
   Get-Service "postgresql*" | Start-Service

4. If down, restart:
   Start-Process -WindowStyle Hidden "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -ArgumentList "start -D ""C:\Program Files\PostgreSQL\16\data"""
```

**Recovery Validation**:
```
curl -s http://localhost:3001/auth/health
→ Expected: 200 { service: "auth-service", status: "healthy" ... }
```

**Root Cause Analysis**:
- Check `C:\Program Files\PostgreSQL\16\data\pg_log\*.log`
- Check for disk space: `Get-PSDrive C`
- Check for connection exhaustion: `SELECT count(*) FROM pg_stat_activity`

---

### RUNBOOK-02: Redis Outage (SEV1–SEV2)

**Symptoms**:
- Queue processing stops
- Event bus silent
- Services use memory fallback (limited)
- Gateway logs: "Queue: Redis connection failed"

**Immediate Actions**:
```
1. Verify Redis process:
   Get-Process -Name "redis-server" -ErrorAction SilentlyContinue

2. Check Redis port:
   netstat -ano | findstr ":6379"

3. If down, restart:
   winget start redis-server
   # OR
   Start-Process -WindowStyle Hidden "C:\Program Files\Redis\redis-server.exe"

4. Verify RDB persistence:
   redis-cli --raw PING
   → Expected: PONG
```

**Impact**: 
- Queues fall back to in-memory (lost on restart)
- Event bus: events lost
- Service caches: still in-memory

**Recovery Validation**:
```
curl -s http://localhost:3000/monitoring/health
→ Expected: 200
```

---

### RUNBOOK-03: Service Crash (SEV2)

**Symptoms**:
- Specific endpoint returning 502
- Service health check failing
- Port not listening

**Immediate Actions**:
```
1. Verify port:
   netstat -ano | findstr ":PORT"

2. Restart service:
   Stop-Process -Id <PID> -Force
   $env:NODE_PATH = "D:\SOS-UDB\node_modules\.pnpm\node_modules"
   node D:\SOS-UDB\services\api\prisma\phase3\<service-file>

3. Verify recovery:
   curl -s http://localhost:SERVICE_PORT/health
```

**Service File Mapping**:
| Service | File | Port |
|---------|------|------|
| Gateway | `gateway.js` | 3000 |
| Auth | `services/auth-service.js` | 3001 |
| Planner | `services/planner-service.js` | 3002 |
| AI | `services/ai-service.js` | 3003 |
| Monitoring | `services/monitoring-service.js` | 3004 |

---

### RUNBOOK-04: API Overload / High Latency (SEV2–SEV3)

**Symptoms**:
- p95 latency > 500ms
- Throughput dropping
- Error rate increasing

**Immediate Actions**:
```
1. Check current load:
   # Compare with baseline (1.7k req/s max, 300 concurrent)
   netstat -ano | findstr ":3000" | Measure-Object

2. Check DB pool saturation:
   redis-cli LLEN "queue:analytics"
   → If queue depth > 1000, backlog forming

3. Check memory:
   Get-Process -Name "node" | Select-Object Id, WorkingSet64
   → If > 200MB, possible memory leak
```

**Mitigation**:
- Restart the affected service (see RUNBOOK-03)
- If DB pool exhaustion: deploy pgBouncer
- If queue backlog: increase worker poll rate, add workers

---

### RUNBOOK-05: Queue Backlog (SEV2–SEV3)

**Symptoms**:
- Queue depth growing
- Jobs not being processed
- `queue_depth` metric increasing

**Immediate Actions**:
```
1. Check queue depth:
   redis-cli LLEN queue:<queue-name>
   redis-cli LLEN dlq:<queue-name>

2. Check worker is running:
   # Workers are in gateway.js — check gateway process

3. Manual drain if needed:
   # Create a temporary consumer script:
   node -e "
     const Redis = require('ioredis');
     const r = new Redis('redis://localhost:6379');
     async function drain() {
       let item;
       while (item = await r.lpop('queue:backed-up-queue')) {
         const job = JSON.parse(item);
         console.log('Processing:', job.id, job.name);
       }
       console.log('Queue drained');
       process.exit(0);
     }
     drain();
   "
```

---

### RUNBOOK-06: Auth Failures Spike (SEV2)

**Symptoms**:
- `auth_failures_total` metric spiking
- Users reporting login issues
- 401/403 errors increasing

**Immediate Actions**:
```
1. Check brute-force protection:
   # Gateway logs show 429 responses
   # Rate limit window: 10 req/min/IP

2. Check JWT secret:
   # If changed, all existing tokens invalid
   # Verify JWT_SECRET env var

3. Check expiry:
   # JWT expiry: 1 hour (configurable via JWT_TOKEN_EXPIRY)
```

**Root Causes**:
- Password spray / credential stuffing attack
- Misconfigured JWT secret after restart
- Clock skew > 5 minutes (JWT validation fails)

---

### RUNBOOK-07: Cost Spike (SEV3)

**Symptoms**:
- AI hint generation cost exceeding budget
- Monthly cost projection above model forecast
- `ai_budget_usage` metric above threshold

**Immediate Actions**:
```
1. Check AI hint volume:
   # Average: 5 hints/user/day
   # Cost: $0.0004/hint = $210 for 1000 users
   redis-cli LLEN "queue:analytics"  # Check for backlog

2. Verify AI budget config:
   AI_COST_PER_HINT=0.0004
   AI_BUDGET_PER_USER_MONTHLY=0.50

3. If abuse detected:
   # Increase rate limiting
   # Reduce AI_COST_PER_HINT in production
```

---

## 4. RECOVERY PROCEDURES

### Full System Recovery

```
1. Start PostgreSQL (if not running):
   Start-Service postgresql-16

2. Wait for DB ready:
   netstat -ano | findstr ":5432"

3. Start Redis (if not running):
   Start-Process -WindowStyle Hidden "C:\Program Files\Redis\redis-server.exe"
   Start-Sleep -Seconds 2

4. Start services in order:
   Auth → Planner → AI → Monitoring → Gateway
   # Each: Start-Process -WindowStyle Hidden powershell ...
   # See RUNBOOK-03 for exact commands

5. Verify all:
   curl -s http://localhost:3000/gateway/health
   curl -s http://localhost:3000/auth/health
   curl -s http://localhost:3000/planner/health
   curl -s http://localhost:3000/ai/health
   curl -s http://localhost:3000/monitoring/health
```

### Service Restart (Individual)

```
Stop-Process -Id <PID> -Force
$env:NODE_PATH = "D:\SOS-UDB\node_modules\.pnpm\node_modules"
Start-Process -WindowStyle Hidden -FilePath "powershell" -ArgumentList "-NoProfile -Command $env:NODE_PATH='D:\SOS-UDB\node_modules\.pnpm\node_modules'; node D:\SOS-UDB\services\api\prisma\phase3\<file>"
```

---

## 5. MONITORING AND ALERTING

### Key Metrics
| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|--------------------|
| p95 latency | > 300ms | > 1s |
| Error rate | > 0.1% | > 1% |
| DB pool usage | > 15 | = 20 |
| Queue depth | > 100 | > 1000 |
| Redis memory | > 500MB | > 800MB |
| AI budget/ user | > $0.40 | > $0.50 |

### Health Check Endpoints (All Services)
```
GET http://localhost:3000/gateway/health
GET http://localhost:3001/auth/health
GET http://localhost:3002/planner/health
GET http://localhost:3003/ai/health
GET http://localhost:3004/monitoring/health
```

---

## 6. ESCALATION CONTACTS

| Role | Responsibility | Contact |
|------|---------------|---------|
| SRE Lead | System-wide incidents | sre@sos-udb.io |
| Backend Lead | Service-specific issues | backend@sos-udb.io |
| Security Lead | Security incidents | security@sos-udb.io |
| DB Admin | Database issues | dba@sos-udb.io |

---

## 7. POST-INCIDENT REVIEW

After every SEV1–SEV2 incident:

1. **Timeline**: Document exact times of detection, response, mitigation, recovery
2. **Root Cause**: Identify and document root cause
3. **Action Items**: Create P0/P1 items to prevent recurrence
4. **SLO Update**: Update error budget if applicable
5. **Runbook Update**: Improve runbook based on lessons learned

---

*End of Runbook*
