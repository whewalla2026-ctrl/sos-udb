param(
  [Parameter(Mandatory=$false)]
  [string]$ApiUrl = "http://localhost:4000",
  [Parameter(Mandatory=$false)]
  [string]$FrontendUrl = "http://localhost:3030",
  [Parameter(Mandatory=$false)]
  [string]$GrafanaUrl = "http://localhost:3005",
  [Parameter(Mandatory=$false)]
  [string]$PrometheusUrl = "http://localhost:9090",
  [Parameter(Mandatory=$false)]
  [string]$JaegerUrl = "http://localhost:16686"
)

$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  UDB Staging Smoke Tests (v10.0)" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$passed = 0
$failed = 0
$skipped = 0

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

function Skip($name, $reason) {
  Write-Host "  [SKIP] $name — $reason" -ForegroundColor Yellow
  $script:skipped++
}

# ─── 1. Health Endpoint ────────────────────────────────────
Write-Host "1. API Health" -ForegroundColor Cyan
Check "GET /health returns 200 with status ok" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.status -eq "ok"
}
Check "Database connection is up" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.checks.database.status -eq "up"
}
Check "Redis connection is up" {
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

# ─── 2. GraphQL Schema ─────────────────────────────────────
Write-Host "2. GraphQL" -ForegroundColor Cyan
Check "GraphQL basic query returns data" {
  $r = Invoke-RestMethod -Uri "$ApiUrl/graphql" -Method Post `
    -ContentType "application/json" `
    -Body '{"query":"{__typename}"}' `
    -TimeoutSec 10
  $r.data.__typename -eq "Query"
}
Check "Auth guard blocks unauthenticated queries" {
  try {
    $null = Invoke-RestMethod -Uri "$ApiUrl/graphql" -Method Post `
      -ContentType "application/json" `
      -Body '{"query":"{ users { id } }"}' `
      -TimeoutSec 10
    $false
  } catch {
    $_.Exception.Response.StatusCode -eq 401 -or
    $_.Exception.Message -match "UNAUTHENTICATED"
  }
}

# ─── 3. Prometheus Metrics ─────────────────────────────────
Write-Host "3. Prometheus Metrics" -ForegroundColor Cyan
Check "/metrics returns prometheus data" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "^# HELP"
}
Check "udb_http_requests_total metric exists" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/metrics" -TimeoutSec 10
  $r.Content -match "udb_http_requests_total"
}

# ─── 4. Security ───────────────────────────────────────────
Write-Host "4. Security" -ForegroundColor Cyan
Check "Rate limiting returns 429 on excess" {
  $limited = $false
  for ($i = 0; $i -lt 5; $i++) {
    try {
      $null = Invoke-RestMethod -Uri "$ApiUrl/health" -TimeoutSec 5
    } catch {
      if ($_.Exception.Response.StatusCode -eq 429) {
        $limited = $true
        break
      }
    }
  }
  $limited
}
Check "CORS headers present" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.Headers["Access-Control-Allow-Origin"] -ne $null
}

# ─── 5. Monitoring Endpoints ───────────────────────────────
Write-Host "5. Monitoring" -ForegroundColor Cyan
Check "Grafana responds (HTTP 200)" {
  try {
    $r = Invoke-WebRequest -Uri "$GrafanaUrl" -TimeoutSec 10 -UseBasicParsing
    $r.StatusCode -eq 200
  } catch {
    $_.Exception.Response.StatusCode -eq 200 -or
    $_.Exception.Response.StatusCode -eq 302 -or
    $_.Exception.Response.StatusCode -eq 303
  }
}
Check "Prometheus responds (HTTP 200)" {
  $r = Invoke-WebRequest -Uri "$PrometheusUrl" -TimeoutSec 10 -UseBasicParsing
  $r.StatusCode -eq 200
}
Check "Jaeger responds (HTTP 200)" {
  try {
    $r = Invoke-WebRequest -Uri "$JaegerUrl" -TimeoutSec 10 -UseBasicParsing
    $r.StatusCode -eq 200
  } catch {
    $_.Exception.Response.StatusCode -eq 200 -or
    $_.Exception.Response.StatusCode -eq 302 -or
    $_.Exception.Response.StatusCode -eq 303
  }
}

# ─── 6. Frontend ───────────────────────────────────────────
Write-Host "6. Frontend" -ForegroundColor Cyan
Check "Frontend serves page" {
  $r = Invoke-WebRequest -Uri "$FrontendUrl" -TimeoutSec 10 -UseBasicParsing
  $r.StatusCode -eq 200
}

# ─── Summary ───────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SMOKE TEST RESULTS" -ForegroundColor Cyan
$color = if ($failed -eq 0) { "Green" } else { "Red" }
Write-Host "  $passed passed, $failed failed, $skipped skipped" -ForegroundColor $color
Write-Host "============================================" -ForegroundColor Cyan

exit $failed
