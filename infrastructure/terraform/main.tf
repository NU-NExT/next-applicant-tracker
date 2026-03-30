locals {
  is_prod = lower(var.environment) == "prod" || lower(var.environment) == "production"

  # If no explicit DATABASE_URL is provided (dev/localstack), fall back to docker-postgres defaults.
  effective_database_url = trimspace(var.database_url) != "" ? var.database_url : format(
    "postgresql+psycopg2://%s:%s@%s:%s/%s",
    var.postgres_user,
    var.postgres_password,
    var.postgres_host,
    var.postgres_port,
    var.postgres_db
  )

  # LocalStack endpoint should only be injected for non-prod environments.
  effective_s3_endpoint_url = local.is_prod ? "" : var.s3_endpoint_url
}
