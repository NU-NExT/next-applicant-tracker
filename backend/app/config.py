from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/next-ats-db"

    storage_backend: str = "local"
    local_storage_path: str = "./data"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    aws_session_token: str | None = None
    s3_endpoint_url: str | None = None
    s3_bucket_resumes: str = "application-tracker-resumes"
    s3_bucket_transcripts: str = "application-tracker-transcripts"
    s3_bucket_files: str = "application-tracker-files"

    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""
    cognito_app_client_secret: str = ""
    cognito_admin_group_name: str = "ADMIN"
    cognito_aws_region: str | None = None
    cognito_aws_access_key_id: str | None = None
    cognito_aws_secret_access_key: str | None = None
    cognito_aws_session_token: str | None = None
    cors_allowed_origins: str = ""
    frontend_dev_url: str = "http://localhost:3000"
    frontend_public_url: str = "https://gateway.nunext.dev"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        configured = [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]
        if configured:
            return configured

        env = (self.environment or "development").lower()
        if env in {"production", "staging"}:
            return [self.frontend_public_url]
        return [self.frontend_dev_url, self.frontend_public_url]


settings = Settings()
