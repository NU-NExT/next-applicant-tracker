locals {
  use_existing_cognito = trimspace(var.cognito_existing_user_pool_id) != "" && trimspace(var.cognito_existing_app_client_id) != ""

  cognito_domain_prefix_effective = trimspace(var.cognito_existing_domain_prefix) != "" ? var.cognito_existing_domain_prefix : var.cognito_domain_prefix
}

resource "aws_cognito_user_pool" "main" {
  count = local.use_existing_cognito ? 0 : 1

  name = "${local.name_prefix}-user-pool"

  mfa_configuration = "OFF"

  password_policy {
    minimum_length                   = 12
    require_lowercase                = true
    require_numbers                  = true
    require_symbols                  = true
    require_uppercase                = true
    temporary_password_validity_days = 7
  }

  auto_verified_attributes = ["email"]

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  username_configuration {
    case_sensitive = false
  }

  verification_message_template {
    # Send email verification as a clickable link instead of a one-time code.
    # A Custom Message Lambda can use ClientMetadata.return_to to build per-job redirects.
    default_email_option = "CONFIRM_WITH_LINK"
  }

  tags = local.common_tags
}

resource "aws_cognito_user_pool_client" "app_client" {
  count = local.use_existing_cognito ? 0 : 1

  name         = "${local.name_prefix}-app-client"
  user_pool_id = aws_cognito_user_pool.main[0].id

  generate_secret               = false
  prevent_user_existence_errors = "ENABLED"
  enable_token_revocation       = true
  refresh_token_validity        = 30
  access_token_validity         = 1
  id_token_validity             = 1

  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]
  supported_identity_providers         = ["COGNITO"]
  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls

  explicit_auth_flows = [
    "ALLOW_USER_PASSWORD_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  token_validity_units {
    access_token  = "hours"
    id_token      = "hours"
    refresh_token = "days"
  }
}

resource "aws_cognito_user_pool_domain" "hosted_ui" {
  count = local.use_existing_cognito ? 0 : 1

  domain       = local.cognito_domain_prefix_effective
  user_pool_id = aws_cognito_user_pool.main[0].id
}

resource "aws_cognito_user_group" "admin" {
  count = local.use_existing_cognito ? 0 : 1

  user_pool_id = aws_cognito_user_pool.main[0].id
  name         = var.cognito_admin_group_name
  description  = "Administrators created only by existing ADMIN users."
}

locals {
  cognito_user_pool_id  = local.use_existing_cognito ? var.cognito_existing_user_pool_id : aws_cognito_user_pool.main[0].id
  cognito_app_client_id = local.use_existing_cognito ? var.cognito_existing_app_client_id : aws_cognito_user_pool_client.app_client[0].id
}
