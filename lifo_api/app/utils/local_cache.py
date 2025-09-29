"""
Simple local cache implementation
"""
from typing import Any, Dict, Optional
import time


class LocalCache:
    """Simple in-memory cache with TTL support"""

    def __init__(self, default_ttl: int = 300):
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.default_ttl = default_ttl

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if key not in self.cache:
            return None

        value, expires_at = self.cache[key]
        if time.time() > expires_at:
            del self.cache[key]
            return None

        return value

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        expires_at = time.time() + (ttl or self.default_ttl)
        self.cache[key] = (value, expires_at)

    def delete(self, key: str) -> None:
        """Delete key from cache"""
        self.cache.pop(key, None)

    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()


# Global cache instance
cache = LocalCache()


def cache_ocr_result(key: str, result: Any, ttl: int = 3600) -> None:
    """Cache OCR result with default 1 hour TTL"""
    cache.set(key, result, ttl)


def get_cached_ocr_result(key: str) -> Optional[Any]:
    """Get cached OCR result"""
    return cache.get(key)