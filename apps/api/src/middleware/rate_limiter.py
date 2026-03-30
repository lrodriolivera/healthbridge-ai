"""Simple in-memory rate limiter for login attempts"""

import time
from collections import defaultdict

from fastapi import HTTPException, Request


class RateLimiter:
    def __init__(self):
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_attempts: int, window_seconds: int = 60):
        """Raise 429 if key exceeds max_attempts within window."""
        now = time.time()
        # Clean old entries
        self._attempts[key] = [t for t in self._attempts[key] if now - t < window_seconds]

        if len(self._attempts[key]) >= max_attempts:
            raise HTTPException(
                status_code=429,
                detail=f"Too many attempts. Try again in {window_seconds} seconds.",
            )
        self._attempts[key].append(now)


rate_limiter = RateLimiter()


def get_client_key(request: Request, suffix: str = "") -> str:
    """Build rate limit key from IP + suffix."""
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{ip}:{suffix}"
