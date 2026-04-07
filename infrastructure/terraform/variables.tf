variable "project_name" {
  type        = string
  description = "Project name prefix"
  default     = "next-gateway"
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
  default     = "next-gateway-db"
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
  description = "Cognito Hosted UI domain prefix"
  default     = "next-gateway"
}

variable "cognito_existing_user_pool_id" {
  type        = string
  description = "Existing Cognito User Pool ID to use instead of creating one"
  default     = ""
}

variable "cognito_existing_app_client_id" {
  type        = string
  description = "Existing Cognito App Client ID to use instead of creating one"
  default     = ""
}

variable "cognito_existing_domain_prefix" {
  type        = string
  description = "Existing Cognito Hosted UI domain prefix (for example: next-gateway)"
  default     = ""
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

variable "enable_route53" {
  type        = bool
  description = "Enable Route 53 DNS records for ALB frontend and API Gateway"
  default     = false
}

variable "route53_create_zone" {
  type        = bool
  description = "Create the hosted zone when true; otherwise look up an existing public zone"
  default     = false
}

variable "route53_zone_name" {
  type        = string
  description = "Public hosted zone name (for example: example.com)"
  default     = ""
}

variable "route53_frontend_subdomain" {
  type        = string
  description = "Subdomain for frontend ALB alias. Leave empty to use the zone apex."
  default     = ""
}

variable "route53_api_subdomain" {
  type        = string
  description = "Subdomain for API Gateway CNAME record"
  default     = "api"
}

variable "route53_ttl" {
  type        = number
  description = "TTL for non-alias Route 53 records"
  default     = 300
}
