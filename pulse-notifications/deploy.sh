#!/bin/bash

# Combined Build & Deploy script for Pulse Notifications Infrastructure
# This script builds all Lambda functions/layers and deploys the infrastructure

set -e  # Exit on any error

echo "🚀 Starting Pulse Notifications Build & Deployment..."
echo "====================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "main.tf" ]; then
    print_error "main.tf not found. Please run this script from the pulse-notifications directory."
    exit 1
fi

# Check if VAPID keys are generated
if [ ! -f "terraform.tfvars" ]; then
    print_error "terraform.tfvars not found. Please run 'node ../generate-vapid-keys.js' first."
    exit 1
fi

print_status "Checking VAPID keys configuration..."
if ! grep -q "vapid_public_key" terraform.tfvars; then
    print_error "VAPID keys not found in terraform.tfvars. Please run 'node ../generate-vapid-keys.js' first."
    exit 1
fi
print_success "VAPID keys configuration found"

# ============================================================================
# BUILD PHASE
# ============================================================================

print_status "🏗️  Starting Build Phase..."

# Create build directory
BUILD_DIR="build"
rm -rf $BUILD_DIR
mkdir -p $BUILD_DIR

print_status "Building Lambda layer for web-push..."

# Build web-push layer
LAYER_DIR="lambda_layers/web-push-layer"
if [ -d "$LAYER_DIR" ]; then
    cd $LAYER_DIR
    
    print_status "Installing dependencies for web-push layer..."
    cd nodejs
    npm install --production --silent
    cd ..
    
    print_status "Creating layer zip file..."
    zip -r ../../$BUILD_DIR/web-push-layer.zip . -x "*.git*" "*.DS_Store*" > /dev/null
    
    # Copy to expected location for Terraform
    cp ../../$BUILD_DIR/web-push-layer.zip ../../lambda_layers/web-push-layer.zip
    
    cd ../..
    print_success "Web-push layer built successfully"
else
    print_error "Web-push layer directory not found: $LAYER_DIR"
    exit 1
fi

print_status "Building subscription manager Lambda function..."

# Build subscription manager
FUNC_DIR="lambda_functions/subscription_manager"
if [ -d "$FUNC_DIR" ]; then
    cd $FUNC_DIR
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        print_status "Installing dependencies for subscription manager..."
        npm install --production --silent
    fi
    
    print_status "Creating subscription manager zip file..."
    zip -r ../../$BUILD_DIR/subscription_manager.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*" > /dev/null
    
    # Copy to expected location for Terraform
    cp ../../$BUILD_DIR/subscription_manager.zip ../../lambda_functions/subscription_manager.zip
    
    cd ../..
    print_success "Subscription manager built successfully"
else
    print_error "Subscription manager directory not found: $FUNC_DIR"
    exit 1
fi

print_status "Building web push sender Lambda function..."

# Build web push sender
FUNC_DIR="lambda_functions/web_push_sender"
if [ -d "$FUNC_DIR" ]; then
    cd $FUNC_DIR
    
    # Install dependencies if package.json exists
    if [ -f "package.json" ]; then
        print_status "Installing dependencies for web push sender..."
        npm install --production --silent
    fi
    
    print_status "Creating web push sender zip file..."
    zip -r ../../$BUILD_DIR/web_push_sender.zip . -x "*.git*" "*.DS_Store*" "node_modules/.cache/*" > /dev/null
    
    # Copy to expected location for Terraform
    cp ../../$BUILD_DIR/web_push_sender.zip ../../lambda_functions/web_push_sender.zip
    
    cd ../..
    print_success "Web push sender built successfully"
else
    print_error "Web push sender directory not found: $FUNC_DIR"
    exit 1
fi

print_success "🏗️  Build Phase Complete!"
echo ""
print_status "Built artifacts:"
ls -la lambda_functions/*.zip 2>/dev/null || true
ls -la lambda_layers/*.zip 2>/dev/null || true
echo ""

# ============================================================================
# DEPLOYMENT PHASE  
# ============================================================================

print_status "🚀 Starting Deployment Phase..."

# Initialize Terraform
print_status "Initializing Terraform..."
terraform init -input=false

# Validate Terraform configuration
print_status "Validating Terraform configuration..."
terraform validate
print_success "Terraform configuration is valid"

# Plan deployment
print_status "Planning deployment..."
terraform plan -input=false -out=tfplan

# Show what will be deployed
print_status "Deployment plan created. Key changes:"
echo ""

# Apply deployment
print_warning "About to deploy infrastructure..."
echo "This will:"
echo "  - Create/update DynamoDB table for subscriptions"
echo "  - Deploy Lambda functions (subscription manager & web push sender)"
echo "  - Create Lambda layer with web-push package"
echo "  - Setup API Gateway endpoints"
echo "  - Configure SSM parameters for VAPID keys"
echo ""

read -p "Continue with deployment? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Deploying infrastructure..."
    terraform apply tfplan
    
    # Clean up plan file
    rm -f tfplan
    
    print_success "🚀 Deployment Complete!"
    echo ""
    
    # Show deployment outputs
    print_status "📊 Deployment Summary:"
    echo ""
    terraform output
    
    echo ""
    print_success "🎉 Pulse Notifications infrastructure deployed successfully!"
    echo ""
    print_status "Next Steps:"
    echo "  1. Update your frontend API endpoint with the new URL"
    echo "  2. Test subscription and notification flows"
    echo "  3. Monitor CloudWatch logs for any issues"
    echo ""
    print_status "Useful Commands:"
    echo "  - View logs: aws logs tail /aws/lambda/pulse-subscription-manager --follow"
    echo "  - View logs: aws logs tail /aws/lambda/pulse-web-push-sender --follow"
    echo "  - Test API: curl -X GET \$(terraform output -raw api_gateway_url)/vapid"
    
else
    print_warning "Deployment cancelled by user"
    rm -f tfplan
    exit 1
fi

# ============================================================================
# CLEANUP
# ============================================================================

print_status "Cleaning up build artifacts..."
rm -rf $BUILD_DIR

print_success "✨ All done! Your Pulse Notifications system is ready to use."