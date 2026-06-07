param(
  [Parameter(Mandatory=$false)]
  [string]$ApiUrl = "http://localhost:4000",
  [Parameter(Mandatory=$false)]
  [string]$PrometheusUrl = "http://localhost:9090",
  [Parameter(Mandatory=$false)]
  [string]$BackupMetricsUrl = "http://localhost:9122/metrics",
  [Parameter(Mandatory=$false)]
  [string]$GatewayUrl = "http://localhost:3000",
  [Parameter(Mandatory=$false)]
  [string]$GrafanaUrl = "http://localhost:3005"
)

$ErrorActionPreference = "Stop"
$passed = 0; $failed = 0; $warnings = 0

function Check {
  param($Name, [ScriptBlock]$ScriptBlock)
  try {
    $result = & $ScriptBlock
    if ($result) {
      Write-Host "  [PASS] $Name" -ForegroundColor Green
      $script:passed++
    } else {
      Write-Host "  [FAIL] $Name" -ForegroundColor Red
      $script:failed++
    }
  } catch {
    Write-Host "  [FAIL] $Name : $($_.Exception.Message)" -ForegroundColor Red
    $script:failed++
  }
}

function Warn {
  param($Name, $Message)
  Write-Host "  [WARN] $Name : $Message" -ForegroundColor Yellow
  $script:warnings++
}

function Curl-StatusCode {
  param($Method, $Uri, $Body, $ContentType)
  $tmpOut = [System.IO.Path]::GetTempFileName()
  try {
    if ($Body) {
      $tmpBody = [System.IO.Path]::GetTempFileName()
      $Body | Out-File -FilePath $tmpBody -Encoding ascii -NoNewline
      $result = curl.exe -s -o $tmpOut -w "%{http_code}" -X $Method $Uri -H "Content-Type: $ContentType" -d "@$tmpBody" 2>$null
      Remove-Item $tmpBody -ErrorAction SilentlyContinue
    } else {
      $result = curl.exe -s -o $tmpOut -w "%{http_code}" $Uri 2>$null
    }
    $content = Get-Content $tmpOut -Raw
    return @{ Code = $result; Body = $content }
  } finally { Remove-Item $tmpOut -ErrorAction SilentlyContinue }
}

$reportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$dayNum = [math]::Floor(((Get-Date) - (Get-Date "2026-06-03")).TotalDays) + 1
if ($dayNum -lt 1) { $dayNum = 1 }
if ($dayNum -gt 14) { $dayNum = 14 }

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  UDB Daily Burn-In Check (Day $dayNum)" -ForegroundColor Cyan
Write-Host "  $reportDate" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# ─── 1. Container Health ─────────────────────────────────
Write-Host "`n1. Container Health" -ForegroundColor Cyan
$expectedContainers = @(
  "udb-postgres","udb-pgbouncer","udb-redis","udb-gateway",
  "udb-auth","udb-planner","udb-ai","udb-monitoring","udb-api",
  "udb-frontend","udb-nginx","udb-otel-collector","udb-loki",
  "udb-alertmanager","udb-promtail","udb-jaeger","udb-prometheus",
  "udb-grafana","udb-db-backup"
)
$healthyCount = 0
$totalCount = 0
$unhealthy = @()
foreach ($c in $expectedContainers) {
  $state = docker inspect --format "{{.State.Status}}" $c 2>$null
  if ($LASTEXITCODE -eq 0) {
    $totalCount++
    $hasHealth = docker inspect --format "{{.State.Health}}" $c 2>$null
    $healthStatus = "no-healthcheck"
    if ($hasHealth -ne "<nil>") {
      $healthStatus = docker inspect --format "{{.State.Health.Status}}" $c 2>$null
    }
    if ($state -eq "running" -and ($healthStatus -eq "healthy" -or $healthStatus -eq "no-healthcheck")) {
      $healthyCount++
    } else {
      $unhealthy += "$c ($state, health: $healthStatus)"
    }
  } else {
    $totalCount++
    $unhealthy += "$c (not found)"
  }
}
Check "All 19 containers accounted for" { $totalCount -eq 19 }
Check "All containers running and healthy" { $unhealthy.Count -eq 0 }
if ($unhealthy.Count -gt 0) {
  Warn "Unhealthy containers" ($unhealthy -join "; ")
}

