project_name               = "next-gateway"
environment                = "staging"
aws_region                 = "us-east-1"
enable_route53             = true
route53_create_zone        = false
route53_zone_name          = "gateway.nunext.dev"
route53_frontend_subdomain = ""
route53_api_subdomain      = "api"

# Staging should use real cloud resources instead of local compose defaults.
s3_endpoint_url = ""

# Replace these with deployable image URIs for staging.
# Use these outputs after first apply:
# - terraform output -raw ecr_frontend_repository_url
# - terraform output -raw ecr_backend_repository_url
frontend_image = "REPLACE_WITH_FRONTEND_IMAGE_URI"
backend_image  = "REPLACE_WITH_BACKEND_IMAGE_URI"

# Reuse existing Cognito setup from .env
cognito_domain_prefix          = "next-gateway"
cognito_existing_user_pool_id  = "us-east-1_4aNQDGAQv"
cognito_existing_app_client_id = "42ua3s4dmoqpt8mm51tg259lru"
cognito_existing_domain_prefix = "next-gateway"
cognito_callback_urls          = ["https://gateway.nunext.dev/login"]
cognito_logout_urls            = ["https://gateway.nunext.dev/login"]

# Required for staging (example format)
database_url = "postgresql+psycopg2://USER:PASSWORD@HOST:5432/next-gateway-db"
