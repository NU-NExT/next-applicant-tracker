from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "development"
    database_url: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/application_tracker"

    storage_backend: str = "local"
    local_storage_path: str = "./data"

    aws_region: str = "us-east-1"
    aws_access_key_id: str = "test"
    aws_secret_access_key: str = "test"
    s3_endpoint_url: str | None = None
    s3_bucket_resumes: str = "application-tracker-resumes"
    s3_bucket_transcripts: str = "application-tracker-transcripts"
    s3_bucket_files: str = "application-tracker-files"

    cognito_user_pool_id: str = ""
    cognito_app_client_id: str = ""
    cognito_app_client_secret: str = ""
    cognito_admin_group_name: str = "ADMIN"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
