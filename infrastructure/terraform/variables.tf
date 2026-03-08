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

variable "vpc_cidr" {
  type        = string
  default     = "10.20.0.0/16"
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
}
