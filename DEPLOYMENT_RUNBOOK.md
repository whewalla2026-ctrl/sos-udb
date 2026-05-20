# SOS-UDB Production Deployment Runbook

## Pre-Deployment Checklist
- [ ] All tests passing (typecheck 4/4, E2E 29/29)
- [ ] Security scan passed (npm audit, secret scan)
- [ ] Load test passed (k6)
- [ ] Chaos engineering scenarios verified
- [ ] Compliance validation complete
- [ ] Database backups verified
- [ ] Rollback plan prepared

## Deployment Environments

### Staging (Pre-Production)
```
URL: https://staging.sos-udb.example.com
Stack: Docker Compose
Database: PostgreSQL 16 (staging-db)
Redis: 7.x (staging-cache)
```

### Production
```
URL: https://sos-udb.example.com
Stack: Kubernetes (EKS) or Docker Compose
Database: PostgreSQL 16 (prod-db) with PgBouncer
Redis: 7.x (prod-cache) with Sentinel
```

## Deployment Methods

### Method 1: Docker Compose (Recommended for Small Scale)
```bash
# Pull latest images
git pull origin release/v1-production

# Build and deploy
docker-compose -f docker-compose.prod.yml up -d --build

# Verify health
curl http://localhost:4000/health

# Check logs
docker-compose -f docker-compose.prod.yml logs -f api
```

### Method 2: Kubernetes (Recommended for Scale)
```bash
# Apply manifests in order
kubectl apply -f infra/k8s/01-namespace.yaml
kubectl apply -f infra/k8s/02-postgres.yaml
kubectl apply -f infra/k8s/03-redis.yaml
kubectl apply -f infra/k8s/04-api.yaml
kubectl apply -f infra/k8s/05-frontend.yaml
kubectl apply -f infra/k8s/06-ingress.yaml
kubectl apply -f infra/k8s/07-secrets.yaml

# Verify deployment
kubectl rollout status deployment/api
kubectl rollout status deployment/frontend
```

## Health Check Endpoints
| Service | Endpoint | Expected Response |
|---------|-----------|-------------------|
| API | `/health` | `{status: "ok", database: "up", redis: "up"}` |
| Frontend | `/` | 200 OK |
| Prometheus | `:9090` | UI loads |
| Grafana | `:3005` | Login page |

## Rolling Back
```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d v1.9.0

# Kubernetes
kubectl rollout undo deployment/api
kubectl rollout undo deployment/frontend
```

## Monitoring
- **Grafana**: http://localhost:3005 (admin/admin123)
- **Prometheus**: http://localhost:9090
- **Jaeger**: http://localhost:16686

## Alerting
Critical alerts configured in Prometheus:
- API down > 1 minute
- Database connections > 80%
- Redis memory > 90%
- Error rate > 5%

## Incident Response
See `pilot/outputs/incident_response_runbook.md`

## Post-Deployment Verification
1. Run smoke tests: `npm run test:e2e`
2. Check error rates in Grafana
3. Verify database queries performing
4. Confirm backup job running
5. Test failover (if configured)

## Key Contacts
- DevOps Lead: [Contact]
- Security Lead: [Contact]
- On-Call: [Contact]