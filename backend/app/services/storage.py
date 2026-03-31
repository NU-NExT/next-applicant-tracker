from pathlib import Path
from uuid import uuid4

import boto3
from botocore.client import BaseClient
from fastapi import UploadFile

from app.config import settings


class StorageService:
    def __init__(self) -> None:
        self.backend = settings.storage_backend.lower()
        self.local_path = Path(settings.local_storage_path)
        self.s3_client: BaseClient | None = None

        if self.backend == "s3":
            self.s3_client = boto3.client(
                "s3",
                region_name=settings.aws_region,
                endpoint_url=settings.s3_endpoint_url,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                aws_session_token=settings.aws_session_token,
            )

    async def save(self, file: UploadFile, bucket: str, prefix: str) -> str:
        key = f"{prefix}/{uuid4()}-{file.filename}"

        if self.backend == "s3" and self.s3_client:
            file.file.seek(0)
            content_type = file.content_type or "application/octet-stream"
            self.s3_client.upload_fileobj(
                file.file, bucket, key,
                ExtraArgs={"ContentType": content_type},
            )
            return key

        target = self.local_path / bucket / key
        target.parent.mkdir(parents=True, exist_ok=True)
        content = await file.read()
        target.write_bytes(content)
        return str(target)

    def get_view_url(self, bucket: str, key: str, expires_seconds: int = 3600) -> str:
        if self.backend == "s3" and self.s3_client:
            url = self.s3_client.generate_presigned_url(
                ClientMethod="get_object",
                Params={
                    "Bucket": bucket,
                    "Key": key,
                    "ResponseContentDisposition": "inline",
                    "ResponseContentType": "application/pdf",
                },
                ExpiresIn=expires_seconds,
            )
            # Presigned URLs use the Docker-internal endpoint (e.g. localstack:4566).
            # Swap to localhost so the browser can reach it.
            if settings.environment == "development" and settings.s3_endpoint_url:
                url = url.replace("localstack:4566", "localhost:4566")
            return url
        return key


storage_service = StorageService()
