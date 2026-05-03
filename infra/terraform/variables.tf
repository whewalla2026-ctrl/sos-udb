variable "project_id" {
  description = "The ID of the GCP project"
  type        = string
  default     = "udb-project"
}

variable "region" {
  description = "The region to deploy resources"
  type        = string
  default     = "us-central1"
}

variable "db_user" {
  description = "PostgreSQL user"
  type        = string
  default     = "udb_admin"
}

variable "db_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}
