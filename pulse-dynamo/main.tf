terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket         = "pulse-terraform-state-717279706981"
    key            = "pulse-dynamo/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "pulse-terraform-locks-dev"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# Main DynamoDB table for pulse application data
resource "aws_dynamodb_table" "pulse_data" {
  name           = var.dynamodb_table_name
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "pk"
  range_key      = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  attribute {
    name = "entity_type"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  # GSI for querying by entity type
  global_secondary_index {
    name            = "entity-type-index"
    hash_key        = "entity_type"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # GSI for querying by user
  global_secondary_index {
    name            = "user-id-index"
    hash_key        = "user_id"
    range_key       = "created_at"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = var.dynamodb_table_name
    Project     = var.project_name
    Environment = var.environment
    Component   = "database"
  }
}

# Optional: DynamoDB table for user sessions if needed
resource "aws_dynamodb_table" "pulse_sessions" {
  count          = var.create_sessions_table ? 1 : 0
  name           = "${var.project_name}-sessions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "session_id"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "expires_at"
    type = "N"
  }

  # GSI for querying sessions by user
  global_secondary_index {
    name            = "user-sessions-index"
    hash_key        = "user_id"
    range_key       = "expires_at"
    projection_type = "ALL"
  }

  # TTL for automatic session cleanup
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-sessions"
    Project     = var.project_name
    Environment = var.environment
    Component   = "database"
  }
}

# Optional: DynamoDB table for application cache if needed
resource "aws_dynamodb_table" "pulse_cache" {
  count          = var.create_cache_table ? 1 : 0
  name           = "${var.project_name}-cache"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "cache_key"

  attribute {
    name = "cache_key"
    type = "S"
  }

  attribute {
    name = "expires_at"
    type = "N"
  }

  # TTL for automatic cache cleanup
  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-cache"
    Project     = var.project_name
    Environment = var.environment
    Component   = "database"
  }
}

# DynamoDB table for news articles
resource "aws_dynamodb_table" "pulse_news_articles" {
  name           = "${var.project_name}-news-articles"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "article_id"
  range_key      = "published_date"

  attribute {
    name = "article_id"
    type = "S"
  }

  attribute {
    name = "published_date"
    type = "S"
  }

  attribute {
    name = "source"
    type = "S"
  }

  attribute {
    name = "category"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "S"
  }

  # GSI for querying by source and date
  global_secondary_index {
    name            = "source-date-index"
    hash_key        = "source"
    range_key       = "published_date"
    projection_type = "ALL"
  }

  # GSI for querying by category and date
  global_secondary_index {
    name            = "category-date-index"
    hash_key        = "category"
    range_key       = "published_date"
    projection_type = "ALL"
  }

  # GSI for querying by creation time
  global_secondary_index {
    name            = "created-at-index"
    hash_key        = "created_at"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-news-articles"
    Project     = var.project_name
    Environment = var.environment
    Component   = "database"
    Purpose     = "news-articles"
  }
}

# DynamoDB table for news sentiment analysis
resource "aws_dynamodb_table" "pulse_news_sentiment" {
  name           = "${var.project_name}-news-sentiment"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "article_id"
  range_key      = "analysis_timestamp"

  attribute {
    name = "article_id"
    type = "S"
  }

  attribute {
    name = "analysis_timestamp"
    type = "S"
  }

  attribute {
    name = "sentiment_score"
    type = "N"
  }

  attribute {
    name = "confidence_score"
    type = "N"
  }

  attribute {
    name = "sentiment_label"
    type = "S"
  }

  # GSI for querying by sentiment score
  global_secondary_index {
    name            = "sentiment-score-index"
    hash_key        = "sentiment_score"
    range_key       = "analysis_timestamp"
    projection_type = "ALL"
  }

  # GSI for querying by sentiment label and timestamp
  global_secondary_index {
    name            = "sentiment-label-index"
    hash_key        = "sentiment_label"
    range_key       = "analysis_timestamp"
    projection_type = "ALL"
  }

  # GSI for querying by confidence score
  global_secondary_index {
    name            = "confidence-index"
    hash_key        = "confidence_score"
    range_key       = "analysis_timestamp"
    projection_type = "ALL"
  }

  # Point-in-time recovery
  point_in_time_recovery {
    enabled = var.enable_point_in_time_recovery
  }

  # Server-side encryption
  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "${var.project_name}-news-sentiment"
    Project     = var.project_name
    Environment = var.environment
    Component   = "database"
    Purpose     = "sentiment-analysis"
  }
}
