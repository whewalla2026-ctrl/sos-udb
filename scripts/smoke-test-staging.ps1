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

$passed = 0; $failed = 0

function Check {
  param($name, [ScriptBlock]$scriptBlock)
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

function Assert-GraphQL {
  param($Query, [string]$Assertion)
  $tmp = [System.IO.Path]::GetTempFileName()
  try {
    $body = @{ query = $Query } | ConvertTo-Json -Compress
    Set-Content -Path $tmp -Value $body -NoNewline
    $r = curl.exe -s -X POST $ApiUrl/graphql -H "Content-Type: application/json" -d "@$tmp" 2>&1 | ConvertFrom-Json
    if ($r.data) { return $true } else { return $false }
  } finally { Remove-Item $tmp -ErrorAction SilentlyContinue }
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
Check "GraphQL basic query returns data" { Assert-GraphQL '{__typename}' }

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
Check "CORS headers present" {
  $r = Invoke-WebRequest -Uri "$ApiUrl/health" -TimeoutSec 10
  $r.Headers["Access-Control-Allow-Origin"] -ne $null
}

# ─── 5. Frontend ───────────────────────────────────────────
Write-Host "5. Frontend" -ForegroundColor Cyan
Check "Frontend serves page (HTTP 200)" {
  $r = Invoke-WebRequest -Uri "$FrontendUrl" -TimeoutSec 10 -UseBasicParsing
  $r.StatusCode -eq 200
}

# ─── 6. Monitoring Endpoints ───────────────────────────────
Write-Host "6. Monitoring" -ForegroundColor Cyan
Check "Prometheus responds" {
  try { $r = Invoke-WebRequest -Uri "$PrometheusUrl" -TimeoutSec 10 -UseBasicParsing; $r.StatusCode -eq 200 -or $r.StatusCode -eq 302 } catch { $false }
}
Check "Jaeger responds" {
  try { $r = Invoke-WebRequest -Uri "$JaegerUrl" -TimeoutSec 10 -UseBasicParsing; $r.StatusCode -eq 200 -or $r.StatusCode -eq 302 } catch { $false }
}

# ─── Summary ───────────────────────────────────────────────
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
$color = if ($failed -eq 0) { "Green" } else { "Red" }
Write-Host "  SMOKE TEST RESULTS: $passed passed, $failed failed" -ForegroundColor $color
Write-Host "============================================" -ForegroundColor Cyan

exit $failed
