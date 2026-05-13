#!/bin/sh
# Post-renewal hook: signal nginx to reload certificates
# Runs after successful certificate renewal

if [ -f /var/run/nginx.pid ]; then
  nginx -s reload
  echo "[certbot] Nginx reloaded after certificate renewal"
else
  echo "[certbot] Nginx not running — skipping reload"
fi
