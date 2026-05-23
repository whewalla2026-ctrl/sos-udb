# GitHub Secrets — Required for CI/CD

**Last updated:** 2026-05-23
**Branch:** `release/v1-production`

---

## How to Configure

1. Go to GitHub repository Settings → Secrets and variables → Actions
2. Click "New repository secret" for each entry below
3. Paste the actual secret value (never commit secrets to the repository)

---

## Required Secrets

| Secret Name | Description | Required For | Source |
|-------------|-------------|--------------|--------|
| `AWS_ROLE_ARN` | IAM role ARN for OIDC federation (no static keys) | ECS deploy, Terraform | AWS IAM console |
| `AWS_REGION` | AWS region, e.g., `us-east-1` | All AWS operations | AWS console |
| `DATABASE_URL` | Staging RDS connection string | Prisma migrations, API | Terraform output after `apply` |
| `DIRECT_URL` | Direct RDS connection (bypasses PgBouncer) | Prisma migrations | Terraform output after `apply` |
| `REDIS_URL` | Staging ElastiCache connection string | API caching, BullMQ | Terraform output after `apply` |
| `JWT_SECRET` | 256-bit secret for JWT signing | Auth service | Generated locally |
| `JWT_EXPIRY` | JWT token expiry (e.g., `2h`) | Auth service | Configuration |
| `STRIPE_SECRET_KEY` | Stripe test mode key (`sk_test_...`) | Billing, Escrow | Stripe dashboard |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | Webhook verification | Stripe dashboard |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Connect client ID | Marketplace escrow | Stripe dashboard |
| `OPENAI_API_KEY` | OpenAI API key | AI tutor service | OpenAI platform |
| `PINECONE_API_KEY` | Pinecone vector DB key | Skill gap analysis | Pinecone console |
| `PINECONE_ENVIRONMENT` | Pinecone environment | Vector search | Pinecone console |
| `PINECONE_INDEX` | Pinecone index name | Vector search | Pinecone console |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Firebase auth | Firebase console |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key | Firebase auth | Firebase console |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email | Firebase auth | Firebase console |
| `SLACK_WEBHOOK_URL` | Slack webhook for deploy notifications | CI/CD notifications | Slack workspace |
| `STAGING_ALB_DNS` | ALB DNS name (set after Terraform apply) | Smoke tests, monitoring | Terraform output |
| `NEXT_PUBLIC_APP_URL` | Public URL of the staging environment | Frontend | Terraform output |

---

## Environment-Specific Secrets

For local development, these are set in `.env`. For CI/CD, they are set as GitHub Secrets referenced in the workflow file.

### Staging

Set all secrets above with staging-specific values (RDS endpoint, staging API keys, etc.)

### Production

Production secrets follow the same pattern but with production-specific values and stricter access controls. Production secrets should be set in a separate GitHub Environment with required approval for deployment.

---

## Security Notes

- Never commit actual secret values to the repository
- Use AWS IAM roles (OIDC) instead of static keys where possible
- Rotate secrets regularly
- Use GitHub Environments for production secrets with approval gates
- All secrets are referenced in `.github/workflows/staging-deploy.yml` via `${{ secrets.SECRET_NAME }}`
