"""Distributed rate limiter using Redis (falls back to in-memory for dev)"""

import time
from collections import defaultdict

import structlog
from fastapi import HTTPException, Request

from src.config import settings

logger = structlog.get_logger()


class InMemoryRateLimiter:
    """Fallback rate limiter for development (single instance only)."""

    def __init__(self):
        self._attempts: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_attempts: int, window_seconds: int = 60):
        now = time.time()
        self._attempts[key] = [t for t in self._attempts[key] if now - t < window_seconds]
        if len(self._attempts[key]) >= max_attempts:
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {window_seconds} seconds.")
        self._attempts[key].append(now)

    def clear(self):
        self._attempts.clear()


class RedisRateLimiter:
    """Distributed rate limiter using Redis sorted sets."""

    def __init__(self, redis_url: str):
        import redis
        self._redis = redis.from_url(redis_url, decode_responses=True, socket_timeout=3)

    def check(self, key: str, max_attempts: int, window_seconds: int = 60):
        now = time.time()
        redis_key = f"ratelimit:{key}"

        pipe = self._redis.pipeline()
        pipe.zremrangebyscore(redis_key, 0, now - window_seconds)
        pipe.zcard(redis_key)
        pipe.zadd(redis_key, {str(now): now})
        pipe.expire(redis_key, window_seconds + 1)
        results = pipe.execute()

        count = results[1]
        if count >= max_attempts:
            raise HTTPException(status_code=429, detail=f"Too many attempts. Try again in {window_seconds} seconds.")

    def clear(self):
        pass  # Redis handles TTL automatically


def _create_rate_limiter():
    """Create the appropriate rate limiter based on environment."""
    try:
        limiter = RedisRateLimiter(settings.redis_url)
        # Test connection
        limiter._redis.ping()
        logger.info("rate_limiter_initialized", backend="redis")
        return limiter
    except Exception:
        logger.warning("rate_limiter_fallback", backend="in-memory", reason="Redis unavailable")
        return InMemoryRateLimiter()


rate_limiter = _create_rate_limiter()


def get_client_key(request: Request, suffix: str = "") -> str:
    """Build rate limit key from IP + suffix."""
    forwarded = request.headers.get("x-forwarded-for")
    ip = forwarded.split(",")[0].strip() if forwarded else (request.client.host if request.client else "unknown")
    return f"{ip}:{suffix}"
