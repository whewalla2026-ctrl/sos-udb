variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "node_type" { type = string; default = "cache.r6g.large" }
variable "num_cache_nodes" { type = number; default = 1 }

resource "aws_security_group" "redis" {
  name_prefix = "udb-${var.environment}-redis-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }
  tags = { Name = "udb-${var.environment}-redis-sg" }
}

variable "ecs_security_group_id" { type = string }

resource "aws_elasticache_subnet_group" "main" {
  name       = "udb-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id          = "udb-${var.environment}"
  description                   = "UDB ${var.environment} Redis"
  node_type                     = var.node_type
  num_cache_clusters            = var.environment == "production" ? 2 : var.num_cache_nodes
  port                          = 6379
  parameter_group_name          = "default.redis7"
  subnet_group_name             = aws_elasticache_subnet_group.main.name
  security_group_ids            = [aws_security_group.redis.id]
  automatic_failover_enabled    = var.environment == "production"
  multi_az_enabled              = var.environment == "production"
  at_rest_encryption_enabled    = true
  transit_encryption_enabled    = true
  auto_minor_version_upgrade    = true
  maintenance_window            = "sun:05:00-sun:06:00"
  snapshot_retention_limit      = 3
  snapshot_window               = "02:00-03:00"
  tags = { Environment = var.environment }
}

output "endpoint" { value = aws_elasticache_replication_group.main.primary_endpoint_address }
output "port" { value = 6379 }
output "redis_url" {
  value     = "redis://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
  sensitive = false
}
output "security_group_id" { value = aws_security_group.redis.id }
