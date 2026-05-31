# UDB Disaster Recovery & Runtime Procedures

**Version:** v15.0-hardened | **Date:** 2026-05-31

## Incident Response

### Severity Levels

| Level | Definition | Response Time | Examples |
|-------|-----------|---------------|----------|
| P0 | Complete outage | Immediate | API down, DB crash, frontend 5xx |
| P1 | Major feature broken | 1 hour | Login fails, quests not saving |
| P2 | Minor feature degraded | 4 hours | AI tutor slow, metrics stale |
| P3 | Cosmetic / non-critical | 24 hours | UI misalignment, typos |

### Incident Response Steps

1. **Detect** — via Grafana alerts, AlertManager, or user reports
2. **Assess** — Check `docker ps`, API `/health`, Grafana dashboards
3. **Contain** — Restart service, rollback deployment, toggle feature flag
4. **Resolve** — Apply fix, verify, commit
5. **Review** — Update runbook, document root cause

## Runtime Procedures

### Container Health Check

```bash
docker ps --format "table {{.Names}}\t{{.Status}}"
```

Expected: 18 containers, all "Up" or "(healthy)".

### Restart a Service

```bash
docker-compose -f docker-compose.prod.yml restart <service-name>
```

### View Logs

```bash
docker logs udb-api --tail 100
docker logs udb-gateway --tail 100
```

### Check API Health

```bash
curl -s http://localhost:4000/health | python3 -m json.tool
```

### Check Database Connection

```bash
docker exec udb-postgres psql -U udb -d udb -c "SELECT 1;"
```

### Check Redis

```bash
docker exec udb-redis redis-cli PING
```

## Database Recovery

### Restore from Encrypted Backup

```bash
# On the db-backup container:
BACKUP_FILE="/backups/udb_20260531_120000.dump.gpg"
DECRYPTED="/tmp/restore.dump"

# Decrypt (requires BACKUP_ENCRYPTION_KEY)
gpg --batch --yes --passphrase "$BACKUP_ENCRYPTION_KEY" \
  --decrypt "$BACKUP_FILE" > "$DECRYPTED"

# Restore
pg_restore -h udb-postgres -U udb -d udb -c "$DECRYPTED"
```

### Manual Backup Trigger

```bash
docker exec udb-db-backup sh -c 'pg_dump -Fc > /backups/manual_$(date +%Y%m%d_%H%M%S).dump'
```

## AlertManager Receivers

| Receiver | URL | Purpose |
|----------|-----|---------|
| default-webhook | `http://udb-api:4000/webhooks/alerts` | All non-critical alerts |
| critical-webhook | `http://udb-api:4000/webhooks/alerts` | Severity=critical alerts (1h repeat) |

## Feature Flag Emergency Toggle

If a feature causes issues, turn it off immediately:

```bash
# Via API (requires auth)
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"query":"mutation { setFlag(name: \"problematic-flag\", enabled: false) }"}'
```

Or restart the API container to revert to compiled defaults.

## Rollback Procedure

```bash
# Revert to previous version
git checkout <previous-tag>
docker-compose -f docker-compose.prod.yml up -d --build
```

## Known Failure Modes

| Failure | Symptoms | Recovery |
|---------|----------|----------|
| Redis down | Rate limiting disabled, queues broken | Restart Redis container |
| PostgreSQL down | API returns 503, health fails | Restart Postgres, check pgBouncer |
| Nginx certs expired | Browser SSL warning | Restart nginx (self-signed regenerated on start) |
| API OOM | Container killed by OOM | Increase memory limit in compose |
| pnpm install timeout | Docker build fails | Retry build (intermittent npm registry issue) |
| Backup disk full | Backup script errors | Delete old backups, increase volume size |
