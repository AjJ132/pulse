output "dynamodb_table_name" {
  description = "Name of the main DynamoDB table"
  value       = aws_dynamodb_table.pulse_data.name
}

output "dynamodb_table_arn" {
  description = "ARN of the main DynamoDB table"
  value       = aws_dynamodb_table.pulse_data.arn
}

output "dynamodb_table_id" {
  description = "ID of the main DynamoDB table"
  value       = aws_dynamodb_table.pulse_data.id
}

output "dynamodb_table_stream_arn" {
  description = "ARN of the DynamoDB table stream (if enabled)"
  value       = aws_dynamodb_table.pulse_data.stream_arn
}

output "sessions_table_name" {
  description = "Name of the sessions DynamoDB table (if created)"
  value       = var.create_sessions_table ? aws_dynamodb_table.pulse_sessions[0].name : null
}

output "sessions_table_arn" {
  description = "ARN of the sessions DynamoDB table (if created)"
  value       = var.create_sessions_table ? aws_dynamodb_table.pulse_sessions[0].arn : null
}

output "cache_table_name" {
  description = "Name of the cache DynamoDB table (if created)"
  value       = var.create_cache_table ? aws_dynamodb_table.pulse_cache[0].name : null
}

output "cache_table_arn" {
  description = "ARN of the cache DynamoDB table (if created)"
  value       = var.create_cache_table ? aws_dynamodb_table.pulse_cache[0].arn : null
}

# Output for easy integration with other Terraform modules
output "database_config" {
  description = "Database configuration for other modules"
  value = {
    main_table = {
      name = aws_dynamodb_table.pulse_data.name
      arn  = aws_dynamodb_table.pulse_data.arn
    }
    sessions_table = var.create_sessions_table ? {
      name = aws_dynamodb_table.pulse_sessions[0].name
      arn  = aws_dynamodb_table.pulse_sessions[0].arn
    } : null
    cache_table = var.create_cache_table ? {
      name = aws_dynamodb_table.pulse_cache[0].name
      arn  = aws_dynamodb_table.pulse_cache[0].arn
    } : null
  }
}

# IAM policy document for applications that need to access this database
output "iam_policy_document" {
  description = "IAM policy document for accessing the DynamoDB tables"
  value = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.pulse_data.arn,
          "${aws_dynamodb_table.pulse_data.arn}/index/*",
          var.create_sessions_table ? aws_dynamodb_table.pulse_sessions[0].arn : null,
          var.create_sessions_table ? "${aws_dynamodb_table.pulse_sessions[0].arn}/index/*" : null,
          var.create_cache_table ? aws_dynamodb_table.pulse_cache[0].arn : null,
          aws_dynamodb_table.pulse_news_articles.arn,
          "${aws_dynamodb_table.pulse_news_articles.arn}/index/*",
          aws_dynamodb_table.pulse_news_sentiment.arn,
          "${aws_dynamodb_table.pulse_news_sentiment.arn}/index/*"
        ]
      }
    ]
  })
}

# Outputs for news articles table
output "news_articles_table_name" {
  description = "Name of the news articles DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_articles.name
}

output "news_articles_table_arn" {
  description = "ARN of the news articles DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_articles.arn
}

output "news_articles_table_id" {
  description = "ID of the news articles DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_articles.id
}

# Outputs for news sentiment table
output "news_sentiment_table_name" {
  description = "Name of the news sentiment DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_sentiment.name
}

output "news_sentiment_table_arn" {
  description = "ARN of the news sentiment DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_sentiment.arn
}

output "news_sentiment_table_id" {
  description = "ID of the news sentiment DynamoDB table"
  value       = aws_dynamodb_table.pulse_news_sentiment.id
}
