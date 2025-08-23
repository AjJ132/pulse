# Pulse Generation Functions

This Lambda function provides various endpoints for the Pulse application, including news generation, schedule management, push notifications, and device registration.

## Features

### News Handler (`/news`)
- Generates random news articles for the Pulse application
- Returns 3-6 articles with various categories and content

### Schedule Handler (`/schedule`)
- Manages schedule-related functionality
- Provides schedule data for the Pulse application

### Notification Handler (`/notifications`)
- **Unified handler for all notification and device operations**
- **Sub-routes:**
  - `/notifications/send` - Send push notifications to devices
  - `/notifications/register-device` - Register devices for push notifications
  - `/notifications/list-devices` - List devices (by user or all)
  - `/notifications/delete-device` - Delete a device registration
- **Legacy route support:**
  - `/devices` or `/register-device` → `/notifications/register-device`
  - `/send-notification` → `/notifications/send`
- **Features:**
  - Multiple targeting options (user_id, device_id, direct token)
  - Device management (register, list, delete)
  - SNS platform endpoint creation
  - DynamoDB storage for device tokens

## API Endpoints

### POST /notifications/send
Send push notifications to devices.

**Request Body:**
```json
{
  "title": "Notification Title",
  "message": "Notification message content",
  "user_id": "user123",           // Optional: send to all user's devices
  "device_id": "device456",       // Optional: send to specific device
  "device_token": "apns_token"    // Optional: direct token for testing
}
```

**Response:**
```json
{
  "message": "Notifications sent",
  "total_devices": 2,
  "successful": 2,
  "failed": 0,
  "results": [
    {
      "success": true,
      "device_id": "device123",
      "endpoint_arn": "arn:aws:sns:...",
      "message_id": "msg-id-123"
    }
  ]
}
```

### POST /notifications/register-device
Register a device for push notifications.

**Request Body:**
```json
{
  "device_token": "apns_device_token",
  "user_id": "user123",
  "device_id": "device456",       // Optional: auto-generated if not provided
  "bundle_id": "com.example.app",
  "platform": "ios"
}
```

**Response:**
```json
{
  "message": "Device registered successfully",
  "device_id": "device456",
  "endpoint_arn": "arn:aws:sns:..."
}
```

### GET /notifications/list-devices
List devices (by user or all devices).

**Query Parameters:**
- `user_id` (optional): List devices for specific user

**Response:**
```json
{
  "message": "Devices retrieved successfully",
  "total_devices": 2,
  "devices": [
    {
      "device_id": "device123",
      "user_id": "user123",
      "platform": "ios",
      "bundle_id": "com.example.app",
      "created_at": "2025-08-23T17:27:19.968Z",
      "active": true
    }
  ]
}
```

### DELETE /notifications/delete-device
Delete a device registration.

**Query Parameters:**
- `device_id`: ID of the device to delete

**Response:**
```json
{
  "message": "Device deleted successfully",
  "device_id": "device123"
}
```

### Legacy Routes (Still Supported)
- `POST /devices` → `POST /notifications/register-device`
- `POST /send-notification` → `POST /notifications/send`

## Infrastructure

The function uses the following AWS services:

- **SNS (Simple Notification Service)**: For sending push notifications
- **DynamoDB**: For storing device tokens and user associations
- **API Gateway**: For HTTP API endpoints
- **Lambda**: For serverless function execution

### Required Environment Variables

- `SNS_PLATFORM_APPLICATION_ARN`: ARN of the SNS platform application for iOS
- `SNS_TOPIC_ARN`: ARN of the SNS topic for notifications
- `DYNAMODB_TABLE_NAME`: Name of the DynamoDB table for device tokens

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Deploy to AWS:
   ```bash
   npm run apply
   ```

## APNS Certificate Setup

To enable iOS push notifications, you need to provide an APNS certificate:

1. Export your APNS certificate as a .p12 file
2. Base64 encode the certificate:
   ```bash
   base64 -i your_certificate.p12
   ```
3. Set the Terraform variables:
   - `apns_certificate_p12_base64`: The base64 encoded certificate
   - `apns_certificate_password`: The password for the certificate

## Testing

You can test the endpoints using curl or any HTTP client:

```bash
# Register a device
curl -X POST https://your-api-gateway-url/notifications/register-device \
  -H "Content-Type: application/json" \
  -d '{
    "device_token": "your_apns_token",
    "user_id": "test_user",
    "platform": "ios"
  }'

# Send a notification
curl -X POST https://your-api-gateway-url/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "message": "This is a test notification",
    "user_id": "test_user"
  }'

# List devices for a user
curl "https://your-api-gateway-url/notifications/list-devices?user_id=test_user"

# Delete a device
curl -X DELETE "https://your-api-gateway-url/notifications/delete-device?device_id=device123"

# Legacy routes (still supported)
curl -X POST https://your-api-gateway-url/devices \
  -H "Content-Type: application/json" \
  -d '{"device_token": "legacy_test", "user_id": "test_user"}'
```

## Local Development

Run the local development server:

```bash
npm run dev
```

This will start a local server that mimics the Lambda environment for testing.
