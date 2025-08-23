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
  name = "pulse-news-lambda-role"

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

# Lambda function
resource "aws_lambda_function" "pulse_news_lambda" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "pulse-news-api"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"
  timeout         = 30
  memory_size     = 256

  environment {
    variables = {
      NODE_ENV = "production"
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

# API Gateway REST API
resource "aws_api_gateway_rest_api" "pulse_news_api" {
  name        = "pulse-news-api"
  description = "Pulse News API Gateway"
}

# API Gateway resource
resource "aws_api_gateway_resource" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.pulse_news_api.id
  parent_id   = aws_api_gateway_rest_api.pulse_news_api.root_resource_id
  path_part   = "{proxy+}"
}

# API Gateway method for proxy resource
resource "aws_api_gateway_method" "proxy" {
  rest_api_id   = aws_api_gateway_rest_api.pulse_news_api.id
  resource_id   = aws_api_gateway_resource.proxy.id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway integration for proxy resource
resource "aws_api_gateway_integration" "proxy" {
  rest_api_id = aws_api_gateway_rest_api.pulse_news_api.id
  resource_id = aws_api_gateway_resource.proxy.id
  http_method = aws_api_gateway_method.proxy.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.pulse_news_lambda.invoke_arn
}

# API Gateway method for root resource
resource "aws_api_gateway_method" "proxy_root" {
  rest_api_id   = aws_api_gateway_rest_api.pulse_news_api.id
  resource_id   = aws_api_gateway_rest_api.pulse_news_api.root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway integration for root resource
resource "aws_api_gateway_integration" "proxy_root" {
  rest_api_id = aws_api_gateway_rest_api.pulse_news_api.id
  resource_id = aws_api_gateway_rest_api.pulse_news_api.root_resource_id
  http_method = aws_api_gateway_method.proxy_root.http_method

  integration_http_method = "POST"
  type                   = "AWS_PROXY"
  uri                    = aws_lambda_function.pulse_news_lambda.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowExecutionFromAPIGateway"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.pulse_news_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.pulse_news_api.execution_arn}/*/*"
}

# API Gateway deployment
resource "aws_api_gateway_deployment" "pulse_news_deployment" {
  depends_on = [
    aws_api_gateway_integration.proxy,
    aws_api_gateway_integration.proxy_root,
  ]

  rest_api_id = aws_api_gateway_rest_api.pulse_news_api.id
  # Remove stage_name from deployment to avoid conflict
}

# API Gateway stage
resource "aws_api_gateway_stage" "pulse_news_stage" {
  deployment_id = aws_api_gateway_deployment.pulse_news_deployment.id
  rest_api_id   = aws_api_gateway_rest_api.pulse_news_api.id
  stage_name    = "prod"
}

# API Gateway custom domain name
resource "aws_api_gateway_domain_name" "pulse_news_domain" {
  domain_name              = "pulse.aj-johnson.com"
  regional_certificate_arn = var.certificate_arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# API Gateway base path mapping for /pulse/api
resource "aws_api_gateway_base_path_mapping" "pulse_news_mapping" {
  api_id      = aws_api_gateway_rest_api.pulse_news_api.id
  stage_name  = aws_api_gateway_stage.pulse_news_stage.stage_name
  domain_name = aws_api_gateway_domain_name.pulse_news_domain.domain_name
  base_path   = "pulse/api"
}

# Route 53 record for the API Gateway custom domain
resource "aws_route53_record" "pulse_news_api" {
  zone_id = var.route53_zone_id
  name    = "pulse.aj-johnson.com"
  type    = "A"

  alias {
    name                   = aws_api_gateway_domain_name.pulse_news_domain.regional_domain_name
    zone_id                = aws_api_gateway_domain_name.pulse_news_domain.regional_zone_id
    evaluate_target_health = false
  }
}