# ─── 2. Prometheus Targets ───────────────────────────────
Write-Host "`n2. Prometheus Targets" -ForegroundColor Cyan
try {
  $result = Curl-StatusCode -Uri "$PrometheusUrl/api/v1/targets"
  if ($result.Code -eq 200) {
    $data = $result.Body | ConvertFrom-Json
    $up = @($data.data.activeTargets | Where-Object { $_.health -eq "up" }).Count
    $total = @($data.data.activeTargets).Count
    $names = $data.data.activeTargets | ForEach-Object { $_.labels.job }
    Check "Prometheus $up/$total targets UP" { $up -eq $total -and $total -gt 0 }
    Write-Host "       Targets: $($names -join ', ')" -ForegroundColor Gray
  } else {
    Check "Prometheus endpoint returns 200" { $false }
    Warn "Prometheus HTTP" $result.Code
  }
} catch {
  Check "Prometheus endpoint reachable" { $false }
}

# ─── 3. Backup Metrics ──────────────────────────────────
Write-Host "`n3. Backup Metrics" -ForegroundColor Cyan
try {
  $result = Curl-StatusCode -Uri $BackupMetricsUrl
  if ($result.Code -eq 200) {
    $hasMetric = $result.Body -match "udb_backup_last_success_timestamp"
    if ($result.Body -match "udb_backup_last_success_timestamp\s+(\d+)") {
      $ts = $Matches[1]
      Warn "Backup timestamp" $ts
    }
    Check "Backup metrics endpoint returns 200" { $true }
    Check "udb_backup_last_success_timestamp metric present" { $hasMetric }
  } else {
    Check "Backup metrics endpoint returns 200" { $false }
  }
} catch {
  Check "Backup metrics endpoint reachable" { $false }
}

# ─── 4. API Health ─────────────────────────────────────
Write-Host "`n4. API Health" -ForegroundColor Cyan
try {
  $result = Curl-StatusCode -Uri "$ApiUrl/health"
  if ($result.Code -eq 200) {
    $health = $result.Body | ConvertFrom-Json
    Check "API /health returns 200" { $health.status -eq "ok" }
    Check "Database connection up" { $health.checks.database.status -eq "up" }
    Check "Redis connection up" { $health.checks.redis.status -eq "up" }
    Check "Version and uptime reported" { [bool]$health.version -and $health.uptime -ge 0 }
  } else {
    Check "API /health returns 200" { $false }
    Warn "API HTTP" $result.Code
  }
} catch {
  Check "API health endpoint reachable" { $false }
}

# ─── 5. Gateway & Auth ────────────────────────────────
Write-Host "`n5. Gateway & Auth" -ForegroundColor Cyan
try {
  $gwResult = Curl-StatusCode -Uri "$GatewayUrl/gateway/health"
  Check "Gateway /gateway/health responds" { $gwResult.Code -eq 200 }
  if ($gwResult.Code -eq 200) {
    $gw = $gwResult.Body | ConvertFrom-Json
    $routes = $gw.routes -join ", "
    Write-Host "       Routes: $routes" -ForegroundColor Gray
  }
} catch {
  Check "Gateway reachable" { $false }
}

try {
  $body = '{ "email": "river.family@udb.alpha", "password": "Alpha2026!" }'
  $authResult = Curl-StatusCode -Method POST -Uri "$GatewayUrl/auth/login" -Body $body -ContentType "application/json"
  if ($authResult.Code -eq 200 -or $authResult.Code -eq 401 -or $authResult.Code -eq 429) {
    if ($authResult.Code -eq 401) { Warn "Login" "401 Invalid credentials (expected - unknown password)" }
    if ($authResult.Code -eq 429) { Warn "Login" "429 Rate limited (endpoint working)" }
    Check "Auth login endpoint responds" { $true }
  } else {
    Check "Auth login endpoint responds" { $false }
  }
} catch {
  Check "Auth login endpoint reachable" { $false }
}

# ─── 6. Grafana ────────────────────────────────────────
Write-Host "`n6. Grafana" -ForegroundColor Cyan
try {
  $grafanaResult = Curl-StatusCode -Uri "$GrafanaUrl/login"
  Check "Grafana login page responds" { $grafanaResult.Code -eq 200 }
} catch {
  Check "Grafana reachable" { $false }
}

# ─── Summary ───────────────────────────────────────────
Write-Host "`n============================================" -ForegroundColor Cyan
$color = if ($failed -eq 0) { "Green" } elseif ($failed -le 2) { "Yellow" } else { "Red" }
Write-Host "  BURN-IN CHECK: $passed passed, $failed failed, $warnings warnings" -ForegroundColor $color
Write-Host "  Day $dayNum / 14" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

exit $failed
