# UDB Deployment Runbook

**Version:** 11.0 | **Updated:** 2026-05-23

---

## Prerequisites

- AWS CLI configured with appropriate IAM role (for cloud deployment)
- Terraform >= 1.5 installed (for cloud deployment)
- Docker and Docker Compose installed (for local deployment)
- Node.js 20 + pnpm 9 installed
- SSH key configured for GitHub access

---

## First-Time Setup

### 1. Clone and Configure

```bash
git clone git@github.com:whewalla2026-ctrl/sos-udb.git
cd sos-udb
cp .env.example .env
# Edit .env with your actual values
```

### 2. Local Development

```bash
docker compose -f docker-compose.prod.yml up -d
pnpm install
npx prisma migrate deploy --schema=services/api/prisma/schema.prisma
pnpm dev
```

### 3. Run Tests

```bash
pnpm test                     # Unit tests (127)
pnpm run test:integration     # Integration tests (18)
pnpm run test:e2e             # E2E tests (33)
bash scripts/smoke-test.sh    # 11 smoke tests
```

---

## Deploy to Staging (Cloud)

### Step 1: Provision Infrastructure

```bash
cd infra/terraform/staging
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with real values (never commit)
terraform init
terraform plan -out=staging.plan
terraform apply staging.plan
```

### Step 2: Configure GitHub Secrets

See [GITHUB_SECRETS.md](GITHUB_SECRETS.md) for all required secrets.
Set them in GitHub Settings > Secrets and variables > Actions.

### Step 3: Push to Trigger CI/CD

```bash
git push origin release/v1-production
# Monitor: https://github.com/whewalla2026-ctrl/sos-udb/actions
# Or: gh run list --limit 5
```

---

## Health Check Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| API | `/health` | `{"status":"ok","database":"up","redis":"up"}` |
| Frontend | `/` | 200 OK |
| Prometheus | `:9090` | 302 redirect |
| Grafana | `:3005` | Login page (302) |
| Jaeger | `:16686` | 200 OK |

---

## Rollback Procedures

### Application Rollback (Docker Compose)

```bash
# Rollback to previous tag
git checkout v10.0-staging-deployed
docker compose -f docker-compose.prod.yml up -d --build
# Or use automation script
powershell -File scripts/rollback.ps1 -Target all
```

### Application Rollback (ECS)

```bash
aws ecs update-service --cluster udb-staging --service api \
  --task-definition udb-api:<previous-revision> --force-new-deployment
```

### Database Rollback

```bash
# Prisma doesn't support down migrations — restore from RDS snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier udb-staging-restored \
  --db-snapshot-identifier <snapshot-id>
```

### Feature Flag Emergency Off

All risky features are OFF by default (13 deferred flags). To disable any flag immediately:

```bash
# Set environment variable (restart required)
FEATURE_FLAG_<NAME>=false docker compose up -d
```

---

## Monitoring

### Dashboards

| Platform | URL (Localhost) | URL (Cloud) |
|----------|----------------|-------------|
| Grafana | http://localhost:3005 | `https://<alb-dns>/grafana` |
| Prometheus | http://localhost:9090 | `https://<alb-dns>/prometheus` |
| Jaeger | http://localhost:16686 | `https://<alb-dns>/jaeger` |
| CloudWatch | — | AWS Console > CloudWatch |

### Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| ECS CPU > 80% | 5 min avg | Auto-scaling triggers |
| ECS Memory > 80% | 5 min avg | Auto-scaling triggers |
| RDS connections > 80 | 3 min avg | Increase pool size |
| ALB 5XX > 10 | 2 min sum | Check API logs |

### Logs

```bash
# Docker
docker compose -f docker-compose.prod.yml logs -f api

# ECS
aws logs tail /ecs/udb-staging-api --follow

# Loki (cloud)
# Query via Grafana Explore > Loki data source
```

---

## Incident Response

1. **Check Grafana dashboard** for metric anomalies
2. **Check Prometheus alerts** for fired/ pending alerts
3. **Query Loki logs** for error patterns
4. **Check ECS task logs** via CloudWatch
5. **If application issue**: toggle feature flag OFF, then rollback
6. **If database issue**: restore from snapshot, verify data integrity
7. **If security issue**: rotate all secrets, audit access logs

---

## Key Commands Quick Reference

```bash
# Start stack
docker compose -f docker-compose.prod.yml up -d

# Stop stack
docker compose -f docker-compose.prod.yml down

# Rebuild single service
docker compose -f docker-compose.prod.yml up -d --build api

# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Run migration
npx prisma migrate deploy --schema=services/api/prisma/schema.prisma

# Create migration
npx prisma migrate dev --schema=services/api/prisma/schema.prisma --name description

# Run smoke tests
bash scripts/smoke-test.sh http://localhost:4000
```
