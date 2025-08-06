# Pulse Mobile Infrastructure

This directory contains the Terraform configuration for the Pulse mobile PWA infrastructure.

## Infrastructure Components

- **S3 Bucket**: Hosts the Progressive Web App (PWA) files with static website hosting
- **S3 Bucket Policy**: Allows public read access for web hosting
- **S3 Website Configuration**: Configures the bucket for static website hosting

## State Management

This configuration uses the centralized S3 backend for state management:

```hcl
terraform {
  backend "s3" {
    bucket         = "pulse-terraform-state-dev-2024"
    key            = "pulse-mobile/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "pulse-terraform-locks-dev"
    encrypt        = true
  }
}
```

## Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** installed (version >= 1.0)
3. **S3 Backend** deployed (run `terraform-state-backend/deploy.sh` first)
4. **AWS Credentials** configured with appropriate permissions

## Deployment

### Quick Deploy

```bash
./deploy.sh
```

### Manual Deploy

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

## Configuration

### Variables

Key variables can be configured in `terraform.tfvars`:

- `aws_region`: AWS region (default: us-east-1)
- `environment`: Environment name (default: dev)
- `bucket_name`: S3 bucket name (default: pulse-mobile-pwa-dev)


### Tagging

All resources are tagged according to the Pulse project standards:

- **Project**: `pulse`
- **Environment**: `dev` | `staging` | `prod`
- **Owner**: `pulse-team`
- **CostCenter**: `pulse-app`
- **ManagedBy**: `terraform`
- **Component**: `mobile-app`
- **Version**: `v1.0.0`

## Outputs

After deployment, the following outputs are available:

- `s3_bucket_name`: S3 bucket name
- `s3_bucket_website_endpoint`: S3 website endpoint
- `website_url`: Complete public URL for accessing the website

## Post-Deployment Steps

1. **Build the PWA**:
   ```bash
   cd ../
   npm run build
   ```

2. **Deploy to S3**:
   ```bash
   aws s3 sync dist/ s3://$(terraform output -raw s3_bucket_name) --delete
   ```

3. **Access Your Site**:
   ```bash
   echo "Your site is available at: $(terraform output -raw website_url)"
   ```

## Security Features

- **Proper S3 Permissions**: Public read access only for web hosting
- **Versioning**: S3 bucket versioning enabled for backup

## Benefits of S3-Only Setup

- **Instant Updates**: Changes are visible immediately (no CloudFront cache delay)
- **Simplified Architecture**: Fewer moving parts to manage
- **Cost Effective**: No CloudFront charges for low-traffic applications
- **Fast Deployment**: No need to wait for CloudFront invalidations

## Troubleshooting

### Common Issues

1. **Bucket Name Already Exists**: Change the `bucket_name` variable in `terraform.tfvars`
2. **Backend Not Found**: Ensure the S3 backend is deployed first
3. **Permission Denied**: Verify AWS credentials and IAM permissions

### Useful Commands

```bash
# View current state
terraform show

# List resources
terraform state list

# Import existing resources (if needed)
terraform import aws_s3_bucket.pulse_mobile_bucket bucket-name

# Destroy infrastructure (use with caution)
terraform destroy
``` 