output "alb_dns" {
  description = "ALB DNS name for staging"
  value       = module.compute.alb_dns
}

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = module.database.endpoint
}

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = module.cache.endpoint
}

output "ecs_cluster" {
  description = "ECS cluster name"
  value       = module.compute.ecs_cluster_name
}

output "ecs_service" {
  description = "ECS service name"
  value       = module.compute.ecs_service_name
}

output "s3_evidence_bucket" {
  description = "S3 bucket for evidence uploads"
  value       = module.storage.evidence_bucket
}

output "s3_audit_bucket" {
  description = "S3 WORM bucket for audit logs"
  value       = module.storage.audit_bucket
}

output "cloudwatch_dashboard" {
  description = "CloudWatch dashboard name"
  value       = module.monitoring.dashboard_name
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.networking.vpc_id
}
