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

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

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

# Lambda function for sending notifications
resource "aws_lambda_function" "send_notification" {
  filename         = "send_notification.zip"
  function_name    = "pulse-send-notification"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      SNS_PLATFORM_APPLICATION_ARN = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : ""
      SNS_TOPIC_ARN               = aws_sns_topic.pulse_notifications.arn
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.lambda_logs,
  ]
}

# Archive the Lambda function code
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "send_notification.zip"
  source {
    content = templatefile("${path.module}/lambda/send_notification.py", {
      sns_platform_application_arn = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : ""
    })
    filename = "index.py"
  }
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/pulse-send-notification"
  retention_in_days = 14
}

# API Gateway for HTTP API
resource "aws_apigatewayv2_api" "pulse_api" {
  name          = "pulse-notifications-api"
  protocol_type = "HTTP"
  
  cors_configuration {
    allow_credentials = false
    allow_headers     = ["content-type", "x-amz-date", "authorization", "x-api-key"]
    allow_methods     = ["*"]
    allow_origins     = ["*"]
    expose_headers    = ["date", "keep-alive"]
    max_age          = 86400
  }
}

# API Gateway Integration
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id             = aws_apigatewayv2_api.pulse_api.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.send_notification.invoke_arn
}

# API Gateway Route
resource "aws_apigatewayv2_route" "send_notification_route" {
  api_id    = aws_apigatewayv2_api.pulse_api.id
  route_key = "POST /send-notification"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# API Gateway Stage
resource "aws_apigatewayv2_stage" "api_stage" {
  api_id      = aws_apigatewayv2_api.pulse_api.id
  name        = "prod"
  auto_deploy = true

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      extendedRequestId = "$context.extendedRequestId"
      ip             = "$context.identity.sourceIp"
      caller         = "$context.identity.caller"
      user           = "$context.identity.user"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      resourcePath   = "$context.resourcePath"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_gateway_logs" {
  name              = "/aws/apigateway/pulse-notifications-api"
  retention_in_days = 14
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.send_notification.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.pulse_api.execution_arn}/*/*"
}

# Lambda function for device registration
resource "aws_lambda_function" "register_device" {
  filename         = "register_device.zip"
  function_name    = "pulse-register-device"
  role            = aws_iam_role.lambda_execution.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.register_device_zip.output_base64sha256
  runtime         = "python3.11"
  timeout         = 30

  environment {
    variables = {
      SNS_PLATFORM_APPLICATION_ARN = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : ""
      DYNAMODB_TABLE_NAME         = aws_dynamodb_table.device_tokens.name
    }
  }

  depends_on = [
    aws_iam_role_policy_attachment.lambda_logs,
    aws_cloudwatch_log_group.register_device_logs,
  ]
}

# Archive the register device Lambda function code
data "archive_file" "register_device_zip" {
  type        = "zip"
  output_path = "register_device.zip"
  source {
    content  = file("${path.module}/lambda/register_device.py")
    filename = "index.py"
  }
}

# CloudWatch Log Group for register device Lambda
resource "aws_cloudwatch_log_group" "register_device_logs" {
  name              = "/aws/lambda/pulse-register-device"
  retention_in_days = 14
}

# API Gateway Integration for device registration
resource "aws_apigatewayv2_integration" "register_device_integration" {
  api_id             = aws_apigatewayv2_api.pulse_api.id
  integration_type   = "AWS_PROXY"
  integration_method = "POST"
  integration_uri    = aws_lambda_function.register_device.invoke_arn
}

# API Gateway Route for device registration
resource "aws_apigatewayv2_route" "register_device_route" {
  api_id    = aws_apigatewayv2_api.pulse_api.id
  route_key = "POST /register-device"
  target    = "integrations/${aws_apigatewayv2_integration.register_device_integration.id}"
}

# Lambda permission for device registration API Gateway
resource "aws_lambda_permission" "register_device_api_gateway_invoke" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.register_device.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.pulse_api.execution_arn}/*/*"
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
