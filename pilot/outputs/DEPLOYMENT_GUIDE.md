# DEPLOYMENT GUIDE

## Prerequisites
- Node.js 18+ (tested on v24.15.0)
- PostgreSQL 16
- Redis 3+
- pnpm 9+
- Docker Desktop (for containerized deployment)
- Kubernetes cluster (for production orchestration)

## Environment Setup

### 1. Clone and Install
```bash
git clone https://github.com/whewalla2026-ctrl/sos-udb.git
cd sos-udb
pnpm install
```

### 2. Database Setup
```bash
# Create database
createdb udb

# Run migrations
cd services/api
npx prisma migrate dev

# Seed test data
npx prisma:seed
```

### 3. Environment Configuration
Create `services/api/.env`:
```
DATABASE_URL="postgresql://udb:udb@localhost:5432/udb?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="<generate-secure-secret>"
JWT_EXPIRY="7d"
API_PORT=4000
NODE_ENV="production"
```

### 4. Start Services

**Option A: Docker Compose**
```bash
docker compose -f docker-compose.prod.yml up -d
```

**Option B: Manual Start**
```bash
# Terminal 1: API Gateway + Microservices
cd services/api
node prisma/phase3/gateway.js          # Port 3000
node prisma/phase3/services/auth-service.js      # Port 3001
node prisma/phase3/services/planner-service.js   # Port 3002
node prisma/phase3/services/ai-service.js         # Port 3003
node prisma/phase3/services/monitoring-service.js # Port 3004

# Terminal 2: NestJS GraphQL API
cd services/api
npm run build && node dist/src/main.js  # Port 4000

# Terminal 3: Frontend
cd apps/web
npm run dev                             # Port 3030
```

### 5. Verify Deployment
```bash
# Health checks
curl http://localhost:3000/gateway/health
curl http://localhost:3001/auth/health
curl http://localhost:3002/planner/health
curl http://localhost:3003/ai/health
curl http://localhost:3004/monitoring/health
curl http://localhost:4000/graphql -X POST -H "Content-Type: application/json" -d '{"query":"{__typename}"}'
curl http://localhost:3030/
```

## Docker Deployment

### Build Images
```bash
docker compose -f docker-compose.prod.yml build
```

### Run Stack
```bash
docker compose -f docker-compose.prod.yml up -d
```

### Verify Containers
```bash
docker compose ps
docker compose logs --tail=50
```

## Kubernetes Deployment

### Prerequisites
- kubectl configured
- Kubernetes cluster (GKE, EKS, minikube, or Docker Desktop K8s)

### Deploy
```bash
kubectl apply -f pilot/outputs/sos-udb-k8s-manifests.yaml
```

### Verify
```bash
kubectl get pods
kubectl get svc
kubectl get ingress
```

## Rollback Plan
See `ROLLBACK_CHECKLIST.md` for detailed rollback procedures.
