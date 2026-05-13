#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Firebase Production Setup — SOS-UDB
# Automates: Firebase project creation, service account key,
# env var generation, and Google Auth provider enablement.
# ─────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_ENV="$ROOT_DIR/services/api/.env"
WEB_ENV="$ROOT_DIR/apps/web/.env.development"
DOCKER_COMPOSE="$ROOT_DIR/docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }

# ── Prerequisites ────────────────────────────────────────────
check_prereqs() {
  local missing=0
  if ! command -v firebase &>/dev/null; then
    warn "Firebase CLI not found. Install: npm install -g firebase-tools"
    missing=1
  fi
  if ! command -v gcloud &>/dev/null; then
    warn "gcloud CLI not found. Install: https://cloud.google.com/sdk/docs/install"
    missing=1
  fi
  if ! command -v jq &>/dev/null; then
    warn "jq not found. Install: apt install jq  OR  brew install jq"
    missing=1
  fi
  if [ "$missing" -eq 1 ]; then
    err "Install missing prerequisites and re-run."
    exit 1
  fi
}

# ── Step 1: Firebase Login ───────────────────────────────────
step_login() {
  info "Step 1: Logging into Firebase..."
  firebase login --no-localhost || {
    err "Firebase login failed. Run 'firebase login' manually."
    exit 1
  }
  ok "Firebase logged in."
}

# ── Step 2: Create Firebase Project ──────────────────────────
step_create_project() {
  local project_id="${1:-udb-production-$(date +%s)}"
  info "Step 2: Creating Firebase project '$project_id'..."
  if firebase projects:list 2>/dev/null | grep -q "$project_id"; then
    ok "Project '$project_id' already exists."
  else
    firebase projects:create "$project_id" --display-name "UDB Production" || {
      err "Failed to create project. You may need to set up billing."
      err "Visit: https://console.firebase.google.com"
      exit 1
    }
    ok "Project '$project_id' created."
  fi
  echo "$project_id"
}

# ── Step 3: Enable Authentication Providers ──────────────────
step_enable_auth() {
  local project_id="$1"
  info "Step 3: Enabling Google sign-in provider..."
  gcloud auth application-default login --quiet 2>/dev/null || true
  # Enable Identity Toolkit API (required for Firebase Auth)
  gcloud services enable identitytoolkit.googleapis.com --project="$project_id" --quiet
  # Enable Google sign-in via Firebase CLI
  firebase --project "$project_id" ext:install firebase/auth --force 2>/dev/null || true
  ok "Google sign-in enabled. Verify at Firebase Console > Authentication > Sign-in method."
}

# ── Step 4: Create Service Account + Download Key ────────────
step_service_account() {
  local project_id="$1"
  local sa_name="firebase-admin"
  local sa_email="$sa_name@$project_id.iam.gserviceaccount.com"
  local key_file="$ROOT_DIR/secrets/firebase-service-account.json"

  info "Step 4: Creating service account '$sa_name'..."
  mkdir -p "$ROOT_DIR/secrets"

  if gcloud iam service-accounts describe "$sa_email" --project="$project_id" &>/dev/null; then
    ok "Service account '$sa_email' already exists."
  else
    gcloud iam service-accounts create "$sa_name" \
      --project="$project_id" \
      --display-name="Firebase Admin SDK Service Account" || {
      err "Failed to create service account."
      exit 1
    }
    ok "Service account created."
  fi

  # Grant Firebase Admin roles
  for role in roles/firebase.admin roles/iam.serviceAccountTokenCreator; do
    gcloud projects add-iam-policy-binding "$project_id" \
      --member="serviceAccount:$sa_email" \
      --role="$role" --quiet 2>/dev/null || true
  done

  # Download key
  if [ ! -f "$key_file" ]; then
    info "Downloading service account key to $key_file..."
    gcloud iam service-accounts keys create "$key_file" \
      --iam-account="$sa_email" \
      --project="$project_id"
    # Restrict permissions
    chmod 600 "$key_file"
    ok "Service account key saved."
  else
    warn "Key file already exists at $key_file — skipping download."
  fi
  echo "$key_file"
}

