#!/bin/bash

# Script to update APNS certificate for Pulse Notifications
# Run this after you get your Apple certificate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}  Update APNS Certificate${NC}"
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

show_instructions() {
    echo -e "${YELLOW}APNS Certificate Setup Instructions:${NC}"
    echo
    echo "1. Go to Apple Developer Console: https://developer.apple.com/account/"
    echo "2. Navigate to Certificates, Identifiers & Profiles"
    echo "3. Create an App ID with Push Notifications enabled"
    echo "4. Generate an Apple Push Notification service SSL certificate"
    echo "5. Download the certificate (.cer file)"
    echo "6. Convert to P12 format:"
    echo "   - Double-click .cer file to add to Keychain"
    echo "   - Export as Personal Information Exchange (.p12)"
    echo "   - Set a password (remember it!)"
    echo "7. Convert P12 to base64:"
    echo "   base64 -i /path/to/certificate.p12 | tr -d '\\n' > certificate_base64.txt"
    echo
}

update_certificate() {
    print_step "Updating APNS certificate configuration..."
    
    # Check if terraform.tfvars exists
    if [ ! -f "terraform.tfvars" ]; then
        print_error "terraform.tfvars not found. Please run deploy.sh first."
        exit 1
    fi
    
    # Get certificate file path
    read -p "Enter path to your P12 certificate file: " cert_path
    
    if [ ! -f "$cert_path" ]; then
        print_error "Certificate file not found: $cert_path"
        exit 1
    fi
    
    # Get certificate password
    read -s -p "Enter P12 certificate password: " cert_password
    echo
    
    # Convert to base64
    print_step "Converting certificate to base64..."
    cert_base64=$(base64 -i "$cert_path" | tr -d '\n')
    
    if [ -z "$cert_base64" ]; then
        print_error "Failed to convert certificate to base64"
        exit 1
    fi
    
    # Update terraform.tfvars
    print_step "Updating terraform.tfvars..."
    
    # Create backup
    cp terraform.tfvars terraform.tfvars.backup
    
    # Update the certificate values
    sed -i.tmp "s|apns_certificate_p12_base64 = \".*\"|apns_certificate_p12_base64 = \"$cert_base64\"|" terraform.tfvars
    sed -i.tmp "s|apns_certificate_password = \".*\"|apns_certificate_password = \"$cert_password\"|" terraform.tfvars
    
    # Clean up temp file
    rm terraform.tfvars.tmp
    
    print_success "Certificate configuration updated!"
    echo
    print_step "Next steps:"
    echo "1. Run: terraform plan"
    echo "2. Review the changes (should show SNS Platform Application will be created)"
    echo "3. Run: terraform apply"
    echo "4. Test push notifications!"
}

redeploy_infrastructure() {
    print_step "Redeploying infrastructure with APNS certificate..."
    
    if terraform plan; then
        echo
        print_warning "Review the plan above. You should see the SNS Platform Application will be created."
        read -p "Continue with deployment? (y/N): " -r
        
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            if terraform apply; then
                print_success "Infrastructure updated with APNS certificate!"
                echo
                print_step "Testing configuration..."
                
                # Get the new platform application ARN
                PLATFORM_ARN=$(terraform output -raw sns_platform_application_arn 2>/dev/null || echo "Not available")
                echo "SNS Platform Application ARN: $PLATFORM_ARN"
                
                if [[ "$PLATFORM_ARN" != *"Not created"* ]]; then
                    print_success "APNS certificate successfully configured!"
                    echo
                    echo "You can now test push notifications with your iOS app."
                    echo "Make sure to update your iOS app with the API Gateway URL:"
                    terraform output api_gateway_url
                else
                    print_error "Something went wrong. Check the Terraform output above."
                fi
            else
                print_error "Terraform apply failed"
                exit 1
            fi
        else
            print_warning "Deployment cancelled"
        fi
    else
        print_error "Terraform plan failed"
        exit 1
    fi
}

# Main script
case "${1:-}" in
    "instructions")
        print_header
        show_instructions
        ;;
    "update")
        print_header
        update_certificate
        ;;
    "deploy")
        print_header
        redeploy_infrastructure
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  instructions  Show how to get APNS certificate from Apple"
        echo "  update        Update terraform.tfvars with certificate"
        echo "  deploy        Redeploy infrastructure with certificate"
        echo "  help          Show this help message"
        echo
        echo "Full workflow:"
        echo "  1. $0 instructions"
        echo "  2. Get certificate from Apple Developer Console"
        echo "  3. $0 update"
        echo "  4. $0 deploy"
        ;;
    "")
        print_header
        show_instructions
        echo
        read -p "Do you have your P12 certificate ready? (y/N): " -r
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            update_certificate
            echo
            read -p "Deploy infrastructure with the certificate? (y/N): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                redeploy_infrastructure
            fi
        else
            echo
            print_step "Get your certificate first, then run:"
            echo "$0 update"
        fi
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Run '$0 help' for usage information"
        exit 1
        ;;
esac
