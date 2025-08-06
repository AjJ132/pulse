#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_section() {
    echo -e "${BLUE}[SECTION]${NC} $1"
}

# Check if VAPID keys exist
if [ ! -f "vapid-keys.json" ]; then
    print_error "VAPID keys not found. Please run 'npm run apply' first to generate them."
    exit 1
fi

# Read VAPID keys
VAPID_PUBLIC=$(node -e "console.log(JSON.parse(require('fs').readFileSync('vapid-keys.json')).publicKey)")
VAPID_PRIVATE=$(node -e "console.log(JSON.parse(require('fs').readFileSync('vapid-keys.json')).privateKey)")

print_section "🔑 Setting up AWS SNS Platform Application"
print_status "Using VAPID keys from vapid-keys.json"

# Create or update SNS platform application
PLATFORM_NAME="pulse-web-push"
PLATFORM_DISPLAY_NAME="Pulse Web Push"

print_status "Creating SNS platform application: $PLATFORM_NAME"

# Try to create the platform application
print_status "Attempting to create platform application..."

# Create the platform application with detailed error handling
CREATE_OUTPUT=$(aws sns create-platform-application \
    --name "$PLATFORM_NAME" \
    --platform GCM \
    --attributes "PlatformCredential=$VAPID_PRIVATE" \
    --query 'PlatformApplicationArn' \
    --output text 2>&1)

CREATE_EXIT_CODE=$?

if [ $CREATE_EXIT_CODE -eq 0 ] && [[ "$CREATE_OUTPUT" == arn:aws:sns:* ]]; then
    # Success - we have the ARN
    PLATFORM_ARN="$CREATE_OUTPUT"
    print_status "Platform application created successfully: $PLATFORM_ARN"
else
    # Failed to create - check if it already exists
    print_warning "Creation failed, checking if platform application already exists..."
    echo "Create error output: $CREATE_OUTPUT"
    
    # Check if the error is because it already exists
    if echo "$CREATE_OUTPUT" | grep -q "already exists\|AlreadyExists"; then
        print_status "Platform application already exists, retrieving ARN..."
        
        # Get existing platform applications and filter by name
        PLATFORM_ARN=$(aws sns list-platform-applications \
            --query "PlatformApplications[?contains(PlatformApplicationArn, '$PLATFORM_NAME')].PlatformApplicationArn" \
            --output text)
        
        if [ -n "$PLATFORM_ARN" ] && [ "$PLATFORM_ARN" != "None" ]; then
            print_status "Found existing platform application: $PLATFORM_ARN"
            
            # Update the credentials
            print_status "Updating platform application credentials..."
            aws sns set-platform-application-attributes \
                --platform-application-arn "$PLATFORM_ARN" \
                --attributes "PlatformCredential=$VAPID_PRIVATE"
            
            print_status "Platform application credentials updated"
        else
            print_error "Could not find existing platform application with name: $PLATFORM_NAME"
            print_error "Available platforms:"
            aws sns list-platform-applications --output table
            exit 1
        fi
    else
        print_error "Failed to create platform application. Error:"
        echo "$CREATE_OUTPUT"
        print_error "This might be due to:"
        print_error "1. AWS credentials not configured"
        print_error "2. Insufficient permissions"
        print_error "3. Invalid VAPID private key format"
        print_error "4. AWS service issues"
        exit 1
    fi
fi

# Update the platform ARN in push-notifications.js
print_status "Updating platform ARN in push-notifications.js..."

# Escape the ARN for sed
ESCAPED_ARN=$(echo "$PLATFORM_ARN" | sed 's/[[\.*^$()+?{|]/\\&/g')

# Update the platform ARN in the push notifications file
sed -i.bak "s|this\.platformArn = '.*';|this.platformArn = '$PLATFORM_ARN';|" src/push-notifications.js
rm -f src/push-notifications.js.bak

print_status "Platform ARN updated successfully"

# Save the platform ARN to deployment info
if [ -f "deployment-info.json" ]; then
    # Update existing deployment info
    node -e "
        const fs = require('fs');
        const info = JSON.parse(fs.readFileSync('deployment-info.json'));
        info.platform_arn = '$PLATFORM_ARN';
        info.vapid_private_key = '$VAPID_PRIVATE';
        fs.writeFileSync('deployment-info.json', JSON.stringify(info, null, 2));
    "
else
    # Create new deployment info
    cat > deployment-info.json << EOF
{
  "platform_arn": "$PLATFORM_ARN",
  "vapid_public_key": "$VAPID_PUBLIC",
  "vapid_private_key": "$VAPID_PRIVATE",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
}
EOF
fi

print_section "✅ AWS SNS Platform Setup Complete!"
echo
print_status "🔑 Platform ARN: $PLATFORM_ARN"
print_status "📝 Configuration updated in src/push-notifications.js"
print_status "💾 Platform ARN saved to deployment-info.json"
echo
print_section "📋 Manual Steps Required:"
print_warning "1. Verify the platform application in AWS SNS Console"
print_warning "2. Test creating an endpoint with a test subscription"
print_warning "3. Run 'npm run apply' to complete full deployment"
echo
print_status "Setup completed at $(date)"