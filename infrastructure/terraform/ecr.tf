resource "aws_ecr_repository" "frontend" {
  name                 = "${local.name_prefix}-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

output "ecr_frontend_url" {
  value = aws_ecr_repository.frontend.repository_url
}

output "ecr_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}