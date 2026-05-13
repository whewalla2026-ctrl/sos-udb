param(
  [Parameter(Mandatory=$false)]
  [ValidateSet("api","frontend","all")]
  [string]$Target = "all",

  [Parameter(Mandatory=$false)]
  [string]$ComposeFile = "../docker-compose.prod.yml",

  [Parameter(Mandatory=$false)]
  [string]$PreviousImageTag = "previous",

  [Parameter(Mandatory=$false)]
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  SOS-UDB Rollback Automation" -ForegroundColor Cyan
Write-Host "  Target: $Target" -ForegroundColor Cyan
Write-Host "  Compose: $ComposeFile" -ForegroundColor Cyan
Write-Host "  Dry-run: $($DryRun.IsPresent)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

function Step($msg) {
  Write-Host "[$([DateTime]::Now.ToString('HH:mm:ss'))] $msg" -ForegroundColor Yellow
}

function Run($cmd) {
  Step "Executing: $cmd"
  if (-not $DryRun) {
    Invoke-Expression $cmd
    if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
      Write-Host "WARNING: Command returned exit code $LASTEXITCODE" -ForegroundColor Red
    }
  } else {
    Write-Host "[DRY-RUN] Would execute: $cmd" -ForegroundColor DarkGray
  }
}

function HealthCheck($service, $maxRetries = 12) {
  Step "Waiting for $service to be healthy..."
  for ($i = 0; $i -lt $maxRetries; $i++) {
    if ($DryRun) { break }
    $status = docker inspect --format='{{json .State.Health}}' $service 2>$null
    if ($status -match '"Status":"healthy"') {
      Write-Host "  $service is HEALTHY" -ForegroundColor Green
      return $true
    }
    Start-Sleep -Seconds 5
  }
  Write-Host "  WARNING: $service healthcheck timed out" -ForegroundColor Yellow
  return $false
}

Write-Host ""
Write-Host "STEP 1: Record current state" -ForegroundColor Cyan
$backupFile = "rollback-state-$(Get-Date -Format 'yyyyMMdd-HHmmss').json"
$images = docker images --format '{{json .}}' 2>$null
Step "Current images snapshot -> $backupFile"

Write-Host ""
Write-Host "STEP 2: Stop target service(s)" -ForegroundColor Cyan
switch ($Target) {
  "api" {
    Run("docker-compose -f $ComposeFile stop nestjs-graphql")
    Run("docker-compose -f $ComposeFile rm -f nestjs-graphql")
  }
  "frontend" {
    Run("docker-compose -f $ComposeFile stop frontend")
    Run("docker-compose -f $ComposeFile rm -f frontend")
  }
  "all" {
    Run("docker-compose -f $ComposeFile stop nestjs-graphql frontend")
    Run("docker-compose -f $ComposeFile rm -f nestjs-graphql frontend")
  }
}

Write-Host ""
Write-Host "STEP 3: Tag previous image as current" -ForegroundColor Cyan
switch ($Target) {
  "api" {
    Run("docker tag sos-udb-nestjs-graphql:$PreviousImageTag sos-udb-nestjs-graphql:latest 2>`$null")
  }
  "frontend" {
    Run("docker tag sos-udb-frontend:$PreviousImageTag sos-udb-frontend:latest 2>`$null")
  }
  "all" {
    Run("docker tag sos-udb-nestjs-graphql:$PreviousImageTag sos-udb-nestjs-graphql:latest 2>`$null")
    Run("docker tag sos-udb-frontend:$PreviousImageTag sos-udb-frontend:latest 2>`$null")
  }
}

Write-Host ""
Write-Host "STEP 4: Restart service(s)" -ForegroundColor Cyan
switch ($Target) {
  "api" {
    Run("docker-compose -f $ComposeFile up -d nestjs-graphql")
  }
  "frontend" {
    Run("docker-compose -f $ComposeFile up -d frontend")
  }
  "all" {
    Run("docker-compose -f $ComposeFile up -d")
  }
}

Write-Host ""
Write-Host "STEP 5: Verify health" -ForegroundColor Cyan
switch ($Target) {
  "api" { $null = HealthCheck "udb-nestjs" }
  "frontend" { $null = HealthCheck "udb-frontend" }
  "all" {
    $null = HealthCheck "udb-nestjs"
    $null = HealthCheck "udb-frontend"
  }
}

Write-Host ""
Write-Host "STEP 6: Verify API responses" -ForegroundColor Cyan
if (-not $DryRun) {
  try {
    $health = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 10
    if ($health.status -eq "ok") {
      Write-Host "  Health endpoint: OK ($($health.checks.database.status), $($health.checks.redis.status))" -ForegroundColor Green
    } else {
      Write-Host "  Health endpoint: DEGRADED ($($health.status))" -ForegroundColor Yellow
    }
  } catch {
    Write-Host "  Health endpoint: FAILED ($($_.Exception.Message))" -ForegroundColor Red
  }

  try {
    $gql = Invoke-RestMethod -Uri "http://localhost:4000/graphql" -Method Post `
      -ContentType "application/json" `
      -Body '{"query":"{__typename}"}' `
      -TimeoutSec 10
    if ($gql.data.__typename) {
      Write-Host "  GraphQL endpoint: OK" -ForegroundColor Green
    }
  } catch {
    Write-Host "  GraphQL endpoint: FAILED ($($_.Exception.Message))" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
if ($DryRun) {
  Write-Host "  DRY RUN COMPLETE — no changes made" -ForegroundColor Cyan
} else {
  Write-Host "  ROLLBACK COMPLETE" -ForegroundColor Cyan
}
Write-Host "============================================" -ForegroundColor Cyan
