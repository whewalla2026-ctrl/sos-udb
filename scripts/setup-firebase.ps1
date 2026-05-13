#!/usr/bin/env pwsh
<#
.SYNOPSIS
    SOS-UDB Firebase Production Setup (Windows)
.DESCRIPTION
    Automates Firebase project creation, service account key download,
    env var generation, and Google Auth provider enablement for SOS-UDB.
#>

$ErrorActionPreference = 'Stop'
$ROOT_DIR = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$API_ENV = Join-Path $ROOT_DIR 'services\api\.env'
$WEB_ENV = Join-Path $ROOT_DIR 'apps\web\.env.development'
$DOCKER_COMPOSE = Join-Path $ROOT_DIR 'docker-compose.prod.yml'
$SECRETS_DIR = Join-Path $ROOT_DIR 'secrets'

function Write-Info  { Write-Host "[INFO]  $($args -join ' ')" -ForegroundColor Cyan }
function Write-Ok    { Write-Host "[OK]    $($args -join ' ')" -ForegroundColor Green }
function Write-Warn  { Write-Host "[WARN]  $($args -join ' ')" -ForegroundColor Yellow }
function Write-Err   { Write-Host "[ERR]   $($args -join ' ')" -ForegroundColor Red }

# ── Prerequisites ────────────────────────────────────────────
function Check-Prereqs {
    $missing = @()
    if (-not (Get-Command 'firebase' -ErrorAction SilentlyContinue)) {
        Write-Warn "Firebase CLI not found. Install: npm install -g firebase-tools"
        $missing += 'firebase-tools'
    }
    if (-not (Get-Command 'gcloud' -ErrorAction SilentlyContinue)) {
        Write-Warn "gcloud CLI not found. Install from: https://cloud.google.com/sdk/docs/install"
        $missing += 'gcloud'
    }
    if (-not (Get-Command 'jq' -ErrorAction SilentlyContinue)) {
        Write-Warn "jq not found. Install: winget install jqlang.jq  OR  choco install jq"
        $missing += 'jq'
    }
    if ($missing.Count -gt 0) {
        Write-Err "Install missing prerequisites and re-run: $($missing -join ', ')"
        exit 1
    }
}

# ── Step 1: Firebase Login ───────────────────────────────────
function Step-Login {
    Write-Info "Step 1: Logging into Firebase..."
    & firebase login --no-localhost
    if ($LASTEXITCODE -ne 0) {
        Write-Err "Firebase login failed. Run 'firebase login' manually."
        exit 1
    }
    Write-Ok "Firebase logged in."
}

# ── Step 2: Create Firebase Project ──────────────────────────
function Step-CreateProject {
    param([string]$ProjectId = "udb-production-$(Get-Date -Format 'yyyyMMdd-HHmmss')")
    Write-Info "Step 2: Creating Firebase project '$ProjectId'..."
    $existing = & firebase projects:list --json 2>$null | ConvertFrom-Json
    $found = $existing | Where-Object { $_.projectId -eq $ProjectId }
    if ($found) {
        Write-Ok "Project '$ProjectId' already exists."
    } else {
        & firebase projects:create $ProjectId --display-name "UDB Production"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to create project. You may need to set up billing."
            Write-Err "Visit: https://console.firebase.google.com"
            exit 1
        }
        Write-Ok "Project '$ProjectId' created."
    }
    return $ProjectId
}

# ── Step 3: Enable Authentication Providers ──────────────────
function Step-EnableAuth {
    param([string]$ProjectId)
    Write-Info "Step 3: Enabling Google sign-in provider..."
    & gcloud auth application-default login --quiet 2>$null
    & gcloud services enable identitytoolkit.googleapis.com --project=$ProjectId --quiet
    Write-Ok "Google sign-in enabled. Verify at Firebase Console > Authentication > Sign-in method."
}

# ── Step 4: Create Service Account + Download Key ────────────
function Step-ServiceAccount {
    param([string]$ProjectId)
    $saName = 'firebase-admin'
    $saEmail = "$saName@$ProjectId.iam.gserviceaccount.com"
    $keyFile = Join-Path $SECRETS_DIR 'firebase-service-account.json'

    Write-Info "Step 4: Creating service account '$saName'..."
    New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null

    $saExists = & gcloud iam service-accounts describe $saEmail --project=$ProjectId 2>$null
    if ($saExists) {
        Write-Ok "Service account '$saEmail' already exists."
    } else {
        & gcloud iam service-accounts create $saName `
            --project=$ProjectId `
            --display-name="Firebase Admin SDK Service Account"
        if ($LASTEXITCODE -ne 0) {
            Write-Err "Failed to create service account."
            exit 1
        }
        Write-Ok "Service account created."
    }

    # Grant Firebase Admin roles
    foreach ($role in @('roles/firebase.admin', 'roles/iam.serviceAccountTokenCreator')) {
        & gcloud projects add-iam-policy-binding $ProjectId `
            --member="serviceAccount:$saEmail" `
            --role=$role --quiet 2>$null
    }

    # Download key
    if (-not (Test-Path $keyFile)) {
        Write-Info "Downloading service account key to $keyFile..."
        & gcloud iam service-accounts keys create $keyFile --iam-account=$saEmail --project=$ProjectId
        Write-Ok "Service account key saved."
    } else {
        Write-Warn "Key file already exists at $keyFile — skipping download."
    }
    return $keyFile
}

