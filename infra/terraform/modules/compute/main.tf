variable "environment" { type = string }
variable "vpc_id" { type = string }
variable "public_subnet_ids" { type = list(string) }
variable "private_subnet_ids" { type = list(string) }
variable "database_url" { type = string; sensitive = true }
variable "database_direct_url" { type = string; sensitive = true }
variable "redis_url" { type = string }
variable "db_security_group_id" { type = string }
variable "redis_security_group_id" { type = string }
variable "image_tag" { type = string; default = "latest" }
variable "ecr_repository_api" { type = string }

resource "aws_security_group" "ecs_tasks" {
  name_prefix = "udb-${var.environment}-ecs-"
  vpc_id      = var.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  tags = { Name = "udb-${var.environment}-ecs-sg" }
}

resource "aws_ecs_cluster" "main" {
  name = "udb-${var.environment}"
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
  tags = { Environment = var.environment }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]
  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }
}

data "aws_iam_policy_document" "ecs_task_execution" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "ecs_execution" {
  name_prefix        = "udb-${var.environment}-ecs-exec-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution.json
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role" "ecs_task" {
  name_prefix        = "udb-${var.environment}-ecs-task-"
  assume_role_policy = data.aws_iam_policy_document.ecs_task_execution.json
}

resource "aws_iam_role_policy" "ecs_task_secrets" {
  name   = "udb-${var.environment}-ecs-secrets"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.secrets_read.json
}

data "aws_iam_policy_document" "secrets_read" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = ["arn:aws:secretsmanager:*:*:secret:udb/${var.environment}/*"]
  }
}

resource "aws_ecs_task_definition" "api" {
  family                   = "udb-${var.environment}-api"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = 512
  memory                   = 1024
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  container_definitions = jsonencode([
    {
      name  = "api"
      image = "${var.ecr_repository_api}:${var.image_tag}"
      portMappings = [{ containerPort = 4000, protocol = "tcp" }]
      environment = [
        { name = "NODE_ENV", value = var.environment },
        { name = "API_PORT", value = "4000" },
        { name = "REDIS_URL", value = var.redis_url }
      ]
      secrets = [
        { name = "DATABASE_URL", valueFrom = "arn:aws:secretsmanager:*:*:secret:udb/${var.environment}/database_url" },
        { name = "DIRECT_URL", valueFrom = "arn:aws:secretsmanager:*:*:secret:udb/${var.environment}/direct_url" },
        { name = "JWT_SECRET", valueFrom = "arn:aws:secretsmanager:*:*:secret:udb/${var.environment}/jwt_secret" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/udb-${var.environment}"
          "awslogs-region"        = "us-east-1"
          "awslogs-stream-prefix" = "api"
        }
      }
      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:4000/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }
    }
  ])
  tags = { Environment = var.environment }
}

resource "aws_lb" "main" {
  name               = "udb-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_security_group_id]
  subnets            = var.public_subnet_ids
  tags = { Environment = var.environment }
}

variable "alb_security_group_id" { type = string }

resource "aws_lb_target_group" "api" {
  name_prefix = "udb-api-"
  port        = 4000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"
  health_check {
    path                = "/health"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
  tags = { Environment = var.environment }
}

resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_ecs_service" "api" {
  name            = "udb-${var.environment}-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"
  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_tasks.id]
  }
  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 4000
  }
  tags = { Environment = var.environment }
}

resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/udb-${var.environment}"
  retention_in_days = 30
  tags = { Environment = var.environment }
}

output "alb_dns" { value = aws_lb.main.dns_name }
output "alb_zone_id" { value = aws_lb.main.zone_id }
output "ecs_security_group_id" { value = aws_security_group.ecs_tasks.id }
output "ecs_cluster_name" { value = aws_ecs_cluster.main.name }
output "ecs_service_name" { value = aws_ecs_service.api.name }
