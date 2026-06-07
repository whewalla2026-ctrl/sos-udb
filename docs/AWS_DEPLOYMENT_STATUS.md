# AWS Deployment Status

**Last Updated:** 2026-06-07

## Prerequisites

| Tool | Status | Notes |
|------|--------|-------|
| AWS CLI | ❌ Not installed | Need `choco install awscli` or manual install |
| Terraform | ✅ v1.15.4 (latest: 1.15.5) | Minor upgrade available |
| AWS credentials | ❌ Not configured | Need `aws configure` or env vars |

## Terraform Configuration

Two configurations exist:

### 1. Root `infra/terraform/` (GCP)

- Provider: `hashicorp/google`
- Resources: Cloud SQL (PostgreSQL 15), Cloud Memorystore (Redis 7), Cloud Storage
- Status: **Legacy — not in use.** This was the original design before switching to AWS.

### 2. Staging `infra/terraform/staging/` (AWS)

- Provider: `hashicorp/aws` ~> 5.0
- Backend: S3 (`udb-terraform-state`) + DynamoDB locks (`udb-terraform-locks`)
- Modules: networking, database, cache, compute, storage, monitoring, secrets

### Module Coverage

| Module | Provisions | Status |
|--------|-----------|--------|
| networking | VPC, 2 AZs, public/private subnets, IGW, NAT, ALB SG | ✅ Created |
| database | RDS PostgreSQL 15 (TimescaleDB), subnet group, SG, IAM role | ✅ Created |
| cache | ElastiCache Redis 7, subnet group, SG | ✅ Created |
| compute | ECS Fargate cluster + service, ALB, CloudWatch logs | ✅ Created |
| storage | 4 S3 buckets (evidence, exports, backups, audit) with lifecycle | ✅ Created |
| monitoring | CloudWatch dashboard + 4 alarms + log metric filter | ✅ Created |
| secrets | AWS Secrets Manager (DB URL, JWT, Stripe, OpenAI, Pinecone, Firebase) | ✅ Created |

### Variables Required

| Variable | Source |
|----------|--------|
| `aws_region` | Default: `us-east-1` |
| `db_password` | From `.env` (`DB_PASSWORD=udb`) |
| `jwt_secret` | From `.env` |
| `stripe_secret_key` | Not in `.env` — needs manual input |
| `stripe_webhook_secret` | Not in `.env` — needs manual input |
| `openai_api_key` | Not in `.env` — needs manual input |
| `pinecone_api_key` | Not in `.env` — needs manual input |
| `ecr_repository_api` | Must be created via `aws ecr create-repository` |

## Deployment Steps

To deploy to AWS staging:

```
# 1. Install AWS CLI + configure credentials
choco install awscli
aws configure

# 2. Create S3 backend bucket (if not existing)
aws s3 mb s3://udb-terraform-state --region us-east-1
aws dynamodb create-table --table-name udb-terraform-locks ...

# 3. Push Docker images to ECR
aws ecr create-repository --repository-name udb-api
docker tag udb-api:latest <ecr-repo-uri>:latest
docker push <ecr-repo-uri>:latest

# 4. Terraform apply
cd infra/terraform/staging
terraform init
terraform plan -var="db_password=..."
terraform apply
```

## Blockers

1. ✅ Terraform installed and modules validated
2. ❌ AWS CLI not installed — cannot authenticate
3. ❌ No ECR repository created — no Docker images pushed
4. ❌ Missing secrets (Stripe, OpenAI, Pinecone) — not in `.env`
5. ❌ S3 backend bucket may not exist — needs `aws s3 mb`

## Recommendation

Install AWS CLI and verify credentials before attempting `terraform apply`. Without ECR images and API keys (Stripe, OpenAI, Pinecone), the deployment will be incomplete.
