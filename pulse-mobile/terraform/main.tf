terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# S3 bucket for hosting the PWA
resource "aws_s3_bucket" "pulse_mobile_bucket" {
  bucket = var.bucket_name

  tags = {
    Project     = "pulse"
    Environment = var.environment
    Owner       = "pulse-team"
    CostCenter  = "pulse-app"
    ManagedBy   = "terraform"
    Component   = "mobile-app"
    Description = "S3 bucket for hosting Pulse mobile PWA"
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "pulse_mobile_versioning" {
  bucket = aws_s3_bucket.pulse_mobile_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "pulse_mobile_public_access" {
  bucket = aws_s3_bucket.pulse_mobile_bucket.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 bucket ownership controls
resource "aws_s3_bucket_ownership_controls" "pulse_mobile_ownership" {
  bucket = aws_s3_bucket.pulse_mobile_bucket.id

  rule {
    object_ownership = "BucketOwnerPreferred"
  }
}

# S3 bucket policy for public read access
resource "aws_s3_bucket_policy" "pulse_mobile_policy" {
  bucket = aws_s3_bucket.pulse_mobile_bucket.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.pulse_mobile_bucket.arn}/*"
      },
    ]
  })
}

# S3 bucket website configuration
resource "aws_s3_bucket_website_configuration" "pulse_mobile_website" {
  bucket = aws_s3_bucket.pulse_mobile_bucket.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "index.html"
  }
}





# Outputs
output "s3_bucket_name" {
  description = "The name of the S3 bucket"
  value       = aws_s3_bucket.pulse_mobile_bucket.bucket
}

output "s3_bucket_website_endpoint" {
  description = "The website endpoint of the S3 bucket"
  value       = aws_s3_bucket_website_configuration.pulse_mobile_website.website_endpoint
}

output "website_url" {
  description = "The public URL for accessing the website"
  value       = "http://${aws_s3_bucket_website_configuration.pulse_mobile_website.website_endpoint}"
} 