# ── Step 5: Generate .env Entries ────────────────────────────
function Step-GenerateEnv {
    param([string]$ProjectId, [string]$KeyFile)

    Write-Info "Step 5: Generating environment variable entries..."

    $saJson = Get-Content $KeyFile -Raw | ConvertFrom-Json
    $clientEmail = $saJson.client_email
    $privateKey = $saJson.private_key
    $privateKeyEscaped = $privateKey.Replace("`n", "\n")

    $apiFirebaseBlock = @"
# ── Firebase Auth ─────────────────────────────────
FIREBASE_PROJECT_ID="$ProjectId"
FIREBASE_PRIVATE_KEY="$privateKeyEscaped"
FIREBASE_CLIENT_EMAIL="$clientEmail"
GOOGLE_APPLICATION_CREDENTIALS="$KeyFile"
"@

    $apiContent = Get-Content $API_ENV -Raw -ErrorAction SilentlyContinue
    if ($apiContent -and $apiContent.Contains('FIREBASE_PROJECT_ID')) {
        Write-Warn "Firebase vars already in $API_ENV — skipping."
    } else {
        Add-Content -Path $API_ENV -Value "`n$apiFirebaseBlock"
        Write-Ok "Appended Firebase vars to $API_ENV"
    }

    $webFirebaseBlock = @"
# ── Firebase Client SDK ────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$ProjectId.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="$ProjectId"
"@

    $webContent = Get-Content $WEB_ENV -Raw -ErrorAction SilentlyContinue
    if ($webContent -and $webContent.Contains('NEXT_PUBLIC_FIREBASE_API_KEY')) {
        Write-Warn "Firebase vars already in $WEB_ENV — skipping."
    } else {
        Add-Content -Path $WEB_ENV -Value "`n$webFirebaseBlock"
        Write-Ok "Appended Firebase vars to $WEB_ENV"
    }

    Write-Ok "Environment variables generated."
    Write-Warn "NEXT_PUBLIC_FIREBASE_API_KEY is a placeholder!"
    Write-Warn "Get the actual API key from Firebase Console: Project Settings > General > Web API Key"
}

# ── Step 6: docker-compose.prod.yml instructions ─────────────
function Step-DockerCompose {
    Write-Info "Step 6: Checking docker-compose.prod.yml..."
    $dcContent = Get-Content $DOCKER_COMPOSE -Raw -ErrorAction SilentlyContinue
    if ($dcContent -and $dcContent.Contains('FIREBASE_PROJECT_ID')) {
        Write-Warn "Firebase vars already in $DOCKER_COMPOSE — skipping."
    } else {
        Write-Warn "Manual step: Add Firebase env vars to $DOCKER_COMPOSE"
        Write-Host @"

For nestjs-graphql service environment:
      FIREBASE_PROJECT_ID: `${FIREBASE_PROJECT_ID}
      FIREBASE_PRIVATE_KEY: `${FIREBASE_PRIVATE_KEY}
      FIREBASE_CLIENT_EMAIL: `${FIREBASE_CLIENT_EMAIL}
      GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/firebase-service-account.json

For frontend service environment:
      NEXT_PUBLIC_FIREBASE_API_KEY: `${NEXT_PUBLIC_FIREBASE_API_KEY}
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: `${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
"@ -ForegroundColor Yellow
    }
}

# ── Main ─────────────────────────────────────────────────────
function Main {
    param([string]$ProjectId = "udb-production")

    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  SOS-UDB Firebase Production Setup (Windows)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host ""

    Check-Prereqs
    Step-Login
    $projectId = Step-CreateProject -ProjectId $ProjectId
    Step-EnableAuth -ProjectId $projectId
    $keyFile = Step-ServiceAccount -ProjectId $projectId
    Step-GenerateEnv -ProjectId $projectId -KeyFile $keyFile
    Step-DockerCompose

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
    Write-Ok "Firebase setup complete!"
    Write-Host ""
    Write-Host "Next steps:"
    Write-Host "  1. Get the Web API Key from Firebase Console → Project Settings → General"
    Write-Host "     Update NEXT_PUBLIC_FIREBASE_API_KEY in apps/web/.env.development"
    Write-Host "  2. Add FIREBASE_* env vars to docker-compose.prod.yml"
    Write-Host "  3. In Firebase Console, enable Authentication → Sign-in providers:"
    Write-Host "     - Google (and any others you need)"
    Write-Host "  4. Add authorized domains for OAuth redirects"
    Write-Host "═══════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
}

Main @args
