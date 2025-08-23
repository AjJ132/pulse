output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = aws_apigatewayv2_stage.api_stage.invoke_url
}

output "sns_platform_application_arn" {
  description = "ARN of the SNS Platform Application"
  value       = length(aws_sns_platform_application.pulse_ios) > 0 ? aws_sns_platform_application.pulse_ios[0].arn : "Not created - APNS certificate required"
}

output "sns_topic_arn" {
  description = "ARN of the SNS Topic"
  value       = aws_sns_topic.pulse_notifications.arn
}

output "lambda_function_name_send_notification" {
  description = "Name of the send notification Lambda function"
  value       = aws_lambda_function.send_notification.function_name
}

output "lambda_function_name_register_device" {
  description = "Name of the register device Lambda function"
  value       = aws_lambda_function.register_device.function_name
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for device tokens"
  value       = aws_dynamodb_table.device_tokens.name
}
