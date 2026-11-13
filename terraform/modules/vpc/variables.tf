
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["vulnerable", "hardened"], var.environment)
    error_message = "Environment must be vulnerable or hardened."
  }
}

variable "vpc_cidr" {
  description = "CIDR range for the VPC"
  type        = string
}

variable "private_subnet_cidr" {
  description = "CIDR range for the private subnet"
  type        = string
}

variable "availability_zone" {
  description = "AWS availability zone"
  type        = string
}
