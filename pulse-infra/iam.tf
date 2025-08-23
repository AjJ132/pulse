# IAM Role for Lambda execution
resource "aws_iam_role" "lambda_execution" {
  name = "pulse-lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Sid    = ""
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

# IAM Role Policy for Lambda
resource "aws_iam_role_policy" "lambda_policy" {
  name = "pulse-lambda-policy"
  role = aws_iam_role.lambda_execution.id

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

# Attach the basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_logs" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# IAM Role for SNS feedback
resource "aws_iam_role" "sns_feedback" {
  name = "pulse-sns-feedback-role"

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
  name = "pulse-sns-feedback-policy"
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
