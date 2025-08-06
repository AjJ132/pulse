variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "pulse"
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "vapid_public_key" {
  description = "VAPID public key for Web Push notifications"
  type        = string
  sensitive   = false
}

variable "vapid_private_key" {
  description = "VAPID private key for Web Push notifications"
  type        = string
  sensitive   = true
}

variable "vapid_contact" {
  description = "Contact email for VAPID (mailto: format)"
  type        = string
  default     = "mailto:admin@pulse-app.com"
} 