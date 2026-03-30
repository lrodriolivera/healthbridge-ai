"""Storage service protocol"""

from typing import Protocol


class StorageService(Protocol):
    async def generate_upload_url(self, key: str, content_type: str, expires: int = 3600) -> dict:
        """Generate a URL for uploading a file. Returns dict with url, method, key."""
        ...

    async def get_file(self, key: str) -> bytes:
        """Retrieve file contents by key."""
        ...

    async def put_file(self, key: str, content: bytes, content_type: str) -> str:
        """Store file contents. Returns the storage key."""
        ...

    async def list_files(self, prefix: str) -> list[dict]:
        """List files under a prefix. Returns list of {key, size, last_modified}."""
        ...

    async def delete_file(self, key: str) -> bool:
        """Delete a file by key. Returns True if deleted."""
        ...
