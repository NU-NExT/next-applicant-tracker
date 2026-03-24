variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "application-tracker"
}

variable "environment" {
  type        = string
  description = "Environment name"
  default     = "dev"
}

variable "aws_region" {
  type        = string
  description = "AWS region"
  default     = "us-east-1"
}

variable "aws_profile" {
  type        = string
  description = "AWS CLI profile for Terraform authentication"
  default     = ""
}

variable "vpc_cidr" {
  type    = string
  default = "10.20.0.0/16"
}

variable "public_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.1.0/24", "10.20.2.0/24"]
}

variable "private_subnet_cidrs" {
  type    = list(string)
  default = ["10.20.11.0/24", "10.20.12.0/24"]
}

variable "frontend_image" {
  type        = string
  description = "Frontend container image URI"
  default     = "public.ecr.aws/docker/library/nginx:latest"
}

variable "backend_image" {
  type        = string
  description = "Backend container image URI"
  default     = "public.ecr.aws/docker/library/python:3.12-slim"
}

variable "desired_count_frontend" {
  type    = number
  default = 1
}

variable "desired_count_backend" {
  type    = number
  default = 1
}

variable "database_url" {
  type        = string
  sensitive   = true
  description = "Production database URL for backend"
  default     = ""
}

variable "postgres_user" {
  type        = string
  description = "Postgres user for docker/localstack development fallback URL"
  default     = "postgres"
}

variable "postgres_password" {
  type        = string
  description = "Postgres password for docker/localstack development fallback URL"
  sensitive   = true
  default     = "postgres"
}

variable "postgres_host" {
  type        = string
  description = "Postgres host for docker/localstack development fallback URL"
  default     = "db"
}

variable "postgres_port" {
  type        = string
  description = "Postgres port for docker/localstack development fallback URL"
  default     = "5432"
}

variable "postgres_db" {
  type        = string
  description = "Postgres database name for docker/localstack development fallback URL"
  default     = "next-ats-db"
}

variable "s3_endpoint_url" {
  type        = string
  description = "S3 endpoint for non-prod environments (e.g. LocalStack)"
  default     = "http://localstack:4566"
}

variable "cognito_admin_group_name" {
  type        = string
  description = "Cognito group name used for administrators"
  default     = "ADMIN"
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Base prefix for Cognito Hosted UI domain; Terraform appends a stable random suffix"
  default     = "application-tracker-dev-auth"
}

variable "cognito_callback_urls" {
  type        = list(string)
  description = "Allowed callback URLs for Cognito Hosted UI"
  default     = ["http://localhost:3000/login"]
}

variable "cognito_logout_urls" {
  type        = list(string)
  description = "Allowed logout URLs for Cognito Hosted UI"
  default     = ["http://localhost:3000/login"]
}
