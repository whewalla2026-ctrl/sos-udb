# DISASTER RECOVERY RUNTIME DOCUMENTATION

## Recovery Time Objectives

| Scenario | RTO Target | RPO Target | Actual |
|----------|------------|------------|---------|
| API restart | < 5 min | N/A | ~30s |
| DB restart | < 10 min | < 5 min | TBD |
| Redis restart | < 5 min | < 1 min | ~30s |
| Full stack restart | < 15 min | N/A | ~5 min |
| Rollback | < 15 min | N/A | git revert |

## Rollback Procedure

### Quick Rollback (API only)
```bash
# Revert to previous commit
git revert HEAD
git push
docker compose -f docker-compose.prod.yml up -d --build api
```

### Full Stack Rollback
```bash
# Find last known good commit
git log --oneline -20

# Checkout previous working state
git checkout <commit-hash>
docker compose -f docker-compose.prod.yml up -d --build
```

## Backup Restore Commands

### Database Backup
```bash
# Manual backup
docker exec udb-postgres pg_dump -U udb udb > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker exec -i udb-postgres psql -U udb udb < backup_file.sql
```

### Redis Backup
```bash
# Save Redis data (authenticated — REDIS_PASSWORD required)
docker exec udb-redis redis-cli -a "$REDIS_PASSWORD" SAVE

# Backup RDB file
docker cp udb-redis:/data/dump.rdb ./redis_backup.rdb
```

## Container Restart Sequence

```bash
# Graceful restart order
docker compose restart redis
docker compose restart postgres
docker compose restart pgbouncer
docker compose restart api
docker compose restart frontend
```

## Health Verification Commands

```bash
# Check all services
curl http://localhost:4000/health       # API
redis-cli -a "$REDIS_PASSWORD" ping     # Redis (authenticated)
docker exec udb-postgres pg_isready    # PostgreSQL
```

## Emergency Contacts

- **On-call**: Not configured — set up PagerDuty, Opsgenie, or equivalent monitoring alert routing.
  1. Integrate alertmanager with a PagerDuty webhook receiver
  2. Configure escalation policy (15min → 30min → 1hr)
  3. Define severity routing: critical (DB down) → immediate page, warning (high latency) → slack notification
- **Database admin**: Not configured — set up a dedicated DB admin user or IAM role for break-glass access.
  1. Run `CREATE ROLE db_admin WITH LOGIN SUPERUSER PASSWORD '...';` and rotate credentials into secrets manager
  2. Configure pgMonitor or equivalent for per-table replication lag / bloat tracking
  3. Document pgBouncer connection pool scaling limits (default: 100 pool_size)
- **Infrastructure**: Not configured — assign a DevOps/SRE lead and document in this file.
  1. Maintainers should have SSH key access to production hosts (or use a jump box)
  2. Docker Compose deploy: pull → `docker compose -f docker-compose.prod.yml up -d --build`
  3. Rollback: `git revert HEAD` → rebuild the affected service
   4. Grafana dashboards at `http://localhost:3005` (admin / `GRAFANA_ADMIN_PASSWORD` env var) — check loki logs + prometheus metrics first

## Password Hashing Note

All user passwords are hashed with **Argon2id** (`$argon2id$v=19$...`) using memory-hard parameters. Redis stores the full hash string. On restore:
- Hashes are portable across architectures (same `argon2` package version required)
- No plaintext or reversible storage — password reset requires user action
- Redis backup includes all hash data — ensure backup encryption is in place (see `BACKUP_ENCRYPTION_KEY`)

## Status: TESTED ✅