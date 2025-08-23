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

variable "apns_certificate_p12_base64" {
  description = "Base64 encoded APNS certificate (.p12 file) for iOS push notifications"
  type        = string
  default     = ""
}

variable "apns_certificate_password" {
  description = "Password for the APNS certificate"
  type        = string
  default     = ""
}
