#!/bin/bash
set -euo pipefail

# UDB Database Backup Script
# Usage: ./backup.sh [output-dir]
# Env: DB_URL, BACKUP_ENCRYPTION_KEY, GPG_RECIPIENT, S3_BUCKET (optional)
# Encryption priority: BACKUP_ENCRYPTION_KEY (symmetric) > GPG_RECIPIENT (asymmetric) > unencrypted

OUTPUT_DIR="${1:-/backups}"
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
FILENAME="udb-db-${TIMESTAMP}.sql.gz"
ENCRYPTED="${FILENAME}.gpg"
BACKUP_PATH="${OUTPUT_DIR}/${FILENAME}"
ENCRYPTED_PATH="${OUTPUT_DIR}/${ENCRYPTED}"
LOG_FILE="${OUTPUT_DIR}/backup.log"

mkdir -p "${OUTPUT_DIR}"

log() {
  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] $*" | tee -a "${LOG_FILE}"
}

log "Starting database backup..."

# Dump + compress
if ! pg_dump "${DB_URL:-postgresql://udb:udb@localhost:6432/udb}" --no-owner --compress=9 -f "${BACKUP_PATH}"; then
  log "ERROR: pg_dump failed"
  exit 1
fi

log "Backup size: $(du -h "${BACKUP_PATH}" | cut -f1)"

# Start gpg-agent if available (needed for symmetric passphrase in GnuPG 2)
gpg-agent --daemon 2>/dev/null || true

# Encrypt with GPG symmetric passphrase (preferred — simpler ops)
if [ -n "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  if gpg --batch --yes --passphrase "${BACKUP_ENCRYPTION_KEY}" \
    --symmetric --cipher-algo AES256 \
    --output "${ENCRYPTED_PATH}" "${BACKUP_PATH}"; then
    rm -f "${BACKUP_PATH}"
    log "Encrypted backup (AES-256 symmetric): ${ENCRYPTED_PATH}"
    FINAL_PATH="${ENCRYPTED_PATH}"
  else
    log "WARNING: Symmetric encryption failed, trying asymmetric..."
    FINAL_PATH="${BACKUP_PATH}"
  fi
elif [ -n "${GPG_RECIPIENT:-}" ]; then
  if gpg --batch --yes --trust-model always --encrypt --recipient "${GPG_RECIPIENT}" \
    --output "${ENCRYPTED_PATH}" "${BACKUP_PATH}"; then
    rm -f "${BACKUP_PATH}"
    log "Encrypted backup (asymmetric): ${ENCRYPTED_PATH}"
    FINAL_PATH="${ENCRYPTED_PATH}"
  else
    log "WARNING: GPG encryption failed, keeping unencrypted"
    FINAL_PATH="${BACKUP_PATH}"
  fi
else
  log "WARNING: No BACKUP_ENCRYPTION_KEY or GPG_RECIPIENT set — backup is UNENCRYPTED"
  FINAL_PATH="${BACKUP_PATH}"
fi

# Upload to S3 (if configured)
if [ -n "${S3_BUCKET:-}" ]; then
  if aws s3 cp "${FINAL_PATH}" "s3://${S3_BUCKET}/db-backups/${FILENAME}" --only-show-errors; then
    log "Uploaded to s3://${S3_BUCKET}/db-backups/${FILENAME}"
  else
    log "WARNING: S3 upload failed"
  fi
fi

# Prune old backups (keep last 7 days)
find "${OUTPUT_DIR}" -name "udb-db-*.sql.gz" -o -name "udb-db-*.sql.gz.gpg" -mtime +7 -delete 2>/dev/null || true

log "Backup completed successfully"
exit 0
