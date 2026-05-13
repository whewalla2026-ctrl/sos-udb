param(
  [Parameter(Mandatory=$false)]
  [string]$ApiUrl = "http://localhost:4000",
  [Parameter(Mandatory=$false)]
  [switch]$Quick
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SOS-UDB Deployment Verification" -ForegroundColor Cyan
Write-Host "  Target: $ApiUrl" -ForegroundColor Cyan
Write-Host "  Quick: $($Quick.IsPresent)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$warnings = 0

function Check($name, $scriptBlock) {
  try {
    $result = & $scriptBlock
    if ($result) {
      Write-Host "  [PASS] $name" -ForegroundColor Green
      $script:passed++
    } else {
      Write-Host "  [FAIL] $name" -ForegroundColor Red
      $script:failed++
    }
  } catch {
    Write-Host "  [FAIL] $name — $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

function Warn($name, $message) {
  Write-Host "  [WARN] $name — $message" -ForegroundColor Yellow
  $script:warnings++
}

# ─── Health Check ────────────────────────────────────────
Write-Host "1. Health Endpoint" -ForegroundColor Cyan
Check "GET /health returns 200" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.status -eq "ok" -or $r.status -eq "degraded"
}
Check "Database is up" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.checks.database.status -eq "up"
}
Check "Redis is up" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.checks.redis.status -eq "up"
}
Check "Version is reported" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  [bool]$r.version
}
Check "Uptime is reported" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.uptime -ge 0
}

if ($Quick) {
  Write-Host ""
  Write-Host "Results: $passed passed, $failed failed, $warnings warnings" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
  exit $failed
}

# ─── GraphQL Schema ──────────────────────────────────────
Write-Host "2. GraphQL Schema" -ForegroundColor Cyan
Check "GraphQL introspection works" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/graphql" -Method Post `
    -ContentType "application/json" `
    -Body '{"query":"{__typename}"}' `
    -TimeoutSec 10
  $r.data.__typename -eq "Query"
}
Check "Schema has Query type" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/graphql" -Method Post `
    -ContentType "application/json" `
    -Body '{"query":"{ __schema { queryType { name } } }"}' `
    -TimeoutSec 10
  $r.data.__schema.queryType.name -eq "Query"
}
Check "Schema has Mutation type" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/graphql" -Method Post `
    -ContentType "application/json" `
    -Body '{"query":"{ __schema { mutationType { name } } }"}' `
    -TimeoutSec 10
  $r.data.__schema.mutationType.name -eq "Mutation"
}

# ─── Prometheus Metrics ──────────────────────────────────
Write-Host "3. Prometheus Metrics" -ForegroundColor Cyan
Check "GET /metrics returns Prometheus data" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "^# HELP"
}
Check "udb_http_requests_total metric exists" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "udb_http_requests_total"
}
Check "udb_slo_error_budget_remaining metric exists" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "udb_slo_error_budget_remaining"
}
Check "udb_graphql_operation_duration_seconds metric exists" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "udb_graphql_operation_duration_seconds"
}

# ─── Container Health ────────────────────────────────────
Write-Host "4. Container Health" -ForegroundColor Cyan
Check "Container is running" {
  $c = docker ps --filter "name=udb-nestjs" --format "{{.Status}}" 2>$null
  $c -match "Up"
}
Check "Container healthcheck is healthy" {
  $h = docker inspect --format='{{json .State.Health.Status}}' udb-nestjs 2>$null
  $h -match "healthy"
}

# ─── Docker Compose ──────────────────────────────────────
Write-Host "5. Docker Compose" -ForegroundColor Cyan
Check "docker-compose.yml exists" {
  Test-Path "../docker-compose.yml"
}
Check "docker-compose.prod.yml exists" {
  Test-Path "../docker-compose.prod.yml"
}

# ─── Summary ─────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  VERIFICATION COMPLETE" -ForegroundColor Cyan
Write-Host "  $passed passed, $failed failed, $warnings warnings" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "============================================" -ForegroundColor Cyan

exit $failed
