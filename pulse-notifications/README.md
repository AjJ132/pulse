# Pulse Notifications Infrastructure

This directory contains the AWS infrastructure for managing **Web Push notifications** in the Pulse application using a custom implementation with the Web Push Protocol.

## 🚀 Quick Start

### 1. Generate VAPID Keys
First, generate VAPID keys for your Web Push setup:

```bash
cd /path/to/Pulse
node generate-vapid-keys.js
```

This will create:
- `vapid-keys.json` - Backend configuration
- `pulse-notifications/terraform.tfvars` - Infrastructure variables
- `pulse-mobile/vapid-config.json` - Frontend configuration

### 2. Build Lambda Functions
```bash
cd pulse-notifications
./build.sh
```

### 3. Deploy Infrastructure
```bash
terraform init
terraform plan
terraform apply
```

### 4. Get Your API Endpoint
After deployment, note the API Gateway URL from the Terraform output.

---

## 📱 How to Subscribe to Push Notifications

### Subscribe a Device

Use this endpoint to register a device for web push notifications:

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "subscription": {
      "endpoint": "https://fcm.googleapis.com/fcm/send/...",
      "keys": {
        "p256dh": "BGt...",
        "auth": "Ww..."
      }
    }
  }'
```

**Response:**
```json
{
  "message": "Successfully subscribed to web push notifications",
  "subscription_id": "abc123",
  "user_id": "user123",
  "status": "active",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Unsubscribe a Device

```bash
curl -X DELETE https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/subscriptions \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123"
  }'
```

**Response:**
```json
{
  "message": "Successfully unsubscribed from notifications",
  "deleted_subscriptions": 1,
  "user_id": "user123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Get VAPID Public Key

The frontend can dynamically fetch the VAPID public key:

```bash
curl -X GET https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/vapid
```

**Response:**
```json
{
  "publicKey": "BIhg9VY8DopI0PxzQ3xC0xiJnwR3TxuKt9dczY-UvfHebnZl_hUI7iH19521Cd3P7UiApNhB8KTXA9SBT1m3UAA",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 📢 How to Send Notifications

### Send a Basic Notification

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Hello from Pulse!",
    "message": "This is a test notification",
    "data": {
      "action": "open_app",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }'
```

**Response:**
```json
{
  "message": "Notifications sent successfully",
  "sent_count": 3,
  "failed_count": 0,
  "total_subscriptions": 3,
  "successful_deliveries": [
    {
      "user_id": "user123",
      "subscription_id": "abc123",
      "status": "sent",
      "statusCode": 200
    }
  ],
  "failed_deliveries": [],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Send to Specific User

```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/notifications \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Personal Message",
    "message": "Hello user123!",
    "user_id": "user123",
    "data": {
      "personal": true
    }
  }'
```

---

## 📊 Infrastructure Components

### 1. DynamoDB Table
- **Resource**: `aws_dynamodb_table.subscriptions`
- **Purpose**: Store web push subscription information
- **Name**: `pulse-subscriptions`
- **Schema**:
  - `user_id` (String) - Partition key
  - `subscription_id` (String) - Sort key (derived from endpoint)
  - `subscription` (Object) - Full Web Push subscription object
  - `status` (String) - active/inactive
  - `created_at` (String) - ISO timestamp
  - `updated_at` (String) - ISO timestamp
  - `last_notification_sent` (String) - ISO timestamp
  - `failure_count` (Number) - Count of failed deliveries

### 2. SSM Parameters
- **VAPID Private Key**: `/${project_name}/notifications/vapid/private-key` (SecureString)
- **VAPID Public Key**: `/${project_name}/notifications/vapid/public-key` (String)
- **VAPID Contact**: `/${project_name}/notifications/vapid/contact` (String)

### 3. Lambda Functions

#### Subscription Manager
- **Function**: `pulse-subscription-manager`
- **Purpose**: Handle subscribing/unsubscribing users and provide VAPID public key
- **Endpoints**:
  - `POST /subscriptions` - Subscribe a user
  - `DELETE /subscriptions` - Unsubscribe a user
  - `GET /vapid` - Get VAPID public key

#### Web Push Sender
- **Function**: `pulse-web-push-sender`
- **Purpose**: Send web push notifications using the web-push library
- **Endpoints**:
  - `POST /notifications` - Send notifications to all or specific users
- **Features**:
  - Uses Lambda layer with web-push npm package
  - Fetches VAPID keys from SSM
  - Handles subscription failures and updates failure counts
  - Detailed logging for debugging

### 4. Lambda Layer
- **Resource**: `aws_lambda_layer_version.web_push_layer`
- **Purpose**: Provides web-push npm package for sending notifications
- **Compatible Runtimes**: nodejs18.x, nodejs20.x

### 5. API Gateway
- **Resource**: `pulse-notifications-api`
- **Purpose**: REST API for managing subscriptions and sending notifications
- **Stage**: `dev` (configurable via variables)
- **CORS**: Enabled for all endpoints

---

## 🏗️ Architecture Differences from SNS Version

### What Changed:
❌ **Removed:**
- AWS SNS Topic
- SNS Platform Applications
- SNS-specific IAM permissions
- Complex platform ARN management

✅ **Added:**
- SSM Parameter Store for VAPID keys
- Lambda Layer with web-push npm package
- Direct Web Push Protocol implementation
- Simplified subscription storage
- Enhanced error handling and logging

### Benefits:
- ✅ **True Web Push Support**: Direct implementation without SNS limitations
- ✅ **Cost Reduction**: No SNS topic charges
- ✅ **Better Control**: Handle retries, failures, and subscription management
- ✅ **Simpler Architecture**: Fewer AWS services to manage
- ✅ **Enhanced Debugging**: Detailed logging throughout the process

---

## 🔧 Development & Debugging

### Build Lambda Functions
```bash
./build.sh
```

### View Logs
```bash
# Subscription Manager logs
aws logs tail /aws/lambda/pulse-subscription-manager --follow

# Web Push Sender logs  
aws logs tail /aws/lambda/pulse-web-push-sender --follow
```

### Test from Command Line
```bash
# Test subscription
curl -X POST $API_URL/subscriptions -H "Content-Type: application/json" -d @test-subscription.json

# Test notification
curl -X POST $API_URL/notifications -H "Content-Type: application/json" -d '{
  "title": "Test",
  "message": "Hello World!"
}'

# Get VAPID key
curl -X GET $API_URL/vapid
```

### Debug Frontend
The frontend includes comprehensive diagnostics:
```javascript
// In browser console
await pushNotificationService.logDiagnostics();
```

---

## 🔐 Security Notes

### VAPID Keys
- **Private Key**: Stored securely in SSM Parameter Store as SecureString
- **Public Key**: Accessible via API endpoint for frontend use
- **Rotation**: Generate new keys and update SSM parameters as needed

### Permissions
- Lambda functions have minimal required permissions
- DynamoDB access scoped to subscriptions table only
- SSM access limited to VAPID parameters

---

## Deployment

### Prerequisites
1. AWS CLI configured with appropriate credentials
2. Terraform installed
3. Node.js installed (for Lambda function packaging)

### Steps

1. **Generate VAPID Keys**:
   ```bash
   node ../generate-vapid-keys.js
   ```

2. **Build Lambda Functions**:
   ```bash
   ./build.sh
   ```

3. **Initialize Terraform**:
   ```bash
   terraform init
   ```

4. **Plan Deployment**:
   ```bash
   terraform plan
   ```

5. **Deploy Infrastructure**:
   ```bash
   terraform apply
   ```

6. **Test the Setup**:
   - Update frontend with new API endpoint
   - Test subscription and notification flows
   - Monitor CloudWatch logs for any issues

---

## 📋 Troubleshooting

### Common Issues

1. **VAPID Key Not Found**
   - Ensure terraform.tfvars is created with valid VAPID keys
   - Check SSM Parameter Store for parameter existence

2. **Lambda Function Timeout**
   - Check CloudWatch logs for specific errors
   - Verify web-push layer is attached correctly

3. **Subscription Failures**
   - Verify subscription object format matches Web Push standard
   - Check browser console for detailed error messages

4. **Notification Not Received**
   - Verify subscription is active in DynamoDB
   - Check push service endpoint validity
   - Review notification payload format

### Debug Commands
```bash
# Check DynamoDB subscriptions
aws dynamodb scan --table-name pulse-subscriptions

# Check SSM parameters
aws ssm get-parameter --name "/pulse/notifications/vapid/public-key"

# Test Lambda function directly
aws lambda invoke --function-name pulse-web-push-sender \
  --payload '{"httpMethod":"POST","path":"/notifications","body":"{\"title\":\"Test\",\"message\":\"Hello!\"}"}' \
  response.json
```