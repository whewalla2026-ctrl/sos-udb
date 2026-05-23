variable "environment" { type = string }

resource "aws_s3_bucket" "evidence" {
  bucket        = "udb-${var.environment}-evidence"
  force_destroy = var.environment != "production"
  tags = { Name = "UDB Evidence", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "evidence" {
  bucket = aws_s3_bucket.evidence.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "evidence" {
  bucket                  = aws_s3_bucket.evidence.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "exports" {
  bucket        = "udb-${var.environment}-exports"
  force_destroy = var.environment != "production"
  tags = { Name = "UDB Exports", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "exports" {
  bucket = aws_s3_bucket.exports.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "exports" {
  bucket = aws_s3_bucket.exports.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "exports" {
  bucket                  = aws_s3_bucket.exports.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket" "backups" {
  bucket        = "udb-${var.environment}-backups"
  force_destroy = var.environment != "production"
  tags = { Name = "UDB Backups", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "backups" {
  bucket = aws_s3_bucket.backups.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id
  rule {
    id     = "expire-old-backups"
    status = "Enabled"
    expiration { days = 90 }
  }
}

resource "aws_s3_bucket" "audit_worm" {
  bucket        = "udb-${var.environment}-audit"
  force_destroy = false
  object_lock_enabled = true
  tags = { Name = "UDB Audit (WORM)", Environment = var.environment }
}

resource "aws_s3_bucket_versioning" "audit_worm" {
  bucket = aws_s3_bucket.audit_worm.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audit_worm" {
  bucket = aws_s3_bucket.audit_worm.id
  rule { apply_server_side_encryption_by_default { sse_algorithm = "AES256" } }
}

resource "aws_s3_bucket_public_access_block" "audit_worm" {
  bucket                  = aws_s3_bucket.audit_worm.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_object_lock_configuration" "audit_worm" {
  bucket = aws_s3_bucket.audit_worm.id
  rule {
    default_retention {
      mode = "COMPLIANCE"
      days = 365
    }
  }
}

output "evidence_bucket" { value = aws_s3_bucket.evidence.id }
output "exports_bucket" { value = aws_s3_bucket.exports.id }
output "backups_bucket" { value = aws_s3_bucket.backups.id }
output "audit_bucket" { value = aws_s3_bucket.audit_worm.id }
