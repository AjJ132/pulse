output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.pulse_news_lambda.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.pulse_news_lambda.arn
}

output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = "${aws_api_gateway_stage.pulse_news_stage.invoke_url}"
}

output "api_gateway_id" {
  description = "ID of the API Gateway"
  value       = aws_api_gateway_rest_api.pulse_news_api.id
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "custom_domain_url" {
  description = "Custom domain URL for the API"
  value       = "https://pulse.aj-johnson.com/pulse/api"
}

output "api_gateway_domain_name" {
  description = "API Gateway custom domain name"
  value       = aws_api_gateway_domain_name.pulse_news_domain.domain_name
}
