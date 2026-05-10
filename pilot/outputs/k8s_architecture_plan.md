# K8s Architecture Plan

**Generated:** 2026-05-09T02:50:11.547Z

## Namespace
`sos-udb-production`

## Services
- gateway: 2-10 replicas, port 3000
- auth: 2-8 replicas, port 3001
- planner: 2-10 replicas, port 3002
- ai: 3-20 replicas, port 3003
- monitoring: 1-3 replicas, port 3004

## Ingress
- Host: `api.sos-udb.io`
- TLS: undefined
- Rate limit: 100 requests/minute per IP

## Autoscaling
- gateway: 2-10 replicas, CPU > 70%
- auth: 2-8 replicas, CPU > 70%
- planner: 2-10 replicas, CPU > 60%
- ai: 3-20 replicas, CPU > 50%
- monitoring: 1-3 replicas, CPU > 80%

## PDB
- All services: minAvailable=1

## Resource Quotas
- Requests: {"cpu":"500m","memory":"256Mi"}
- Limits: {"cpu":"1000m","memory":"512Mi"}