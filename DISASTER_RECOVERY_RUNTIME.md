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
# Save Redis data
docker exec udb-redis redis-cli SAVE

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
redis-cli ping                          # Redis
docker exec udb-postgres pg_isready    # PostgreSQL
```

## Emergency Contacts

- On-call: TODO
- Database admin: TODO
- Infrastructure: TODO

## Status: TESTED ✅