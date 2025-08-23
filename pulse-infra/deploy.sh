#!/bin/bash

# Pulse Infrastructure Deployment Script
# This script deploys the complete push notification infrastructure

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_VERSION_REQUIRED="1.0"
AWS_REGION="us-east-1"

# Functions
print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Pulse Infrastructure Deployment${NC}"
    echo -e "${BLUE}======================================${NC}"
    echo
}

print_step() {
    echo -e "${YELLOW}➤ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install Terraform first."
        echo "Visit: https://learn.hashicorp.com/tutorials/terraform/install-cli"
        exit 1
    fi
    
    # Check Terraform version
    TERRAFORM_VERSION=$(terraform version -json | jq -r '.terraform_version' 2>/dev/null || terraform version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
    if [[ $(echo "$TERRAFORM_VERSION $TERRAFORM_VERSION_REQUIRED" | tr " " "\n" | sort -V | head -n1) != "$TERRAFORM_VERSION_REQUIRED" ]]; then
        print_error "Terraform version $TERRAFORM_VERSION_REQUIRED or higher is required. Found: $TERRAFORM_VERSION"
        exit 1
    fi
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install AWS CLI first."
        echo "Visit: https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS credentials not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if jq is installed (for JSON parsing)
    if ! command -v jq &> /dev/null; then
        print_warning "jq is not installed. Some features may not work properly."
        echo "Install with: brew install jq (macOS) or apt-get install jq (Ubuntu)"
    fi
    
    print_success "Prerequisites check passed"
}

check_terraform_vars() {
    print_step "Checking Terraform variables..."
    
    if [ ! -f "terraform.tfvars" ]; then
        print_warning "terraform.tfvars file not found"
        echo
        if [ -f "terraform.tfvars.example" ]; then
            print_step "Creating terraform.tfvars from example..."
            cp terraform.tfvars.example terraform.tfvars
            print_warning "Please edit terraform.tfvars with your Apple certificate details before continuing"
            echo
            echo "Required variables:"
            echo "- apns_certificate_p12_base64: Base64 encoded P12 certificate"
            echo "- apns_certificate_password: Password for the P12 certificate"
            echo
            read -p "Press Enter after updating terraform.tfvars, or Ctrl+C to exit..."
        else
            print_error "terraform.tfvars.example not found. Cannot proceed."
            exit 1
        fi
    fi
    
    # Check for required variables
    REQUIRED_VARS=("apns_certificate_p12_base64" "apns_certificate_password")
    MISSING_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if ! grep -q "^${var}.*=" terraform.tfvars || grep -q "^${var}.*=\"\"" terraform.tfvars; then
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -ne 0 ]; then
        print_error "Missing or empty required variables in terraform.tfvars:"
        for var in "${MISSING_VARS[@]}"; do
            echo "  - $var"
        done
        echo
        echo "Please update terraform.tfvars with your Apple certificate details."
        echo "See SETUP_GUIDE.md for instructions on obtaining these values."
        exit 1
    fi
    
    print_success "Terraform variables validated"
}

check_backend_access() {
    print_step "Checking S3 backend access..."
    
    # Extract backend configuration
    BUCKET=$(grep -A 10 "backend \"s3\"" backend.tf | grep "bucket" | sed 's/.*= *"\([^"]*\)".*/\1/')
    DYNAMODB_TABLE=$(grep -A 10 "backend \"s3\"" backend.tf | grep "dynamodb_table" | sed 's/.*= *"\([^"]*\)".*/\1/')
    
    echo "S3 Bucket: $BUCKET"
    echo "DynamoDB Table: $DYNAMODB_TABLE"
    
    # Check if S3 bucket exists and is accessible
    if aws s3 ls "s3://$BUCKET" &> /dev/null; then
        print_success "S3 backend bucket accessible"
    else
        print_warning "S3 bucket '$BUCKET' not accessible or doesn't exist"
        read -p "Do you want to create the S3 bucket? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            aws s3 mb "s3://$BUCKET" --region "$AWS_REGION"
            aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
            aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration '{
                "Rules": [
                    {
                        "ApplyServerSideEncryptionByDefault": {
                            "SSEAlgorithm": "AES256"
                        }
                    }
                ]
            }'
            print_success "S3 bucket created and configured"
        else
            print_error "Cannot proceed without S3 backend access"
            exit 1
        fi
    fi
    
    # Check if DynamoDB table exists
    if aws dynamodb describe-table --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION" &> /dev/null; then
        print_success "DynamoDB lock table accessible"
    else
        print_warning "DynamoDB table '$DYNAMODB_TABLE' not accessible or doesn't exist"
        read -p "Do you want to create the DynamoDB table? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            aws dynamodb create-table \
                --table-name "$DYNAMODB_TABLE" \
                --attribute-definitions AttributeName=LockID,AttributeType=S \
                --key-schema AttributeName=LockID,KeyType=HASH \
                --billing-mode PAY_PER_REQUEST \
                --region "$AWS_REGION"
            
            # Wait for table to be active
            print_step "Waiting for DynamoDB table to be active..."
            aws dynamodb wait table-exists --table-name "$DYNAMODB_TABLE" --region "$AWS_REGION"
            print_success "DynamoDB lock table created"
        else
            print_error "Cannot proceed without DynamoDB lock table"
            exit 1
        fi
    fi
}

