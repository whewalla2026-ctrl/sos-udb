variable "environment" { type = string }
variable "db_password" { type = string; sensitive = true }
variable "jwt_secret" { type = string; sensitive = true }
variable "stripe_secret_key" { type = string; sensitive = true }
variable "stripe_webhook_secret" { type = string; sensitive = true }
variable "openai_api_key" { type = string; sensitive = true }
variable "pinecone_api_key" { type = string; sensitive = true }

resource "aws_secretsmanager_secret" "database_url" {
  name        = "udb/${var.environment}/database_url"
  description = "UDB ${var.environment} database connection URL"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "direct_url" {
  name        = "udb/${var.environment}/direct_url"
  description = "UDB ${var.environment} direct database URL (bypasses PgBouncer)"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "direct_url" {
  secret_id     = aws_secretsmanager_secret.direct_url.id
  secret_string = var.db_password
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name        = "udb/${var.environment}/jwt_secret"
  description = "UDB ${var.environment} JWT signing secret"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = var.jwt_secret
}

resource "aws_secretsmanager_secret" "stripe_secret_key" {
  name        = "udb/${var.environment}/stripe_secret_key"
  description = "UDB ${var.environment} Stripe secret key"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "stripe_secret_key" {
  secret_id     = aws_secretsmanager_secret.stripe_secret_key.id
  secret_string = var.stripe_secret_key
}

resource "aws_secretsmanager_secret" "stripe_webhook_secret" {
  name        = "udb/${var.environment}/stripe_webhook_secret"
  description = "UDB ${var.environment} Stripe webhook secret"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "stripe_webhook_secret" {
  secret_id     = aws_secretsmanager_secret.stripe_webhook_secret.id
  secret_string = var.stripe_webhook_secret
}

resource "aws_secretsmanager_secret" "openai_api_key" {
  name        = "udb/${var.environment}/openai_api_key"
  description = "UDB ${var.environment} OpenAI API key"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "openai_api_key" {
  secret_id     = aws_secretsmanager_secret.openai_api_key.id
  secret_string = var.openai_api_key
}

resource "aws_secretsmanager_secret" "pinecone_api_key" {
  name        = "udb/${var.environment}/pinecone_api_key"
  description = "UDB ${var.environment} Pinecone API key"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret_version" "pinecone_api_key" {
  secret_id     = aws_secretsmanager_secret.pinecone_api_key.id
  secret_string = var.pinecone_api_key
}

resource "aws_secretsmanager_secret" "redis_url" {
  name        = "udb/${var.environment}/redis_url"
  description = "UDB ${var.environment} Redis connection URL"
  tags = { Environment = var.environment }
}

resource "aws_secretsmanager_secret" "firebase_private_key" {
  name        = "udb/${var.environment}/firebase_private_key"
  description = "UDB ${var.environment} Firebase private key"
  tags = { Environment = var.environment }
}

output "secret_arns" {
  value = {
    database_url    = aws_secretsmanager_secret.database_url.arn
    direct_url      = aws_secretsmanager_secret.direct_url.arn
    jwt_secret      = aws_secretsmanager_secret.jwt_secret.arn
    stripe_key      = aws_secretsmanager_secret.stripe_secret_key.arn
    stripe_webhook  = aws_secretsmanager_secret.stripe_webhook_secret.arn
    openai_key      = aws_secretsmanager_secret.openai_api_key.arn
    pinecone_key    = aws_secretsmanager_secret.pinecone_api_key.arn
    redis_url       = aws_secretsmanager_secret.redis_url.arn
    firebase_key    = aws_secretsmanager_secret.firebase_private_key.arn
  }
}
