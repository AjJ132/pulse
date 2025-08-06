# Terraform State Backend - Pulse Project

This directory contains the Terraform configuration for creating and managing the S3 bucket that will store the Terraform state files for all components of the Pulse project.

## Project Tags

All resources in the Pulse project should be tagged with the following standard tags:

### Required Tags

- **Project**: `pulse`
- **Environment**: `dev` | `staging` | `prod`
- **Owner**: `pulse-team`
- **CostCenter**: `pulse-app`
- **ManagedBy**: `terraform`

### Optional Tags

- **Component**: `mobile-app` | `backend` | `infrastructure` | `state-backend`
- **Version**: `v1.0.0` (or appropriate version)
- **Description**: Brief description of the resource

## Tag Examples

```hcl
tags = {
  Project     = "pulse"
  Environment = "dev"
  Owner       = "pulse-team"
  CostCenter  = "pulse-app"
  ManagedBy   = "terraform"
  Component   = "state-backend"
  Version     = "v1.0.0"
  Description = "S3 bucket for storing Terraform state files"
}
```

## Project Components

The Pulse project consists of the following components that will use this state backend:

1. **pulse-mobile** - Mobile application infrastructure
2. **pulse-backend** - Backend services and APIs
3. **pulse-infrastructure** - Shared infrastructure components
4. **terraform-state-backend** - This state backend itself

## Usage

Each component should reference this state backend in their Terraform configuration:

```hcl
terraform {
  backend "s3" {
    bucket = "pulse-terraform-state-{environment}"
    key    = "{component}/terraform.tfstate"
    region = "us-east-1"
  }
}
```

## Security

- The S3 bucket will be encrypted at rest
- Versioning will be enabled for state file recovery
- Access will be restricted to authorized IAM roles/users
- State files will be stored with appropriate lifecycle policies 