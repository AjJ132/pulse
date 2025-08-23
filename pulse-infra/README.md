# Pulse Push Notifications Infrastructure

This Terraform configuration sets up the AWS infrastructure needed for sending push notifications to iOS devices.

## Architecture

- **API Gateway**: REST API endpoints for registering devices and sending notifications
- **Lambda Functions**: 
  - `pulse-send-notification`: Sends push notifications to registered devices
  - `pulse-register-device`: Registers device tokens with SNS
- **SNS**: Platform application for iOS APNS integration
- **DynamoDB**: Stores device tokens and user associations
- **CloudWatch**: Logging for all components

## API Endpoints

After deployment, you'll have these endpoints:

- `POST /register-device`: Register a device token
- `POST /send-notification`: Send a push notification

## Prerequisites

1. AWS CLI configured with appropriate permissions
2. Terraform installed
3. Apple Developer Account with push notification certificate

## Deployment

1. Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Fill in your values in `terraform.tfvars` (see Apple Setup section below)

3. Initialize and deploy:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

## Apple Setup Required

You need to complete these steps in the Apple Developer Console before deployment:

1. **Create App ID** (if not exists)
2. **Generate Push Notification Certificate**
3. **Convert certificate to P12 format**
4. **Update terraform.tfvars with certificate data**

See the "Next Steps" section in the main README for detailed instructions.

## Testing

After deployment, you can test the notification system:

1. Get the API Gateway URL from Terraform output
2. Register a device (you'll need the iOS app for this)
3. Send a test notification using the API

## Environment Variables

The Lambda functions use these environment variables (set automatically by Terraform):

- `SNS_PLATFORM_APPLICATION_ARN`: ARN of the SNS platform application
- `SNS_TOPIC_ARN`: ARN of the SNS topic
- `DYNAMODB_TABLE_NAME`: Name of the device tokens table
