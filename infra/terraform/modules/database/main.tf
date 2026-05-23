variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "subnet_ids" { type = list(string) }
variable "db_password" { type = string; sensitive = true }
variable "instance_class" { type = string; default = "db.r6g.large" }
variable "allocated_storage" { type = number; default = 50 }

resource "aws_db_subnet_group" "main" {
  name       = "udb-${var.environment}"
  subnet_ids = var.subnet_ids
}

resource "aws_security_group" "db" {
  name_prefix = "udb-${var.environment}-db-"
  vpc_id      = var.vpc_id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [var.ecs_security_group_id]
  }
  tags = { Name = "udb-${var.environment}-db-sg" }
}

variable "ecs_security_group_id" { type = string }

resource "aws_db_parameter_group" "timescaledb" {
  family = "postgres15"
  name   = "udb-${var.environment}-timescaledb"
  parameter {
    name  = "shared_preload_libraries"
    value = "timescaledb"
  }
  parameter {
    name  = "timescaledb.license"
    value = "community"
  }
}

resource "aws_db_instance" "main" {
  identifier              = "udb-${var.environment}"
  engine                  = "postgres"
  engine_version          = "15"
  instance_class          = var.instance_class
  allocated_storage       = var.allocated_storage
  storage_encrypted       = true
  db_name                 = "udb"
  username                = "udb_admin"
  password                = var.db_password
  parameter_group_name    = aws_db_parameter_group.timescaledb.name
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.db.id]
  multi_az                = var.environment == "production"
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"
  skip_final_snapshot     = var.environment != "production"
  storage_type            = "gp3"
  monitoring_interval     = 60
  monitoring_role_arn     = aws_iam_role.rds_enhanced_monitoring.arn
  tags = { Environment = var.environment }
}

data "aws_iam_policy" "rds_enhanced_monitoring" {
  arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

resource "aws_iam_role" "rds_enhanced_monitoring" {
  name_prefix = "udb-${var.environment}-rds-mon-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = { Service = "monitoring.rds.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "rds_enhanced_monitoring" {
  role       = aws_iam_role.rds_enhanced_monitoring.name
  policy_arn = data.aws_iam_policy.rds_enhanced_monitoring.arn
}

output "endpoint" { value = aws_db_instance.main.endpoint }
output "address" { value = aws_db_instance.main.address }
output "port" { value = aws_db_instance.main.port }
output "database_url" {
  value     = "postgresql://udb_admin:${var.db_password}@${aws_db_instance.main.endpoint}/udb"
  sensitive = true
}
output "security_group_id" { value = aws_security_group.db.id }
