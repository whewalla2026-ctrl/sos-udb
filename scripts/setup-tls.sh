#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────────
# Let's Encrypt TLS Setup — SOS-UDB
# Automates: domain configuration, certificate issuance,
# staging/production modes, nginx reload.
# ─────────────────────────────────────────────────────────────

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.production"
DC_FILE="$ROOT_DIR/docker-compose.prod.yml"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()  { echo -e "${CYAN}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
err()   { echo -e "${RED}[ERR]${NC}   $1"; }

# ── Check prerequisites ───────────────────────────
check_prereqs() {
  if ! command -v docker &>/dev/null; then
    err "Docker not found. Install Docker first."
    exit 1
  fi
  if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
    warn "docker-compose not found — ensure Docker Compose v2 is available"
  fi
}

# ── Validate domain resolves to this server ───────
validate_domain() {
  local domain="$1"
  info "Validating domain: $domain"
  local ip
  ip=$(dig +short "$domain" 2>/dev/null || host "$domain" 2>/dev/null | awk '{print $NF}' || echo "")
  if [ -z "$ip" ]; then
    warn "Could not resolve $domain. Continuing anyway..."
    return
  fi
  local local_ip
  local_ip=$(curl -s ifconfig.me 2>/dev/null || echo "")
  if [ -n "$local_ip" ] && [ "$ip" != "$local_ip" ]; then
    warn "Domain $domain resolves to $ip, not this server ($local_ip)"
    warn "Certificate issuance will fail unless DNS points here."
    read -rp "Continue anyway? [y/N] " reply
    if [ "$reply" != "y" ] && [ "$reply" != "Y" ]; then
      exit 1
    fi
  fi
  ok "Domain validation passed"
}

# ── Configure env vars ────────────────────────────
configure_env() {
  local domain="$1"
  local email="$2"

  if grep -q "^DOMAIN=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s/^DOMAIN=.*/DOMAIN=\"$domain\"/" "$ENV_FILE"
  fi
  if grep -q "^LETSENCRYPT_EMAIL=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s/^LETSENCRYPT_EMAIL=.*/LETSENCRYPT_EMAIL=\"$email\"/" "$ENV_FILE"
  fi
  ok "Environment configured: DOMAIN=$domain, EMAIL=$email"
}

# ── Issue certificates (staging or production) ────
issue_certs() {
  local domain="$1"
  local email="$2"
  local mode="${3:-staging}"

  info "Issuing certificates in $mode mode..."

  local server="https://acme-staging-v02.api.letsencrypt.org/directory"
  if [ "$mode" = "production" ]; then
    server="https://acme-v02.api.letsencrypt.org/directory"
  fi

  # Start nginx temporarily on port 80 for ACME challenge
  docker compose -f "$DC_FILE" up -d nginx 2>/dev/null || true

  # Run certbot to issue certs
  docker run --rm \
    -v certbot-www:/var/www/certbot \
    -v certbot-certs:/etc/letsencrypt \
    certbot/certbot:latest \
    certonly --webroot -w /var/www/certbot \
    --domain "$domain" \
    --email "$email" \
    --agree-tos --non-interactive \
    --server "$server" \
    --test-cert

  if [ "$mode" = "staging" ]; then
    warn "Staging certificates issued (not trusted by browsers)."
    warn "When ready, run: $0 --domain $domain --email $email --production"
  else
    ok "Production certificates issued for $domain!"
  fi
}

# ── Main ──────────────────────────────────────────
main() {
  local domain=""
  local email=""
  local mode="staging"
  local reconfigure=false

  while [ $# -gt 0 ]; do
    case "$1" in
      --domain) domain="$2"; shift 2 ;;
      --email) email="$2"; shift 2 ;;
      --production) mode="production"; shift ;;
      --staging) mode="staging"; shift ;;
      --reconfigure) reconfigure=true; shift ;;
      --help)
        echo "Usage: $0 --domain <domain> --email <email> [--production] [--reconfigure]"
        exit 0
        ;;
      *) err "Unknown option: $1"; exit 1 ;;
    esac
  done

  if [ -z "$domain" ]; then
    # Try reading from env file
    if [ -f "$ENV_FILE" ]; then
      domain=$(grep "^DOMAIN=" "$ENV_FILE" | cut -d'"' -f2 2>/dev/null || echo "")
    fi
    if [ -z "$domain" ]; then
      read -rp "Enter your domain (e.g., udb.example.com): " domain
    fi
  fi

  if [ -z "$email" ]; then
    if [ -f "$ENV_FILE" ]; then
      email=$(grep "^LETSENCRYPT_EMAIL=" "$ENV_FILE" | cut -d'"' -f2 2>/dev/null || echo "")
    fi
    if [ -z "$email" ]; then
      read -rp "Enter admin email for Let's Encrypt notifications: " email
    fi
  fi

  echo ""
  echo "════════════════════════════════════════════════"
  echo "  SOS-UDB Let's Encrypt TLS Setup"
  echo "════════════════════════════════════════════════"
  echo ""

  check_prereqs
  validate_domain "$domain"
  configure_env "$domain" "$email"
  issue_certs "$domain" "$email" "$mode"

  echo ""
  echo "════════════════════════════════════════════════"
  info "Next steps:"
  echo "  1. Deploy: docker compose -f docker-compose.prod.yml up -d --build nginx"
  echo "  2. Verify: curl -I https://$domain"
  echo "  3. Certs auto-renew every 12 hours via certbot-renew service"
  echo "════════════════════════════════════════════════"
  echo ""
}

main "$@"
