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
    key            = "pulse-news/lambda-api/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "pulse-terraform-locks-dev"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# IAM role for Lambda execution
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_sub_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for Lambda execution
resource "aws_iam_role_policy_attachment" "lambda_policy" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM Role Policy for Lambda with SNS and DynamoDB permissions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_sub_name}-lambda-policy"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:CreatePlatformEndpoint",
          "sns:DeleteEndpoint",
          "sns:GetEndpointAttributes",
          "sns:ListEndpointsByPlatformApplication",
          "sns:Publish",
          "sns:SetEndpointAttributes"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = [
          aws_dynamodb_table.device_tokens.arn,
          "${aws_dynamodb_table.device_tokens.arn}/index/*"
        ]
      }
    ]
  })
}

# IAM Role for SNS feedback
resource "aws_iam_role" "sns_feedback" {
  name = "${var.project_sub_name}-sns-feedback-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "sns.amazonaws.com"
        }
      },
    ]
  })
}

# IAM Policy for SNS feedback
resource "aws_iam_role_policy" "sns_feedback_policy" {
  name = "${var.project_sub_name}-sns-feedback-policy"
  role = aws_iam_role.sns_feedback.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:PutMetricFilter",
          "logs:PutRetentionPolicy"
        ]
        Resource = "*"
      }
    ]
  })
}

# SNS Platform Application for iOS (APNS)
# Note: This will be created only if certificate credentials are provided
resource "aws_sns_platform_application" "pulse_ios" {
  count                        = var.apns_certificate_p12_base64 != "" ? 1 : 0
  name                         = "pulse-ios-app"
  platform                     = "APNS"
  platform_credential         = var.apns_certificate_p12_base64
  platform_principal          = var.apns_certificate_password
  success_feedback_role_arn    = aws_iam_role.sns_feedback.arn
  failure_feedback_role_arn    = aws_iam_role.sns_feedback.arn
  success_feedback_sample_rate = "100"
}

# SNS Topic for notifications
resource "aws_sns_topic" "pulse_notifications" {
  name = "pulse-notifications"
}

# DynamoDB table for storing device tokens
resource "aws_dynamodb_table" "device_tokens" {
  name           = "pulse-device-tokens"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "device_id"

  attribute {
    name = "device_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-id-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  tags = {
    Name        = "pulse-device-tokens"
    Environment = "development"
  }
}

# Lambda function
resource "aws_lambda_function" "pulse_news_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${var.project_sub_name}-lambda"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      NODE_ENV = "production"
      SNS_PLATFORM_APPLICATION_ARN = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : ""
      SNS_TOPIC_ARN               = aws_sns_topic.pulse_notifications.arn
      DYNAMODB_TABLE_NAME         = aws_dynamodb_table.device_tokens.name
    }
  }

  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}

# Create ZIP file for Lambda deployment
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/lambda.zip"
  source_dir  = "${path.module}/build"
}

# HTTP API Gateway
resource "aws_apigatewayv2_api" "pulse_news_api" {
  name          = "${var.project_sub_name}-apigw"
  protocol_type = "HTTP"
  description   = "Pulse News HTTP API Gateway"
}

# HTTP API Gateway integration
resource "aws_apigatewayv2_integration" "pulse_news_integration" {
  api_id           = aws_apigatewayv2_api.pulse_news_api.id
  integration_type = "AWS_PROXY"
  integration_uri  = aws_lambda_function.pulse_news_lambda.invoke_arn
  integration_method = "POST"
}

# HTTP API Gateway route for all paths
resource "aws_apigatewayv2_route" "pulse_news_route" {
  api_id    = aws_apigatewayv2_api.pulse_news_api.id
  route_key = "$default"
  target    = "integrations/${aws_apigatewayv2_integration.pulse_news_integration.id}"
}

# HTTP API Gateway stage
resource "aws_apigatewayv2_stage" "pulse_news_stage" {
  api_id = aws_apigatewayv2_api.pulse_news_api.id
  name   = "$default"
  auto_deploy = true
}

# Lambda permission for HTTP API Gateway
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pulse_news_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.pulse_news_api.execution_arn}/*/*"
}
