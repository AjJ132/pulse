variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}


variable "state_bucket_name" {
  description = "Name of the S3 bucket for storing Terraform state files"
  type        = string
  default     = "pulse-terraform-state-dev"
  
  validation {
    condition     = length(var.state_bucket_name) >= 3 && length(var.state_bucket_name) <= 63
    error_message = "Bucket name must be between 3 and 63 characters long."
  }
}

variable "dynamodb_table_name" {
  description = "Name of the DynamoDB table for Terraform state locking"
  type        = string
  default     = "pulse-terraform-locks-dev"
  
  validation {
    condition     = length(var.dynamodb_table_name) >= 3 && length(var.dynamodb_table_name) <= 255
    error_message = "DynamoDB table name must be between 3 and 255 characters long."
  }
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "pulse"
}
