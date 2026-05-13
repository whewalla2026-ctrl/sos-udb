#!/bin/sh
set -e

# ── SSL Certificate Bootstrap ──────────────────────────────
# If Let's Encrypt certs exist (via certbot volume), use them.
# Otherwise, generate self-signed certs for development.

CERT_DIR="/etc/nginx/certs"
LIVE_DIR="$CERT_DIR/live"
SELFSIGNED_DIR="$CERT_DIR/selfsigned"
DOMAIN="${DOMAIN:-localhost}"

mkdir -p "$CERT_DIR"

# Check for certbot-managed certificates
if [ -f "$LIVE_DIR/$DOMAIN/fullchain.pem" ] && [ -f "$LIVE_DIR/$DOMAIN/privkey.pem" ]; then
  echo "[nginx] Using Let's Encrypt certificates for $DOMAIN"
  ln -sf "$LIVE_DIR/$DOMAIN/fullchain.pem" "$CERT_DIR/cert.pem"
  ln -sf "$LIVE_DIR/$DOMAIN/privkey.pem" "$CERT_DIR/key.pem"
else
  echo "[nginx] No Let's Encrypt certs found — generating self-signed certificate"
  mkdir -p "$SELFSIGNED_DIR"

  # Only generate if certs don't already exist
  if [ ! -f "$SELFSIGNED_DIR/cert.pem" ] || [ ! -f "$SELFSIGNED_DIR/key.pem" ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$SELFSIGNED_DIR/key.pem" \
      -out "$SELFSIGNED_DIR/cert.pem" \
      -subj "/C=US/ST=State/L=City/O=UDB/CN=$DOMAIN"
    echo "[nginx] Self-signed certificate generated for $DOMAIN"
  fi

  ln -sf "$SELFSIGNED_DIR/cert.pem" "$CERT_DIR/cert.pem"
  ln -sf "$SELFSIGNED_DIR/key.pem" "$CERT_DIR/key.pem"
fi

# ── Generate nginx config from template ────────────────────
# Substitute DOMAIN into the nginx config
if [ -f /etc/nginx/nginx.conf.template ]; then
  sed "s/__DOMAIN__/$DOMAIN/g" /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf
  echo "[nginx] Config generated for domain: $DOMAIN"
fi

echo "[nginx] Starting nginx..."
exec nginx -g "daemon off;"
