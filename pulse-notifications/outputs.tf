# Output values for the Pulse Notifications infrastructure

output "api_gateway_url" {
  description = "URL of the API Gateway for notifications"
  value       = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for subscriptions"
  value       = aws_dynamodb_table.subscriptions.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for subscriptions"
  value       = aws_dynamodb_table.subscriptions.arn
}

output "subscription_manager_function_name" {
  description = "Name of the subscription manager Lambda function"
  value       = aws_lambda_function.subscription_manager.function_name
}

output "subscription_manager_function_arn" {
  description = "ARN of the subscription manager Lambda function"
  value       = aws_lambda_function.subscription_manager.arn
}

output "web_push_sender_function_name" {
  description = "Name of the web push sender Lambda function"
  value       = aws_lambda_function.web_push_sender.function_name
}

output "web_push_sender_function_arn" {
  description = "ARN of the web push sender Lambda function"
  value       = aws_lambda_function.web_push_sender.arn
}

output "vapid_public_key_parameter" {
  description = "SSM Parameter name for VAPID public key"
  value       = aws_ssm_parameter.vapid_public_key.name
}

output "vapid_private_key_parameter" {
  description = "SSM Parameter name for VAPID private key"
  value       = aws_ssm_parameter.vapid_private_key.name
  sensitive   = true
}

output "web_push_layer_arn" {
  description = "ARN of the web-push Lambda layer"
  value       = aws_lambda_layer_version.web_push_layer.arn
}

# API endpoint information
output "subscription_endpoint" {
  description = "Endpoint for managing subscriptions"
  value       = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}/subscriptions"
}

output "notification_endpoint" {
  description = "Endpoint for sending notifications"
  value       = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}/notifications"
}

output "vapid_endpoint" {
  description = "Endpoint for getting VAPID public key"
  value       = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}/vapid"
}

# Summary information
output "deployment_summary" {
  description = "Summary of the deployment"
  value = {
    region                = var.aws_region
    environment          = var.environment
    project_name         = var.project_name
    api_gateway_url      = "https://${aws_api_gateway_rest_api.notifications_api.id}.execute-api.${var.aws_region}.amazonaws.com/${var.environment}"
    dynamodb_table       = aws_dynamodb_table.subscriptions.name
    lambda_functions     = [
      aws_lambda_function.subscription_manager.function_name,
      aws_lambda_function.web_push_sender.function_name
    ]
    api_endpoints = {
      subscriptions = "POST/DELETE /subscriptions"
      notifications = "POST /notifications"  
      vapid        = "GET /vapid"
    }
  }
}