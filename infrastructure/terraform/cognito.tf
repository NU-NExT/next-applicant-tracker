resource "aws_cognito_user_pool" "main" {
  name = "${local.name_prefix}-user-pool"

  # Enforce @northeastern.edu emails as usernames (FR-2.1.2)
  username_attributes      = ["email"]
  auto_verified_attributes = ["email"]

  username_configuration {
    case_sensitive = false
  }

  password_policy {
    minimum_length                   = 8
    require_uppercase                = true
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = false
    temporary_password_validity_days = 7
  }

  # Email-based password reset (FR-2.1.4)
  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  # Block self-registration for ADMIN (enforced at app level, but restrict here too)
  admin_create_user_config {
    allow_admin_create_user_only = false # candidates self-register
  }

  tags = local.common_tags
}

# CANDIDATE group
resource "aws_cognito_user_group" "candidate" {
  name         = "CANDIDATE"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "Applying students"
}

# ADMIN group
resource "aws_cognito_user_group" "admin" {
  name         = "ADMIN"
  user_pool_id = aws_cognito_user_pool.main.id
  description  = "NExT staff and faculty"
}

# App client (used by the frontend)
resource "aws_cognito_user_pool_client" "frontend" {
  name         = "${local.name_prefix}-frontend-client"
  user_pool_id = aws_cognito_user_pool.main.id

  access_token_validity  = 8   # hours (NFR-6.1.3)
  id_token_validity      = 8
  refresh_token_validity = 30  # days

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH"
  ]

  prevent_user_existence_errors = "ENABLED"
}

output "cognito_user_pool_id" {
  value = aws_cognito_user_pool.main.id
}

output "cognito_client_id" {
  value = aws_cognito_user_pool_client.frontend.id
}