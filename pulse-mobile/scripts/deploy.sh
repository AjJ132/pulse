#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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

# Check if required tools are installed
check_dependencies() {
    local missing_deps=()
    
    if ! command -v aws &> /dev/null; then
        missing_deps+=("AWS CLI")
    fi
    
    if ! command -v terraform &> /dev/null; then
        missing_deps+=("Terraform")
    fi
    
    if ! command -v node &> /dev/null; then
        missing_deps+=("Node.js")
    fi
    
    if ! command -v npm &> /dev/null; then
        missing_deps+=("NPM")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        print_error "Please install them before running this script."
        exit 1
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the pulse-mobile directory."
    exit 1
fi

print_section "🚀 Starting Complete Pulse Deployment Process"
print_status "This will:"
print_status "  1. Generate VAPID keys"
print_status "  2. Update configuration files"
print_status "  3. Validate VAPID configuration"
print_status "  4. Deploy backend infrastructure"
print_status "  5. Deploy Lambda functions"
print_status "  6. Build and deploy frontend"
echo

check_dependencies

# Step 1: Install dependencies
print_section "📦 Installing Dependencies"
print_status "Installing npm packages..."
npm install

# Step 2: Generate VAPID keys (using central script)
print_section "🔑 Generating VAPID Keys"

# Check if central VAPID keys exist
if [ ! -f "../pulse-notifications/terraform.tfvars" ]; then
    print_status "Generating central VAPID keys..."
    cd ..
    node generate-vapid-keys.js
    cd pulse-mobile
    print_status "Central VAPID keys generated"
else
    print_warning "Central VAPID keys already exist"
fi

# Read VAPID keys from pulse-notifications terraform.tfvars
VAPID_PUBLIC=$(grep 'vapid_public_key' ../pulse-notifications/terraform.tfvars | cut -d'"' -f2)
VAPID_PRIVATE=$(grep 'vapid_private_key' ../pulse-notifications/terraform.tfvars | cut -d'"' -f2)

print_status "VAPID Public Key: ${VAPID_PUBLIC:0:20}..."
print_status "VAPID Private Key: ${VAPID_PRIVATE:0:20}..."

# Step 3: Update push notifications configuration
print_section "⚙️ Updating Configuration"
print_status "Frontend configured for dynamic VAPID key fetching..."
print_status "VAPID keys will be fetched dynamically from backend API"

# Step 4: Validate VAPID Configuration
print_section "🔑 Validating VAPID Configuration"
print_status "Checking VAPID keys..."

# Check if we have the central VAPID keys
if [ ! -f "../pulse-notifications/terraform.tfvars" ]; then
    print_error "No VAPID configuration found. Please run generate-vapid-keys.js from project root first."
    exit 1
fi

print_status "VAPID configuration validated"

# Step 5: Deploy backend infrastructure
print_section "☁️ Deploying Backend Infrastructure"

# Deploy notification backend first
print_status "Deploying notification backend..."
cd ../pulse-notifications

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_status "Initializing backend Terraform..."
    terraform init
fi

# Apply backend infrastructure
print_status "Applying backend infrastructure..."
terraform apply -auto-approve

# Get backend outputs
API_ENDPOINT=$(terraform output -raw api_gateway_url)
print_status "Backend API URL: $API_ENDPOINT"

# Step 6: Deploy Lambda functions (using new combined deploy script)
print_section "⚡ Deploying Lambda Functions and Infrastructure"

# Use the new combined deploy script
print_status "Building and deploying Lambda functions..."
./deploy.sh

print_status "Lambda functions and infrastructure deployed successfully"

# Go back to mobile directory
cd ../pulse-mobile

# Step 7: Update API endpoint in frontend
print_section "🔧 Updating Frontend Configuration"
print_status "Updating API endpoint in frontend..."

# Update the API endpoint in push notifications file
sed -i.bak "s|this\.apiEndpoint = '.*';|this.apiEndpoint = '$API_ENDPOINT';|" src/push-notifications.js
rm -f src/push-notifications.js.bak

print_status "API endpoint updated to: $API_ENDPOINT"

# Step 8: Deploy frontend infrastructure
print_section "🏗️ Deploying Frontend Infrastructure"

# Change to terraform directory
cd terraform

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    print_status "Initializing frontend Terraform..."
    terraform init
fi

# Apply frontend infrastructure
print_status "Applying frontend infrastructure..."
terraform apply -auto-approve

# Get the S3 bucket name and website URL from Terraform output
BUCKET_NAME=$(terraform output -raw s3_bucket_name)
WEBSITE_URL=$(terraform output -raw website_url)

print_status "Frontend infrastructure deployed successfully!"
print_status "S3 Bucket: $BUCKET_NAME"
print_status "Website URL: $WEBSITE_URL"

# Go back to project root
cd ..

# Step 9: Build and deploy frontend
print_section "🔨 Building and Deploying Frontend"

# Build the PWA
print_status "Building the PWA..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    print_error "Build failed. dist directory not found."
    exit 1
fi

# Sync the dist folder to S3
print_status "Uploading files to S3..."
aws s3 sync dist/ s3://$BUCKET_NAME --delete

# Step 10: Save configuration
print_section "💾 Saving Configuration"

# Update deployment info file
if [ -f "deployment-info.json" ]; then
    # Update existing deployment info
    node -e "
        const fs = require('fs');
        const info = JSON.parse(fs.readFileSync('deployment-info.json'));
        info.timestamp = '$(date -u +"%Y-%m-%dT%H:%M:%SZ")';
        info.api_endpoint = '$API_ENDPOINT';
        info.website_url = '$WEBSITE_URL';
        info.s3_bucket = '$BUCKET_NAME';
        fs.writeFileSync('deployment-info.json', JSON.stringify(info, null, 2));
    "
else
    # Create new deployment info (fallback)
    cat > deployment-info.json << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "vapid_public_key": "$VAPID_PUBLIC",
  "api_endpoint": "$API_ENDPOINT",
  "website_url": "$WEBSITE_URL",
  "s3_bucket": "$BUCKET_NAME"
}
EOF
fi

print_status "Deployment configuration saved to deployment-info.json"

# Final success message
print_section "✅ Deployment Completed Successfully!"
echo
print_status "🔑 VAPID Keys: Generated and configured"
print_status "☁️  Backend API: $API_ENDPOINT"
print_status "🌐 Frontend URL: $WEBSITE_URL"
print_status "📱 S3 Bucket: $BUCKET_NAME"
echo
print_section "📱 Testing Instructions:"
print_status "1. Visit $WEBSITE_URL on your iPhone (iOS 16.4+)"
print_status "2. Use Safari browser"
print_status "3. Add to Home Screen"
print_status "4. Open from home screen"
print_status "5. Subscribe to notifications"
print_status "6. Test with the 'Send Test Notification' button"
echo
print_warning "⚠️  IMPORTANT: Keep vapid-keys.json secure and backed up!"
print_status "Deployment completed at $(date)" 