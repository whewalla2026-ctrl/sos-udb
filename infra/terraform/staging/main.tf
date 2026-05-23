terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "udb-terraform-state"
    key            = "staging/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "udb-terraform-locks"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

module "networking" {
  source      = "../modules/networking"
  environment = "staging"
}

module "database" {
  source                = "../modules/database"
  environment           = "staging"
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.private_subnet_ids
  db_password           = var.db_password
  ecs_security_group_id = module.compute.ecs_security_group_id
}

module "cache" {
  source                = "../modules/cache"
  environment           = "staging"
  vpc_id                = module.networking.vpc_id
  subnet_ids            = module.networking.private_subnet_ids
  ecs_security_group_id = module.compute.ecs_security_group_id
}

module "compute" {
  source                  = "../modules/compute"
  environment             = "staging"
  vpc_id                  = module.networking.vpc_id
  public_subnet_ids       = module.networking.public_subnet_ids
  private_subnet_ids      = module.networking.private_subnet_ids
  database_url            = module.database.database_url
  database_direct_url     = module.database.database_url
  redis_url               = module.cache.redis_url
  db_security_group_id    = module.database.security_group_id
  redis_security_group_id = module.cache.security_group_id
  alb_security_group_id   = module.networking.alb_security_group_id
  ecr_repository_api      = var.ecr_repository_api
}

module "storage" {
  source      = "../modules/storage"
  environment = "staging"
}

module "monitoring" {
  source          = "../modules/monitoring"
  environment     = "staging"
  alb_arn_suffix  = module.compute.alb_dns
  ecs_cluster_name = module.compute.ecs_cluster_name
}

module "secrets" {
  source               = "../modules/secrets"
  environment          = "staging"
  db_password          = var.db_password
  jwt_secret           = var.jwt_secret
  stripe_secret_key    = var.stripe_secret_key
  stripe_webhook_secret = var.stripe_webhook_secret
  openai_api_key       = var.openai_api_key
  pinecone_api_key     = var.pinecone_api_key
}
