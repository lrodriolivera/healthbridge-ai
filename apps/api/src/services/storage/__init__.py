"""Storage service — abstract file storage with local and S3 implementations"""

from src.config import settings
from src.services.storage.base import StorageService
from src.services.storage.local import LocalStorageService

_storage_instance: StorageService | None = None


def get_storage() -> StorageService:
    global _storage_instance
    if _storage_instance is None:
        if settings.storage_backend == "s3":
            from src.services.storage.s3 import S3StorageService
            _storage_instance = S3StorageService()
        else:
            _storage_instance = LocalStorageService()
    return _storage_instance
