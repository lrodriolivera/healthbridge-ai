variable "project" {
  description = "Project name"
  default     = "healthbridge"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  default     = "dev"
}

variable "aws_region" {
  description = "AWS region"
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  default     = "10.0.0.0/16"
}

# Database
variable "db_instance_class" {
  description = "RDS instance class"
  default     = "db.t3.micro"
}

variable "db_name" {
  default = "healthbridge"
}

variable "db_username" {
  default   = "healthbridge"
  sensitive = true
}

variable "db_password" {
  sensitive = true
}

# Redis
variable "redis_node_type" {
  default = "cache.t3.micro"
}

# ECS
variable "api_cpu" {
  default = 512
}

variable "api_memory" {
  default = 1024
}

variable "api_desired_count" {
  default = 2
}

variable "worker_cpu" {
  default = 1024
}

variable "worker_memory" {
  default = 2048
}

variable "worker_desired_count" {
  default = 1
}

variable "jwt_secret_key" {
  description = "JWT signing secret (64+ chars)"
  sensitive   = true
}

# Domain
variable "domain_name" {
  description = "Domain for the application (e.g., app.healthbridge.ai)"
  default     = ""
}

variable "acm_certificate_arn" {
  description = "ACM certificate ARN for HTTPS"
  default     = ""
}

# Bedrock (separate account)
variable "bedrock_access_key_id" {
  sensitive = true
  default   = ""
}

variable "bedrock_secret_access_key" {
  sensitive = true
  default   = ""
}

variable "bedrock_region" {
  default = "us-east-1"
}
