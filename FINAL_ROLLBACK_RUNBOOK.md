# Rollback Runbook — Phase 1-2 MVP

## Trigger Conditions

Immediately rollback if ANY of:

- AI cost exceeds 2x baseline for 2 consecutive cycles
- Onboarding completion drops below 75%
- DB corruption or inconsistency detected
- Monitoring becomes unreliable (missing >5% of expected logs)
- Fallback system fails (returns empty responses for >10% of requests)
- Any critical security vulnerability discovered

## Rollback Steps

### Git Rollback
```bash
# Option 1: Revert to previous tag
git checkout phase-1-2-mvp-rc1
git revert HEAD --no-edit
git push origin release/phase-2

# Option 2: Hard reset (if not yet pushed)
git reset --hard HEAD~1
```

### Database Rollback
```bash
# If migration was applied
npx prisma migrate reset --force
npx prisma migrate deploy  # re-apply previous migration
```

### Container Rollback
```bash
# Rollback Docker
docker pull udb-api:previous-tag
docker stop udb-api
docker run -d --name udb-api --network host udb-api:previous-tag
```

### Verification After Rollback
```bash
curl -f http://localhost:3000/monitoring/health
curl -f http://localhost:3000/monitoring/metrics
node pilot/scripts/mvp-validate.js
node pilot/scripts/failure-injection-tests.js
```

## Post-Rollback
1. Document root cause in `pilot/incidents/`
2. Update early warning signal thresholds
3. Notify affected users
4. Schedule fix with updated test coverage
