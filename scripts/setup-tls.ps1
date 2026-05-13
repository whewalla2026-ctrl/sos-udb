#!/usr/bin/env pwsh
<#
.SYNOPSIS
    SOS-UDB Let's Encrypt TLS Setup (Windows)
.DESCRIPTION
    Automates domain configuration, certificate issuance,
    staging/production modes for Let's Encrypt TLS.
.PARAMETER Domain
    The production domain (e.g., udb.example.com)
.PARAMETER Email
    Admin email for Let's Encrypt notifications
.PARAMETER Production
    Use production Let's Encrypt server (default: staging)
#>

param(
    [string]$Domain = "",
    [string]$Email = "",
    [switch]$Production = $false
)

$ErrorActionPreference = 'Stop'
$ROOT_DIR = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$ENV_FILE = Join-Path $ROOT_DIR '.env.production'
$DC_FILE = Join-Path $ROOT_DIR 'docker-compose.prod.yml'

function Write-Info  { Write-Host "[INFO]  $($args -join ' ')" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $($args -join ' ')" -ForegroundColor Green }
function Write-Warn  { Write-Host "[WARN]  $($args -join ' ')" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERR]   $($args -join ' ')" -ForegroundColor Red }

function Check-Prereqs {
    $missing = @()
    if (-not (Get-Command 'docker' -ErrorAction SilentlyContinue)) {
        Write-Err "Docker not found. Install Docker Desktop first."
        exit 1
    }
    Write-Ok "Prerequisites met"
}

function Configure-Env {
    param([string]$Domain, [string]$Email)

    Write-Info "Configuring environment variables..."

    $content = Get-Content $ENV_FILE -Raw -ErrorAction SilentlyContinue
    if (-not $content) { $content = '' }

    if ($content -match "DOMAIN=") {
        $content = $content -replace 'DOMAIN=".*"', "DOMAIN=`"$Domain`""
    }
    if ($content -match "LETSENCRYPT_EMAIL=") {
        $content = $content -replace 'LETSENCRYPT_EMAIL=".*"', "LETSENCRYPT_EMAIL=`"$Email`""
    }

    Set-Content -Path $ENV_FILE -Value $content
    Write-Ok "Environment configured: DOMAIN=$Domain, EMAIL=$Email"
}

function Issue-Certs {
    param([string]$Domain, [string]$Email, [bool]$ProductionMode)

    Write-Info "Issuing certificates in $($(if ($ProductionMode) { 'PRODUCTION' } else { 'staging' })) mode..."

    $server = "https://acme-staging-v02.api.letsencrypt.org/directory"
    if ($ProductionMode) {
        $server = "https://acme-v02.api.letsencrypt.org/directory"
    }

    # Start nginx temporarily
    & docker compose -f $DC_FILE up -d nginx 2>$null

    # Run certbot
    & docker run --rm `
        -v "certbot-www:/var/www/certbot" `
        -v "certbot-certs:/etc/letsencrypt" `
        certbot/certbot:latest `
        certonly --webroot -w /var/www/certbot `
        --domain $Domain `
        --email $Email `
        --agree-tos --non-interactive `
        --server $server `
        --test-cert

    if (-not $ProductionMode) {
        Write-Warn "Staging certificates issued (not trusted by browsers)."
        Write-Warn "When ready, run with -Production flag: .\setup-tls.ps1 -Domain $Domain -Email $Email -Production"
    } else {
        Write-Ok "Production certificates issued for $Domain!"
    }
}

function Main {
    if (-not $Domain) { $Domain = Read-Host "Enter your domain (e.g., udb.example.com)" }
    if (-not $Email) { $Email = Read-Host "Enter admin email for Let's Encrypt notifications" }
    $modeLabel = if ($Production) { 'PRODUCTION' } else { 'staging' }

    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  SOS-UDB Let's Encrypt TLS Setup ($modeLabel)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Check-Prereqs
    Configure-Env -Domain $Domain -Email $Email
    Issue-Certs -Domain $Domain -Email $Email -ProductionMode $Production

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Info "Next steps:"
    Write-Host "  1. Deploy: docker compose -f docker-compose.prod.yml up -d --build nginx"
    Write-Host "  2. Verify: curl -I https://$Domain"
    Write-Host "  3. Certs auto-renew every 12 hours via certbot-renew service"
    Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
}

Main
