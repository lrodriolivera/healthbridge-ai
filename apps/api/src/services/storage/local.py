"""Local filesystem storage implementation for development"""

import os
from datetime import datetime, timezone
from pathlib import Path

from src.config import settings


class LocalStorageService:
    def __init__(self):
        self.base_dir = Path(settings.upload_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        return self.base_dir / key

    async def generate_upload_url(self, key: str, content_type: str, expires: int = 3600) -> dict:
        return {
            "url": f"/api/v1/internal/upload",
            "method": "POST",
            "key": key,
        }

    async def get_file(self, key: str) -> bytes:
        path = self._resolve(key)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {key}")
        return path.read_bytes()

    async def put_file(self, key: str, content: bytes, content_type: str) -> str:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        return key

    async def list_files(self, prefix: str) -> list[dict]:
        dir_path = self._resolve(prefix)
        if not dir_path.exists():
            return []

        files = []
        for item in dir_path.rglob("*"):
            if item.is_file():
                rel_key = str(item.relative_to(self.base_dir))
                stat = item.stat()
                files.append({
                    "key": rel_key,
                    "filename": item.name,
                    "size": stat.st_size,
                    "last_modified": datetime.fromtimestamp(stat.st_mtime, tz=timezone.utc).isoformat(),
                })
        return files

    async def delete_file(self, key: str) -> bool:
        path = self._resolve(key)
        if path.exists():
            path.unlink()
            return True
        return False
