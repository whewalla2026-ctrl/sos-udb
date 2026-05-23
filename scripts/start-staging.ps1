param(
  [Parameter(Mandatory=$false)]
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir/.."

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  UDB Staging Stack — Start" -ForegroundColor Cyan
Write-Host "  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Step($msg) {
  Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $msg" -ForegroundColor Yellow
}

# Step 1: Check Docker
Step "Checking Docker..."
docker version --format '{{.Server.Version}}' 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Docker engine not accessible. Start Docker Desktop first." -ForegroundColor Red
  exit 1
}
Write-Host "  Docker engine OK" -ForegroundColor Green

# Step 2: Stop any existing stack
Step "Stopping any existing stack..."
Set-Location -LiteralPath $ProjectRoot
docker compose -f docker-compose.prod.yml down --remove-orphans 2>$null
Write-Host "  Existing stack stopped" -ForegroundColor Green

# Step 3: Build and start
if (-not $SkipBuild) {
  Step "Building images..."
  docker compose -f docker-compose.prod.yml build
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Build failed" -ForegroundColor Red
    exit 1
  }
  Write-Host "  Build complete" -ForegroundColor Green
} else {
  Write-Host "  Skipping build (--SkipBuild)" -ForegroundColor Yellow
}

Step "Starting stack..."
docker compose -f docker-compose.prod.yml up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host "ERROR: Failed to start stack" -ForegroundColor Red
  exit 1
}
Write-Host "  Stack started" -ForegroundColor Green

# Step 4: Wait for health
Step "Waiting for API health (up to 120s)..."
$healthy = $false
for ($i = 0; $i -lt 24; $i++) {
  Start-Sleep -Seconds 5
  try {
    $r = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
    if ($r.status -eq "ok" -or $r.status -eq "degraded") {
      $healthy = $true
      Write-Host "  API is $($r.status) (attempt $($i+1))" -ForegroundColor Green
      break
    }
  } catch {
    Write-Host "  Waiting... (attempt $($i+1))" -ForegroundColor DarkGray
  }
}
if (-not $healthy) {
  Write-Host "WARNING: API healthcheck timed out" -ForegroundColor Yellow
  Write-Host "Check logs: docker compose -f docker-compose.prod.yml logs api" -ForegroundColor Yellow
}

# Step 5: Run Prisma migrations
Step "Running Prisma migrations..."
Set-Location -LiteralPath "$ProjectRoot/services/api"
$env:DATABASE_URL = "postgresql://udb:udb@localhost:5432/udb?schema=public&pgbouncer=true"
$env:DIRECT_URL = "postgresql://udb:udb@localhost:5432/udb?schema=public"
npx prisma migrate deploy 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Host "WARNING: Migration deploy issue (may already be applied)" -ForegroundColor Yellow
}
Set-Location -LiteralPath $ProjectRoot

# Step 6: Summary
Step "Stack status:"
docker compose -f docker-compose.prod.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Staging Stack Ready" -ForegroundColor Cyan
Write-Host "  API:        http://localhost:4000" -ForegroundColor Cyan
Write-Host "  GraphQL:    http://localhost:4000/graphql" -ForegroundColor Cyan
Write-Host "  Frontend:   http://localhost:3030" -ForegroundColor Cyan
Write-Host "  Grafana:    http://localhost:3005" -ForegroundColor Cyan
Write-Host "  Prometheus: http://localhost:9090" -ForegroundColor Cyan
Write-Host "  Jaeger:     http://localhost:16686" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
