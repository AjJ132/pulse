terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  required_version = ">= 1.0"
}

provider "aws" {
  region = var.aws_region
}

# DynamoDB table for managing web push subscriptions
resource "aws_dynamodb_table" "subscriptions" {
  name           = "${var.project_name}-subscriptions"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "user_id"
  range_key      = "subscription_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "subscription_id"
    type = "S"
  }

  tags = {
    Name        = "${var.project_name}-subscriptions"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SSM Parameter for VAPID private key (secure)
resource "aws_ssm_parameter" "vapid_private_key" {
  name  = "/${var.project_name}/notifications/vapid/private-key"
  type  = "SecureString"
  value = var.vapid_private_key

  tags = {
    Name        = "${var.project_name}-vapid-private-key"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SSM Parameter for VAPID public key
resource "aws_ssm_parameter" "vapid_public_key" {
  name  = "/${var.project_name}/notifications/vapid/public-key"
  type  = "String"
  value = var.vapid_public_key

  tags = {
    Name        = "${var.project_name}-vapid-public-key"
    Environment = var.environment
    Project     = var.project_name
  }
}

# SSM Parameter for VAPID contact
resource "aws_ssm_parameter" "vapid_contact" {
  name  = "/${var.project_name}/notifications/vapid/contact"
  type  = "String"
  value = var.vapid_contact

  tags = {
    Name        = "${var.project_name}-vapid-contact"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Lambda layer for web-push package
resource "aws_lambda_layer_version" "web_push_layer" {
  filename            = "lambda_layers/web-push-layer.zip"
  layer_name          = "${var.project_name}-web-push-layer"
  compatible_runtimes = ["nodejs18.x", "nodejs20.x"]
  description         = "Web Push library for sending push notifications"

  depends_on = [data.archive_file.web_push_layer_zip]
}

# Archive the web-push layer
data "archive_file" "web_push_layer_zip" {
  type        = "zip"
  source_dir  = "lambda_layers/web-push-layer"
  output_path = "lambda_layers/web-push-layer.zip"
}

# IAM role for Lambda functions
resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-notifications-lambda-role"

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

  tags = {
    Name        = "${var.project_name}-notifications-lambda-role"
    Environment = var.environment
    Project     = var.project_name
  }
}

# IAM policy for Lambda functions
resource "aws_iam_role_policy" "lambda_policy" {
  name = "${var.project_name}-notifications-lambda-policy"
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
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]
        Resource = aws_dynamodb_table.subscriptions.arn
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          aws_ssm_parameter.vapid_private_key.arn,
          aws_ssm_parameter.vapid_public_key.arn,
          aws_ssm_parameter.vapid_contact.arn
        ]
      }
    ]
  })
}

# Lambda function for subscription management
resource "aws_lambda_function" "subscription_manager" {
  filename         = "lambda_functions/subscription_manager.zip"
  function_name    = "${var.project_name}-subscription-manager"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.subscriptions.name
      VAPID_PUBLIC_KEY_PARAM = aws_ssm_parameter.vapid_public_key.name
    }
  }

  tags = {
    Name        = "${var.project_name}-subscription-manager"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Lambda function for sending web push notifications
resource "aws_lambda_function" "web_push_sender" {
  filename         = "lambda_functions/web_push_sender.zip"
  function_name    = "${var.project_name}-web-push-sender"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 60
  layers          = [aws_lambda_layer_version.web_push_layer.arn]

  environment {
    variables = {
      DYNAMODB_TABLE = aws_dynamodb_table.subscriptions.name
      VAPID_PRIVATE_KEY_PARAM = aws_ssm_parameter.vapid_private_key.name
      VAPID_PUBLIC_KEY_PARAM = aws_ssm_parameter.vapid_public_key.name
      VAPID_CONTACT_PARAM = aws_ssm_parameter.vapid_contact.name
    }
  }

  tags = {
    Name        = "${var.project_name}-web-push-sender"
    Environment = var.environment
    Project     = var.project_name
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "notifications_api" {
  name = "${var.project_name}-notifications-api"

  tags = {
    Name        = "${var.project_name}-notifications-api"
    Environment = var.environment
    Project     = var.project_name
  }
}

# API Gateway Resource for subscriptions
resource "aws_api_gateway_resource" "subscriptions" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  parent_id   = aws_api_gateway_rest_api.notifications_api.root_resource_id
  path_part   = "subscriptions"
}

# API Gateway Resource for notifications
resource "aws_api_gateway_resource" "notifications" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  parent_id   = aws_api_gateway_rest_api.notifications_api.root_resource_id
  path_part   = "notifications"
}

# API Gateway Resource for VAPID public key
resource "aws_api_gateway_resource" "vapid" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  parent_id   = aws_api_gateway_rest_api.notifications_api.root_resource_id
  path_part   = "vapid"
}

# API Gateway Method for POST /subscriptions
resource "aws_api_gateway_method" "subscriptions_post" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.subscriptions.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Method for DELETE /subscriptions
resource "aws_api_gateway_method" "subscriptions_delete" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.subscriptions.id
  http_method   = "DELETE"
  authorization = "NONE"
}

