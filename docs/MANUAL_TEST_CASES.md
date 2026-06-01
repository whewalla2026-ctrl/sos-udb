# UDB Manual Test Cases

**Version:** 15.0 | **Date:** May 31, 2026 | **Tester:** _________________ | **Environment:** localhost (Docker)

**Prerequisites:** All 18 Docker containers running. Run `docker ps` to confirm before starting.

---

## How To Use This Document

1. Open PowerShell or your terminal
2. Navigate to your UDB project directory
3. For each test case, run the command shown
4. Compare the output against "Expected Result"
5. Mark Pass/Fail in the Status column
6. Note any issues in the Notes column

---

## Suite 1: Infrastructure Verification (15 tests)

### TC-001: All Docker containers running

**Priority:** Critical | **Category:** Infrastructure

**Command:**
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}" | Sort-Object
docker ps --format "{{.Names}}" | Measure-Object -Line
```

**Expected:** 18 containers listed, all showing "Up" or "healthy"

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-002: API health endpoint

**Priority:** Critical | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -s http://localhost:4000/health
```

**Expected:** `{"status":"ok","checks":{"database":"up","redis":"up"}}` (or similar with status ok)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-003: GraphQL responds to queries

**Priority:** Critical | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{ __typename }"}'
```

**Expected:** `{"data":{"__typename":"Query"}}`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-004: GraphQL introspection is BLOCKED

**Priority:** High | **Category:** Security

**Command:**
```powershell
curl.exe -s -X POST http://localhost:4000/graphql -H "Content-Type: application/json" -d '{"query":"{ __schema { types { name } } }"}'
```

**Expected:** Error response (introspection disabled/forbidden). Should NOT return full schema.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-005: Frontend returns HTTP 200

**Priority:** Critical | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" http://localhost:3030
```

**Expected:** `200`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-006: Gateway health and microservice routing

**Priority:** High | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -s http://localhost:3000/gateway/health
curl.exe -s -o nul -w "%{http_code}" http://localhost:3001/health
curl.exe -s -o nul -w "%{http_code}" http://localhost:3002/health
curl.exe -s -o nul -w "%{http_code}" http://localhost:3003/health
curl.exe -s -o nul -w "%{http_code}" http://localhost:3004/health
```

**Expected:** All return 200 or JSON with status ok

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-007: PostgreSQL has 38 tables

**Priority:** High | **Category:** Database

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

**Expected:** `38` (or close — may vary slightly with migration state)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-008: TimescaleDB extension active

**Priority:** High | **Category:** Database

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"
```

**Expected:** `timescaledb | 2.17.2`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-009: Hypertable exists for biometric_logs

**Priority:** Medium | **Category:** Database

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "SELECT hypertable_name FROM timescaledb_information.hypertables;"
```

**Expected:** `biometric_logs` appears in the list

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-010: PgBouncer connection pooling works

**Priority:** Medium | **Category:** Database

**Command:**
```powershell
docker exec udb-pgbouncer sh -c "PGPASSWORD=udb psql -h 127.0.0.1 -p 6432 -U udb pgbouncer -c 'SHOW POOLS;'" 2>&1
```

**Expected:** Shows pool statistics (not an error)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-011: Redis is running and has keys

**Priority:** High | **Category:** Infrastructure

**Command:**
```powershell
docker exec udb-redis redis-cli PING
docker exec udb-redis redis-cli DBSIZE
```

**Expected:** `PONG` and a key count

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-012: Prometheus is scraping targets

**Priority:** Medium | **Category:** Monitoring

**Command:**
```powershell
curl.exe -s http://localhost:9090/-/healthy
curl.exe -s "http://localhost:9090/api/v1/targets" | python -m json.tool | Select-String "activeTargets"
```

**Expected:** First returns `Prometheus Server is Healthy`. Second shows active targets count > 0.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-013: Grafana accessible

**Priority:** Medium | **Category:** Monitoring

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" http://localhost:3005/api/health
```

**Expected:** `200`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-014: Jaeger tracing UI accessible

