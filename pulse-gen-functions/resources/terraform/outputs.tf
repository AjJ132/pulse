output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.pulse_news_lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.pulse_news_lambda.arn
}

output "api_gateway_url" {
  description = "URL of the HTTP API Gateway"
  value       = "${aws_apigatewayv2_stage.pulse_news_stage.invoke_url}"
}

output "api_gateway_id" {
  description = "ID of the HTTP API Gateway"
  value       = aws_apigatewayv2_api.pulse_news_api.id
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "sns_topic_arn" {
  description = "ARN of the SNS topic for notifications"
  value       = aws_sns_topic.pulse_notifications.arn
}

output "sns_platform_application_arn" {
  description = "ARN of the SNS platform application for iOS"
  value       = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : ""
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for device tokens"
  value       = aws_dynamodb_table.device_tokens.name
}

output "dynamodb_table_arn" {
  description = "ARN of the DynamoDB table for device tokens"
  value       = aws_dynamodb_table.device_tokens.arn
}

# output "custom_domain_url" {
#   description = "Custom domain URL for the API"
#   value       = "https://pulse.aj-johnson.com/pulse/api"
# }

# output "api_gateway_domain_name" {
#   description = "API Gateway custom domain name"
#   value       = aws_api_gateway_domain_name.pulse_news_domain.domain_name
# }
