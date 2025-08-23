variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "apns_certificate_p12_base64" {
  description = "Base64 encoded P12 certificate for APNS"
  type        = string
  sensitive   = true
}

variable "apns_certificate_password" {
  description = "Password for the P12 certificate"
  type        = string
  sensitive   = true
  default     = ""
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "app_bundle_id" {
  description = "iOS app bundle identifier"
  type        = string
  default     = "com.pulse.mobile"
}