**Priority:** Medium | **Category:** Monitoring

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" http://localhost:16686
```

**Expected:** `200`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-015: Loki and AlertManager healthy

**Priority:** Medium | **Category:** Monitoring

**Command:**
```powershell
curl.exe -s http://localhost:3100/ready
curl.exe -s -o nul -w "%{http_code}" http://localhost:9093/-/healthy
```

**Expected:** Loki returns "ready". AlertManager returns `200`.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 2: Authentication & Authorization (12 tests)

### TC-016: Register a new parent user

**Priority:** Critical | **Category:** Auth

**Command:**
```powershell
$registerBody = '{"email":"testparent@example.com","password":"SecurePass123!","name":"Test Parent","role":"PARENT","dateOfBirth":"1990-01-01"}'; Set-Content -Path "$env:TEMP\register.json" -Value $registerBody -NoNewline; $regPath = "$env:TEMP\register.json".Replace('\', '/'); curl.exe -sk -c "$env:TEMP\cookies.txt" -X POST -H "Content-Type: application/json" "-d@$regPath" https://localhost/auth/register
```

**Expected:** Returns user object with id, email, role=PARENT

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-017: Login with valid credentials

**Priority:** Critical | **Category:** Auth

**Command:**
```powershell
$loginBody = '{"email":"testparent@example.com","password":"SecurePass123!"}'; Set-Content -Path "$env:TEMP\login.json" -Value $loginBody -NoNewline; $loginPath = "$env:TEMP\login.json".Replace('\', '/'); curl.exe -sk -D - -c "$env:TEMP\cookies.txt" -X POST -H "Content-Type: application/json" "-d@$loginPath" https://localhost/auth/login 2>&1 | Select-String "access_token"
```

**Expected:** Returns Set-Cookie header with access_token (JWT)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-018: Login with invalid credentials

**Priority:** Critical | **Category:** Auth

**Command:**
```powershell
$badLogin = '{"email":"testparent@example.com","password":"WrongPassword"}'; Set-Content -Path "$env:TEMP\bad_login.json" -Value $badLogin -NoNewline; $badPath = "$env:TEMP\bad_login.json".Replace('\', '/'); curl.exe -sk -w "`nHTTP_CODE: %{http_code}" -X POST -H "Content-Type: application/json" "-d@$badPath" https://localhost/auth/login 2>&1
```

**Expected:** Error response (unauthorized / invalid credentials). HTTP 401.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-019: Frontend unauthenticated redirect

**Priority:** High | **Category:** Auth

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" https://localhost/dashboard
```

**Expected:** `302` (redirect to login) or `401` (unauthorized)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-020: COPPA — child account requires parental consent

**Priority:** Critical | **Category:** Compliance

**Command:**
```powershell
$childBody = '{"email":"leokid@example.com","password":"KidPass123!","name":"Leo","role":"CHILD","dateOfBirth":"2017-01-01"}'; Set-Content -Path "$env:TEMP\child_reg.json" -Value $childBody -NoNewline; $childPath = "$env:TEMP\child_reg.json".Replace('\', '/'); curl.exe -sk -w "`nHTTP_CODE: %{http_code}" -X POST -H "Content-Type: application/json" "-d@$childPath" https://localhost/auth/register 2>&1
```

**Expected:** Under-13 account may be blocked or require VPC. HTTP 201 or 403 depending on registration flow.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-021–TC-027: Additional Auth Tests

| TC | Test | What To Check | Expected |
|----|------|---------------|----------|
| TC-021 | JWT token contains userId + role | Decode access_token from TC-017 on jwt.io | Has sub, role, iat, exp |
| TC-022 | Audit log records auth events | Check `audit_logs` table after login | Entry with action = 'LOGIN' |
| TC-023 | Rate limiting on auth | 20 rapid requests to /auth/login | 429 after threshold |
| TC-024 | Blacklisted token rejected | Logout, reuse old token | 401 |
| TC-025 | Brute force protection | 15 wrong passwords for same email | 429 on auth endpoint |
| TC-026 | Password hashing | Check password column in DB | Not plaintext (scrypt hash:salt) |
| TC-027 | Refresh token rotation | Use refresh token twice | Second use rejected |

**Status for TC-021 to TC-027:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 3: Core Features (20 tests)

### TC-028: Gateway ai-lite route works

**Priority:** High | **Category:** Routing

**Command:**
```powershell
$hintBody = '{"userId":"test-user","subject":"math"}'; Set-Content -Path "$env:TEMP\hint.json" -Value $hintBody -NoNewline; $hintPath = "$env:TEMP\hint.json".Replace('\', '/'); curl.exe -sk -w "`nHTTP_CODE: %{http_code}" -X POST -H "Authorization: Bearer test" -H "Content-Type: application/json" "-d@$hintPath" https://localhost/ai-lite/hint 2>&1
```

**Expected:** HTTP 401 (requires valid JWT) — proves the nginx to gateway route works (was previously 404)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-029: AI service health

**Priority:** High | **Category:** AI

**Command:**
```powershell
curl.exe -s http://localhost:3003/ai/health
```

**Expected:** `{"service":"ai-service","status":"healthy",...}`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-030: Monitoring health aggregation

**Priority:** Medium | **Category:** Monitoring

**Command:**
```powershell
curl.exe -s http://localhost:3004/monitoring/health
```

**Expected:** JSON with aggregated health status

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-031: Nginx redirects HTTP to HTTPS

**Priority:** Medium | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" http://localhost
```

**Expected:** `301` (redirect to HTTPS)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-032: Automated backup running

**Priority:** Medium | **Category:** Infrastructure

**Command:**
```powershell
docker ps --filter name=udb-db-backup --format "{{.Names}} {{.Status}}"
docker exec udb-db-backup ls -la /backups/ 2>&1
```

**Expected:** Container shows "Up". Backups directory exists with .dump.gpg files.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-033–TC-047: Additional Core Feature Tests

| TC | Test | What To Check | Expected |
|----|------|---------------|----------|
| TC-033 | OTel collector | `curl -s -o /dev/null -w "%{http_code}" http://localhost:4318` | 200 or 405 |
| TC-034 | Grafana datasources | Check Grafana at :3005 for Prometheus datasource | Pre-configured |
| TC-035 | Docker build compiles | Rebuild any service image | Exit code 0 |
| TC-036 | No secrets in .env.example | Check .env.example for placeholder values | No real secrets |
| TC-037 | .gitignore is correct | Check .env, node_modules, .next excluded | Proper exclusions |
| TC-038 | CI workflow syntax | `npx action-validator .github/workflows/ci.yml` | Valid |
| TC-039 | Prisma schema valid | `npx prisma validate --schema=services/api/prisma/schema.prisma` | Valid |
| TC-040 | Grafana dashboard import | Check pre-configured dashboards exist | At least 1 dashboard |
| TC-041 | Alert rules exist | `curl -s http://localhost:9090/api/v1/rules` | Rule count > 0 |
| TC-042 | Loki receives logs | Write a log, check Loki after 30s | Log queryable |
| TC-043 | Jaeger receives traces | Make a GraphQL call, check Jaeger after 30s | Trace visible |
| TC-044 | All migration files present | `ls services/api/prisma/migrations/` | 3 migration directories |
| TC-045 | Feature flag REST endpoint | Expose /flags endpoint | Returns flag list |
| TC-046 | Admin toggle flag | Set a flag OFF via admin API | Flag returns false |
| TC-047 | Flag persists toggle | Toggle flag, restart API, check again | Resets to default (in-memory) |

**Status for TC-033 to TC-047:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 4: Data & Compliance (10 tests)

### TC-048: Audit log created on mutation

**Priority:** Critical | **Category:** Compliance

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "SELECT id, action, target_type, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 5;"
```

**Expected:** Recent audit entries visible with action, target type, and timestamp

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-049: Audit log immutability — UPDATE blocked

**Priority:** Critical | **Category:** Compliance

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "UPDATE audit_logs SET action = 'hacked' WHERE id = (SELECT id FROM audit_logs LIMIT 1);"
```

**Expected:** ERROR — "audit_logs is immutable" (trigger prevents modification)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-050: Audit log immutability — DELETE blocked

**Priority:** Critical | **Category:** Compliance

**Command:**
```powershell
docker exec udb-postgres psql -U udb -d udb -c "DELETE FROM audit_logs WHERE id = (SELECT id FROM audit_logs LIMIT 1);"
```

**Expected:** ERROR — "audit_logs is immutable" (trigger prevents deletion)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-051: Backup encryption

**Priority:** High | **Category:** Compliance

**Command:**
```powershell
docker exec udb-db-backup sh -c 'ls -la /backups/*.gpg 2>/dev/null && echo "Encrypted backups exist" || echo "No encrypted backups yet"'
```

**Expected:** Encrypted backups (.gpg) exist, or "No encrypted backups yet" if backup hasn't run

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-052–TC-057: Additional Compliance Tests

| TC | Test | What To Check | Expected |
|----|------|---------------|----------|
| TC-052 | Backup decryption | Decrypt a backup: `gpg --decrypt /backups/*.gpg > /tmp/test.dump` | Succeeds with correct key |
| TC-053 | Prisma migrations | `docker exec udb-postgres psql -U udb -d udb -c "SELECT COUNT(*) FROM _prisma_migrations;"` | 3 |
| TC-054 | TimescaleDB chunks | `docker exec udb-postgres psql -U udb -d udb -c "SELECT chunk_table FROM timescaledb_information.chunks;"` | Shows chunk(s) for biometric_logs |
| TC-055 | Audit trigger enabled | `docker exec udb-postgres psql -U udb -d udb -c "SELECT tgenabled FROM pg_trigger WHERE tgname = 'audit_logs_immutable';"` | O (enabled) |
| TC-056 | Password not plaintext | `docker exec udb-postgres psql -U udb -d udb -c "SELECT password FROM users LIMIT 1;"` | Hash:salt format, not plaintext |
| TC-057 | .env.example has BACKUP_ENCRYPTION_KEY | `Select-String -Path .env.example -Pattern "BACKUP_ENCRYPTION_KEY"` | Found |

**Status for TC-052 to TC-057:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 5: Security (10 tests)

### TC-058: Security headers present (Helmet)

**Priority:** High | **Category:** Security

**Command:**
```powershell
curl.exe -s -I http://localhost:4000/health | Select-String -Pattern "x-frame|x-content|strict-transport|x-xss|content-security"
```

**Expected:** Headers include Content-Security-Policy, X-Content-Type-Options, X-Frame-Options, etc.

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-059: .env not exposed via HTTP

**Priority:** Critical | **Category:** Security

**Command:**
```powershell
Write-Host "API .env: $(curl.exe -s -o nul -w '%{http_code}' http://localhost:4000/.env)"; Write-Host "Frontend .env: $(curl.exe -s -o nul -w '%{http_code}' http://localhost:3030/.env)"
```

**Expected:** Both return 404

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-060: Nginx HTTPS serves frontend

**Priority:** High | **Category:** Infrastructure

**Command:**
```powershell
curl.exe -sk -o nul -w "%{http_code}" https://localhost
```

**Expected:** `200` (frontend served via HTTPS)

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-061: Nginx ai-lite route proxies to gateway

**Priority:** High | **Category:** Routing

**Command:**
```powershell
curl.exe -sk -w "`nHTTP_CODE: %{http_code}" -X POST -H "Content-Type: application/json" -d '{"userId":"test-user","subject":"math"}' https://localhost/ai-lite/hint 2>&1
```

**Expected:** HTTP 401 (no auth) — proves route reaches gateway, not frontend

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-062: Gateway auth routes proxied

**Priority:** High | **Category:** Routing

**Command:**
```powershell
curl.exe -s -o nul -w "%{http_code}" http://localhost:3000/auth/health
```

**Expected:** `200`

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-063–TC-067: Additional Security Tests

| TC | Test | What To Check | Expected |
|----|------|---------------|----------|
| TC-063 | Frontend via HTTPS | `curl -sk -o /dev/null -w "%{http_code}" https://localhost/dashboard` | 200 or 302 |
| TC-064 | API not directly accessible on :4000 via HTTPS | `curl -sk -o /dev/null -w "%{http_code}" https://localhost:4000/health` | 200 (also accessible, fine) |
| TC-065 | Gateway port 3000 not accessible externally | Check if :3000 is bound to 0.0.0.0 or 127.0.0.1 | External access |
| TC-066 | Webhook security | POST to /webhooks/alerts without signature | 400/401 |
| TC-067 | No stack traces in errors | POST invalid JSON, check response | Clean error, no stack |

**Status for TC-063 to TC-067:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 6: Frontend Routes (5 tests)

### TC-068–TC-072: Key frontend routes via HTTPS

**Command:**
```powershell
$routes = @("/", "/auth/login", "/auth/register", "/dashboard", "/dashboard/settings")
foreach ($route in $routes) {
  $code = curl.exe -sk -o nul -w "%{http_code}" "https://localhost$route"
  Write-Output "  $route -> HTTP $code"
}
```

**Expected:** Public routes (/, /auth/login, /auth/register) return 200. Dashboard routes may return 302 (redirect to login) — also correct.

| TC | Route | Expected | Status |
|----|-------|----------|--------|
| TC-068 | / | 200 | ☐ |
| TC-069 | /auth/login | 200 | ☐ |
| TC-070 | /auth/register | 200 | ☐ |
| TC-071 | /dashboard | 200 or 302 | ☐ |
| TC-072 | /dashboard/settings | 200 or 302 | ☐ |

---

## Suite 7: Monitoring & Observability (5 tests)

### TC-073–TC-077: Monitoring Stack

| TC | Test | Command | Expected |
|----|------|---------|----------|
| TC-073 | Grafana login | `curl -sk -o /dev/null -w "%{http_code}" https://localhost:3005/login` | 200 |
| TC-074 | Prometheus targets | `curl -s "http://localhost:9090/api/v1/targets" \| python -c "import sys,json; d=json.load(sys.stdin); print(len(d['data']['activeTargets']))"` | > 0 |
| TC-075 | AlertManager alerts | `curl -s "http://localhost:9093/api/v2/alerts" \| python -c "import sys,json; d=json.load(sys.stdin); print(f'{len(d)} alerts')"` | 0 or more |
| TC-076 | Loki readiness | `curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/ready` | 200 |
| TC-077 | Jaeger services | `curl -s "http://localhost:16686/api/services" \| python -c "import sys,json; d=json.load(sys.stdin); print(d)"` | Service list |

**Status for TC-073 to TC-077:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 8: Stress & Load (3 tests)

### TC-078: Basic stress test

**Priority:** Medium | **Category:** Performance

**Command:**
```powershell
$start = Get-Date; $ok=0; $fail=0; for ($i=1; $i -le 100; $i++) { $c = curl.exe -s -o nul -w "%{http_code}" http://localhost:4000/health 2>&1; if ($c -eq 200) { $ok++ } else { $fail++ } }; $end = Get-Date; $ms = [math]::Round(($end - $start).TotalMilliseconds); Write-Output "Passed: $ok/100, Failed: $fail/100, Time: ${ms}ms, Avg: $([math]::Round($ms/($ok+$fail)))ms/req"
```

**Expected:** > 90% pass rate, avg < 200ms

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-079: Concurrent stress test

**Priority:** Medium | **Category:** Performance

**Command:**
```powershell
$jobs = @(); for ($j=1; $j -le 5; $j++) { $jobs += Start-Job -ScriptBlock { param($id) $ok=0; 1..20 | ForEach-Object { $c = curl.exe -s -o nul -w "%{http_code}" http://localhost:4000/health 2>&1; if ($c -eq 200) { $ok++ } }; return @{id=$id; ok=$ok} } -ArgumentList $j }; $results = $jobs | Wait-Job | Receive-Job; $totalOk = ($results | Measure-Object -Property ok -Sum).Sum; Write-Output "Concurrent OK: $totalOk/100"
```

**Expected:** > 90% pass rate under concurrency

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-080: Sustained load (60s)

**Priority:** Low | **Category:** Performance

**Command:**
```powershell
$end = (Get-Date).AddSeconds(60); $req=0; $ok=0; while ((Get-Date) -lt $end) { $c = curl.exe -s -o nul -w "%{http_code}" http://localhost:4000/health 2>&1; $req++; if ($c -eq 200) { $ok++ } }; Write-Output "Requests: $req, OK: $ok ($([math]::Round($ok/$req*100,1))%)"
```

**Expected:** > 90% pass rate over 60 seconds

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Suite 9: Automated Test Suite (3 tests)

### TC-081: Run full unit test suite

**Priority:** Critical | **Category:** Testing

**Command:**
```powershell
pnpm test 2>&1 | Select-String -Pattern "Tests:|Suites:|Time:"
```

**Expected:** 446 tests passing, 34 suites, 0 failures

**Status:** ☐ Pass  ☐ Fail  **Total:** ___/___  **Notes:** _______________

---

### TC-082: TypeScript compilation clean

**Priority:** High | **Category:** Testing

**Command:**
```powershell
pnpm typecheck 2>&1 | Select-String -Pattern "error|warning"
```

**Expected:** Zero errors, zero warnings

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

### TC-083: Lint passes

**Priority:** Medium | **Category:** Testing

**Command:**
```powershell
pnpm lint 2>&1 | Select-String -Pattern "error"
```

**Expected:** Zero lint errors

**Status:** ☐ Pass  ☐ Fail  **Notes:** _______________

---

## Summary

| Suite | Test Cases | Passed | Failed | Blocked |
|-------|-----------|--------|--------|---------|
| 1. Infrastructure | TC-001 to TC-015 (15) | | | |
| 2. Auth & Authorization | TC-016 to TC-027 (12) | | | |
| 3. Core Features | TC-028 to TC-047 (20) | | | |
| 4. Data & Compliance | TC-048 to TC-057 (10) | | | |
| 5. Security | TC-058 to TC-067 (10) | | | |
| 6. Frontend Routes | TC-068 to TC-072 (5) | | | |
| 7. Monitoring | TC-073 to TC-077 (5) | | | |
| 8. Stress & Load | TC-078 to TC-080 (3) | | | |
| 9. Automated Suite | TC-081 to TC-083 (3) | | | |
| **TOTAL** | **83** | | | |

**Tested by:** _________________________ **Date:** _____________

**Overall Result:** ☐ PASS  ☐ FAIL

**Sign-off:** _________________________
