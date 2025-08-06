#!/bin/bash

# Terraform State Backend Deployment Script
# This script initializes and deploys the S3 bucket and DynamoDB table for Terraform state management

set -e

echo "🚀 Deploying Terraform State Backend for Pulse Project..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform is not installed. Please install it first."
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials are not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Initialize Terraform
echo "📦 Initializing Terraform..."
terraform init

# Plan the deployment
echo "📋 Planning deployment..."
terraform plan -out=tfplan

# Ask for confirmation
read -p "Do you want to apply this plan? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔨 Applying Terraform configuration..."
    terraform apply tfplan
    
    echo "✅ Deployment completed successfully!"
    echo ""
    echo "📊 Outputs:"
    terraform output
    
    echo ""
    echo "🔧 To use this backend in other projects, add this configuration:"
    echo "terraform {"
    echo "  backend \"s3\" {"
    echo "    bucket         = \"$(terraform output -raw state_bucket_name)\""
    echo "    key            = \"your-component/terraform.tfstate\""
    echo "    region         = \"$(terraform output -raw backend_config | jq -r .region)\""
    echo "    dynamodb_table = \"$(terraform output -raw dynamodb_table_name)\""
    echo "    encrypt        = true"
    echo "  }"
    echo "}"
    
else
    echo "❌ Deployment cancelled"
    exit 1
fi 