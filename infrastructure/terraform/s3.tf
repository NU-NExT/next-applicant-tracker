data "aws_caller_identity" "current" {}

locals {
  bucket_name_suffix = "${data.aws_caller_identity.current.account_id}-${var.aws_region}"
}

resource "aws_s3_bucket" "resumes" {
  bucket = "${local.name_prefix}-resumes-${local.bucket_name_suffix}"
  tags   = merge(local.common_tags, { Purpose = "candidate-resume-storage" })
}

resource "aws_s3_bucket" "transcripts" {
  bucket = "${local.name_prefix}-transcripts-${local.bucket_name_suffix}"
  tags   = merge(local.common_tags, { Purpose = "candidate-transcript-storage" })
}

resource "aws_s3_bucket" "files" {
  bucket = "${local.name_prefix}-files-${local.bucket_name_suffix}"
  tags   = merge(local.common_tags, { Purpose = "application-file-storage" })
}

resource "aws_s3_bucket_versioning" "resumes" {
  bucket = aws_s3_bucket.resumes.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "transcripts" {
  bucket = aws_s3_bucket.transcripts.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "files" {
  bucket = aws_s3_bucket.files.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "resumes" {
  bucket                  = aws_s3_bucket.resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "transcripts" {
  bucket                  = aws_s3_bucket.transcripts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "files" {
  bucket                  = aws_s3_bucket.files.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Pre-create logical prefixes used by the backend. The database stores object keys
# (e.g. application_submissions.resume_s3_key) that point back into these buckets.
resource "aws_s3_object" "resume_prefix" {
  bucket = aws_s3_bucket.resumes.id
  key    = "candidate-resumes/"
}

resource "aws_s3_object" "transcript_prefix" {
  bucket = aws_s3_bucket.transcripts.id
  key    = "candidate-transcripts/"
}

resource "aws_s3_object" "file_prefix" {
  bucket = aws_s3_bucket.files.id
  key    = "application-files/"
}
