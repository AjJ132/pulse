variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "pulse-news"
}

variable "project_sub_name" {
  description = "Project sub-name for specific resource naming"
  type        = string
  default     = "pulse-gen-function"
}

variable "certificate_arn" {
  description = "ARN of the SSL certificate for the custom domain"
  type        = string
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone ID for aj-johnson.com"
  type        = string
}