# ── Step 5: Generate .env Entries ────────────────────────────
step_generate_env() {
  local project_id="$1"
  local key_file="$2"

  info "Step 5: Generating environment variable entries..."

  local private_key client_email
  client_email=$(jq -r '.client_email' "$key_file")
  private_key=$(jq -r '.private_key' "$key_file")

  # Escape newlines for env var format
  private_key_escaped=$(echo "$private_key" | sed ':a;N;$!ba;s/\n/\\n/g')

  local firebase_block="
# ── Firebase Auth ─────────────────────────────────
FIREBASE_PROJECT_ID=\"$project_id\"
FIREBASE_PRIVATE_KEY=\"$private_key_escaped\"
FIREBASE_CLIENT_EMAIL=\"$client_email\"
GOOGLE_APPLICATION_CREDENTIALS=\"$key_file\"
"

  # Append to services/api/.env if not already present
  if grep -q "FIREBASE_PROJECT_ID" "$API_ENV" 2>/dev/null; then
    warn "Firebase vars already in $API_ENV — skipping."
  else
    echo "$firebase_block" >> "$API_ENV"
    ok "Appended Firebase vars to $API_ENV"
  fi

  # Frontend Firebase config
  local web_firebase_block="
# ── Firebase Client SDK ────────────────────────────
NEXT_PUBLIC_FIREBASE_API_KEY=\"your-firebase-api-key\"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=\"$project_id.firebaseapp.com\"
NEXT_PUBLIC_FIREBASE_PROJECT_ID=\"$project_id\"
"

  if grep -q "NEXT_PUBLIC_FIREBASE_API_KEY" "$WEB_ENV" 2>/dev/null; then
    warn "Firebase vars already in $WEB_ENV — skipping."
  else
    echo "$web_firebase_block" >> "$WEB_ENV"
    ok "Appended Firebase vars to $WEB_ENV"
  fi

  ok "Environment variables generated."
  warn "⚠ NEXT_PUBLIC_FIREBASE_API_KEY is a placeholder!"
  warn "  Get the actual API key from Firebase Console:"
  warn "  Project Settings > General > Web API Key"
}

# ── Step 6: Update docker-compose.prod.yml ───────────────────
step_update_docker_compose() {
  info "Step 6: Checking docker-compose.prod.yml for Firebase vars..."
  if grep -q "FIREBASE_PROJECT_ID" "$DOCKER_COMPOSE" 2>/dev/null; then
    warn "Firebase vars already in $DOCKER_COMPOSE — skipping."
  else
    warn "Manual step: Add the following under 'nestjs-graphql' and 'frontend'"
    warn "environment blocks in $DOCKER_COMPOSE:"
    cat << 'MANUAL'

# For nestjs-graphql service:
      FIREBASE_PROJECT_ID: ${FIREBASE_PROJECT_ID}
      FIREBASE_PRIVATE_KEY: ${FIREBASE_PRIVATE_KEY}
      FIREBASE_CLIENT_EMAIL: ${FIREBASE_CLIENT_EMAIL}
      GOOGLE_APPLICATION_CREDENTIALS: /run/secrets/firebase-service-account.json

# For frontend service:
      NEXT_PUBLIC_FIREBASE_API_KEY: ${NEXT_PUBLIC_FIREBASE_API_KEY}
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${NEXT_PUBLIC_FIREBASE_PROJECT_ID}

MANUAL
    ok "Instructions printed. Update $DOCKER_COMPOSE manually if docker-compose is being used."
  fi
}

# ── Main ─────────────────────────────────────────────────────
main() {
  echo ""
  echo "════════════════════════════════════════════════"
  echo "  SOS-UDB Firebase Production Setup"
  echo "════════════════════════════════════════════════"
  echo ""

  check_prereqs
  step_login

  local project_id
  project_id=$(step_create_project "${1:-udb-production}")

  step_enable_auth "$project_id"

  local key_file
  key_file=$(step_service_account "$project_id")

  step_generate_env "$project_id" "$key_file"
  step_update_docker_compose

  echo ""
  echo "════════════════════════════════════════════════"
  echo -e "${GREEN}Firebase setup complete!${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Get the Web API Key from Firebase Console → Project Settings → General"
  echo "     Update NEXT_PUBLIC_FIREBASE_API_KEY in apps/web/.env.development"
  echo "  2. Add FIREBASE_* env vars to docker-compose.prod.yml"
  echo "  3. In Firebase Console, enable Authentication → Sign-in providers:"
  echo "     - Google (and any others you need)"
  echo "  4. Add authorized domains for OAuth redirects"
  echo "════════════════════════════════════════════════"
  echo ""
}

main "$@"
