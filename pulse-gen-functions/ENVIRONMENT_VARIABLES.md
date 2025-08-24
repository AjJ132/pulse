# Environment Variables

This document lists all the environment variables required for the Pulse notification system.

## AWS Configuration

### `AWS_REGION`
- **Description**: AWS region where the services are deployed
- **Default**: `us-east-1`
- **Required**: Yes
- **Used by**: SNS Service, Notification Service

### `AWS_ACCOUNT_ID`
- **Description**: AWS account ID for constructing dummy ARNs
- **Default**: `123456789012`
- **Required**: No (used for fallback scenarios)
- **Used by**: SNS Service

## SNS Configuration

### `SNS_PLATFORM_APPLICATION_ARN`
- **Description**: ARN of the SNS Platform Application for push notifications
- **Default**: None (empty string)
- **Required**: Yes (for actual push notifications to work)
- **Used by**: SNS Service
- **Note**: This should be the ARN of your iOS/Android platform application in SNS

## DynamoDB Configuration

### `DYNAMODB_TABLE_NAME`
- **Description**: Name of the DynamoDB table that stores device tokens
- **Default**: None (empty string)
- **Required**: Yes
- **Used by**: Notification Service
- **Note**: The table should have a primary key of `device_id` and a GSI on `user_id`

## Local Development

### `PORT`
- **Description**: Port for the local development server
- **Default**: `3000`
- **Required**: No
- **Used by**: Local wrapper server

## Example Configuration

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012

# SNS Configuration
SNS_PLATFORM_APPLICATION_ARN=arn:aws:sns:us-east-1:123456789012:app/APNS/MyApp

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=pulse-device-tokens

# Local Development
PORT=3000
```

## Setup Instructions

1. **SNS Platform Application**: Create an SNS Platform Application for your iOS/Android app and note the ARN
2. **DynamoDB Table**: Create a DynamoDB table with the required schema:
   - Primary Key: `device_id` (String)
   - GSI: `user-id-index` with `user_id` as the partition key
3. **Environment Variables**: Set all required environment variables in your deployment environment
4. **IAM Permissions**: Ensure your Lambda function has the necessary permissions for SNS and DynamoDB operations