# API Gateway Method for OPTIONS /subscriptions (CORS)
resource "aws_api_gateway_method" "subscriptions_options" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.subscriptions.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Method for POST /notifications
resource "aws_api_gateway_method" "notifications_post" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.notifications.id
  http_method   = "POST"
  authorization = "NONE"
}

# API Gateway Method for OPTIONS /notifications (CORS)
resource "aws_api_gateway_method" "notifications_options" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.notifications.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# API Gateway Method for GET /vapid
resource "aws_api_gateway_method" "vapid_get" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.vapid.id
  http_method   = "GET"
  authorization = "NONE"
}

# API Gateway Method for OPTIONS /vapid (CORS)
resource "aws_api_gateway_method" "vapid_options" {
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  resource_id   = aws_api_gateway_resource.vapid.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

# Lambda integration for subscription manager POST
resource "aws_api_gateway_integration" "subscriptions_post_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.subscriptions.id
  http_method = aws_api_gateway_method.subscriptions_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.subscription_manager.invoke_arn
}

# Lambda integration for subscription manager DELETE
resource "aws_api_gateway_integration" "subscriptions_delete_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.subscriptions.id
  http_method = aws_api_gateway_method.subscriptions_delete.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.subscription_manager.invoke_arn
}

# Lambda integration for subscription manager OPTIONS (CORS)
resource "aws_api_gateway_integration" "subscriptions_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.subscriptions.id
  http_method = aws_api_gateway_method.subscriptions_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Lambda integration for web push sender
resource "aws_api_gateway_integration" "notifications_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.notifications.id
  http_method = aws_api_gateway_method.notifications_post.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.web_push_sender.invoke_arn
}

# Lambda integration for notifications OPTIONS (CORS)
resource "aws_api_gateway_integration" "notifications_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.notifications.id
  http_method = aws_api_gateway_method.notifications_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# Lambda integration for VAPID GET
resource "aws_api_gateway_integration" "vapid_get_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.vapid.id
  http_method = aws_api_gateway_method.vapid_get.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.subscription_manager.invoke_arn
}

# Lambda integration for VAPID OPTIONS (CORS)
resource "aws_api_gateway_integration" "vapid_options_integration" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.vapid.id
  http_method = aws_api_gateway_method.vapid_options.http_method

  type = "MOCK"
  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

# CORS response for subscriptions OPTIONS
resource "aws_api_gateway_method_response" "subscriptions_options_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.subscriptions.id
  http_method = aws_api_gateway_method.subscriptions_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS integration response for subscriptions OPTIONS
resource "aws_api_gateway_integration_response" "subscriptions_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.subscriptions.id
  http_method = aws_api_gateway_method.subscriptions_options.http_method
  status_code = aws_api_gateway_method_response.subscriptions_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS response for notifications OPTIONS
resource "aws_api_gateway_method_response" "notifications_options_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.notifications.id
  http_method = aws_api_gateway_method.notifications_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS integration response for notifications OPTIONS
resource "aws_api_gateway_integration_response" "notifications_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.notifications.id
  http_method = aws_api_gateway_method.notifications_options.http_method
  status_code = aws_api_gateway_method_response.notifications_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# CORS response for vapid OPTIONS
resource "aws_api_gateway_method_response" "vapid_options_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.vapid.id
  http_method = aws_api_gateway_method.vapid_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

# CORS integration response for vapid OPTIONS
resource "aws_api_gateway_integration_response" "vapid_options_integration_response" {
  rest_api_id = aws_api_gateway_rest_api.notifications_api.id
  resource_id = aws_api_gateway_resource.vapid.id
  http_method = aws_api_gateway_method.vapid_options.http_method
  status_code = aws_api_gateway_method_response.vapid_options_response.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"
    "method.response.header.Access-Control-Allow-Methods" = "'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# Lambda permission for subscription manager
resource "aws_lambda_permission" "subscription_manager_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscription_manager.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.notifications_api.execution_arn}/*/*"
}

# Lambda permission for web push sender
resource "aws_lambda_permission" "web_push_sender_permission" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.web_push_sender.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.notifications_api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "notifications_deployment" {
  depends_on = [
    aws_api_gateway_integration.subscriptions_post_integration,
    aws_api_gateway_integration.subscriptions_delete_integration,
    aws_api_gateway_integration.subscriptions_options_integration,
    aws_api_gateway_integration.notifications_integration,
    aws_api_gateway_integration.notifications_options_integration,
    aws_api_gateway_integration.vapid_get_integration,
    aws_api_gateway_integration.vapid_options_integration,
    aws_api_gateway_integration_response.subscriptions_options_integration_response,
    aws_api_gateway_integration_response.notifications_options_integration_response,
    aws_api_gateway_integration_response.vapid_options_integration_response,
  ]

  rest_api_id = aws_api_gateway_rest_api.notifications_api.id

  lifecycle {
    create_before_destroy = true
  }

  triggers = {
    # Use timestamp to force redeployment when needed
    redeployment = timestamp()
  }
}

# API Gateway stage
resource "aws_api_gateway_stage" "notifications_stage" {
  deployment_id = aws_api_gateway_deployment.notifications_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.notifications_api.id
  stage_name    = var.environment

  tags = {
    Name        = "${var.project_name}-notifications-stage"
    Environment = var.environment
    Project     = var.project_name
  }
}