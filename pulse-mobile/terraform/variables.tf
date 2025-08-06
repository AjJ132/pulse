variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (e.g., dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for hosting the PWA"
  type        = string
  default     = "pulse-mobile-pwa"
}



variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "pulse"
}

variable "owner" {
  description = "Owner of the resources"
  type        = string
  default     = "pulse-team"
}

variable "cost_center" {
  description = "Cost center for billing purposes"
  type        = string
  default     = "pulse-app"
}

variable "component" {
  description = "Component name"
  type        = string
  default     = "mobile-app"
}