terraform_init() {
    print_step "Initializing Terraform..."
    
    if terraform init; then
        print_success "Terraform initialized successfully"
    else
        print_error "Terraform initialization failed"
        exit 1
    fi
}

terraform_validate() {
    print_step "Validating Terraform configuration..."
    
    if terraform validate; then
        print_success "Terraform configuration is valid"
    else
        print_error "Terraform configuration validation failed"
        exit 1
    fi
}

terraform_plan() {
    print_step "Creating Terraform execution plan..."
    
    if terraform plan -out=tfplan; then
        print_success "Terraform plan created successfully"
        echo
        print_warning "Review the plan above before proceeding with deployment"
        echo
    else
        print_error "Terraform plan failed"
        exit 1
    fi
}

terraform_apply() {
    print_step "Applying Terraform configuration..."
    
    echo "This will create AWS resources and may incur costs."
    read -p "Do you want to proceed with deployment? (y/N): " -r
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if terraform apply tfplan; then
            print_success "Infrastructure deployed successfully!"
        else
            print_error "Terraform apply failed"
            exit 1
        fi
    else
        print_warning "Deployment cancelled by user"
        exit 0
    fi
}

show_outputs() {
    print_step "Retrieving deployment outputs..."
    echo
    
    # Get and display outputs
    API_URL=$(terraform output -raw api_gateway_url 2>/dev/null || echo "Not available")
    SNS_ARN=$(terraform output -raw sns_platform_application_arn 2>/dev/null || echo "Not available")
    
    echo -e "${GREEN}Deployment Complete!${NC}"
    echo
    echo "API Gateway URL: $API_URL"
    echo "SNS Platform App ARN: $SNS_ARN"
    echo
    echo -e "${YELLOW}Next Steps:${NC}"
    echo "1. Update your iOS app with the API Gateway URL:"
    echo "   Replace 'YOUR_API_GATEWAY_URL' in AppDelegate.swift and ContentView.swift"
    echo "   with: $API_URL"
    echo
    echo "2. Test the API:"
    echo "   ./test_api.sh $API_URL"
    echo
    echo "3. Build and run your iOS app on a physical device"
    echo
    echo "4. Check the setup guide for additional configuration:"
    echo "   cat ../SETUP_GUIDE.md"
}

cleanup() {
    # Clean up temporary files
    if [ -f "tfplan" ]; then
        rm tfplan
    fi
}

# Main deployment process
main() {
    print_header
    
    # Set up cleanup trap
    trap cleanup EXIT
    
    # Run deployment steps
    check_prerequisites
    check_terraform_vars
    check_backend_access
    terraform_init
    terraform_validate
    terraform_plan
    terraform_apply
    show_outputs
    
    print_success "Deployment completed successfully!"
}

# Handle command line arguments
case "${1:-}" in
    "destroy")
        print_header
        print_warning "This will destroy ALL infrastructure resources!"
        echo "This action cannot be undone."
        read -p "Are you sure you want to destroy the infrastructure? (type 'yes' to confirm): " -r
        if [[ $REPLY == "yes" ]]; then
            terraform destroy
            print_success "Infrastructure destroyed"
        else
            print_warning "Destroy cancelled"
        fi
        ;;
    "plan")
        check_prerequisites
        check_terraform_vars
        terraform_init
        terraform_validate
        terraform_plan
        ;;
    "init")
        check_prerequisites
        terraform_init
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  (no command)  Full deployment process"
        echo "  plan          Create and show execution plan only"
        echo "  init          Initialize Terraform only"
        echo "  destroy       Destroy all infrastructure"
        echo "  help          Show this help message"
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
