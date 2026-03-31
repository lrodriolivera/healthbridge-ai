"""S3 storage implementation for production"""

import boto3
from botocore.exceptions import ClientError

from src.config import settings


class S3StorageService:
    def __init__(self):
        # Use explicit credentials if provided, otherwise fall back to
        # IAM role credentials (ECS task role, EC2 instance profile, etc.)
        kwargs = {"region_name": settings.aws_region}
        if settings.aws_access_key_id and settings.aws_secret_access_key:
            kwargs["aws_access_key_id"] = settings.aws_access_key_id
            kwargs["aws_secret_access_key"] = settings.aws_secret_access_key
        self.s3 = boto3.client("s3", **kwargs)
        self.bucket = settings.s3_bucket

    async def generate_upload_url(self, key: str, content_type: str, expires: int = 3600) -> dict:
        url = self.s3.generate_presigned_url(
            "put_object",
            Params={
                "Bucket": self.bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=expires,
        )
        return {"url": url, "method": "PUT", "key": key}

    async def get_file(self, key: str) -> bytes:
        response = self.s3.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    async def put_file(self, key: str, content: bytes, content_type: str) -> str:
        self.s3.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
        )
        return key

    async def list_files(self, prefix: str) -> list[dict]:
        try:
            response = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=prefix)
        except ClientError:
            return []

        files = []
        for obj in response.get("Contents", []):
            files.append({
                "key": obj["Key"],
                "filename": obj["Key"].rsplit("/", 1)[-1],
                "size": obj["Size"],
                "last_modified": obj["LastModified"].isoformat(),
            })
        return files

    async def delete_file(self, key: str) -> bool:
        try:
            self.s3.delete_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError:
            return False
