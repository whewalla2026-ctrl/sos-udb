terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud SQL (PostgreSQL)
resource "google_sql_database_instance" "udb_postgres" {
  name             = "udb-master-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-f1-micro" # Use appropriate tier for production
    ip_configuration {
      ipv4_enabled = true
    }
  }
}

resource "google_sql_database" "udb_database" {
  name     = "udb"
  instance = google_sql_database_instance.udb_postgres.name
}

resource "google_sql_user" "udb_user" {
  name     = var.db_user
  instance = google_sql_database_instance.udb_postgres.name
  password = var.db_password
}

# Cloud Memorystore (Redis)
resource "google_redis_instance" "udb_redis" {
  name           = "udb-redis-cache"
  memory_size_gb = 1
  tier           = "BASIC" # Use STANDARD_HA for production
  redis_version  = "REDIS_7_X"
  region         = var.region
}

# Cloud Storage
resource "google_storage_bucket" "udb_media_bucket" {
  name          = "${var.project_id}-udb-media"
  location      = var.region
  force_destroy = true

  uniform_bucket_level_access = true
}

# Output
output "postgres_connection_name" {
  value = google_sql_database_instance.udb_postgres.connection_name
}

output "redis_host" {
  value = google_redis_instance.udb_redis.host
}
