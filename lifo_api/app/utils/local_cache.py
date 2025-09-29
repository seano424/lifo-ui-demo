"""
Local memory cache with TTL support for OCR results
Budget-friendly alternative to Redis that uses Python's built-in capabilities
"""

import asyncio
import hashlib
import json
import time
from datetime import datetime
from threading import Lock
from typing import Any, Optional

import structlog

logger = structlog.get_logger()


class LocalMemoryCache:
    """
    Thread-safe local memory cache with TTL support

    Features:
    - Time-to-live (TTL) expiration
    - Automatic cleanup of expired entries
    - Memory usage limits to prevent OOM
    - Hash-based keys for efficient storage
    - JSON serialization for complex objects
    """

    def __init__(
        self,
        max_size: int = 1000,
        default_ttl_seconds: int = 3600,
        cleanup_interval_seconds: int = 300
    ):
        self._cache: dict[str, dict[str, Any]] = {}
        self._max_size = max_size
        self._default_ttl = default_ttl_seconds
        self._lock = Lock()
        self._last_cleanup = time.time()
        self._cleanup_interval = cleanup_interval_seconds

        logger.info(
            "Local memory cache initialized",
            max_size=max_size,
            default_ttl_seconds=default_ttl_seconds,
            cleanup_interval_seconds=cleanup_interval_seconds
        )

    def _generate_key(self, key_data: Any) -> str:
        """Generate a hash-based cache key from any data"""
        if isinstance(key_data, bytes):
            return hashlib.sha256(key_data).hexdigest()
        elif isinstance(key_data, str):
            return hashlib.sha256(key_data.encode()).hexdigest()
        else:
            # For complex objects, serialize to JSON first
            json_str = json.dumps(key_data, sort_keys=True, default=str)
            return hashlib.sha256(json_str.encode()).hexdigest()

    def _cleanup_expired(self) -> int:
        """Remove expired entries from cache"""
        current_time = time.time()
        expired_keys = []

        for key, entry in self._cache.items():
            if current_time > entry['expires_at']:
                expired_keys.append(key)

        for key in expired_keys:
            del self._cache[key]

        self._last_cleanup = current_time

        if expired_keys:
            logger.debug(
                "Cleaned up expired cache entries",
                expired_count=len(expired_keys),
                remaining_count=len(self._cache)
            )

        return len(expired_keys)

    def _maybe_cleanup(self):
        """Perform cleanup if enough time has passed"""
        current_time = time.time()
        if current_time - self._last_cleanup > self._cleanup_interval:
            self._cleanup_expired()

    def _enforce_size_limit(self):
        """Remove oldest entries if cache exceeds size limit"""
        if len(self._cache) <= self._max_size:
            return

        # Sort by access time and remove oldest entries
        sorted_entries = sorted(
            self._cache.items(),
            key=lambda x: x[1]['last_accessed']
        )

        entries_to_remove = len(self._cache) - self._max_size + 1
        for i in range(entries_to_remove):
            key, _ = sorted_entries[i]
            del self._cache[key]

        logger.debug(
            "Enforced cache size limit",
            removed_count=entries_to_remove,
            current_size=len(self._cache),
            max_size=self._max_size
        )

    def get(self, key_data: Any) -> Optional[Any]:
        """Get value from cache"""
        cache_key = self._generate_key(key_data)

        with self._lock:
            self._maybe_cleanup()

            if cache_key not in self._cache:
                return None

            entry = self._cache[cache_key]
            current_time = time.time()

            # Check if expired
            if current_time > entry['expires_at']:
                del self._cache[cache_key]
                return None

            # Update access time
            entry['last_accessed'] = current_time

            logger.debug("Cache hit", cache_key=cache_key[:16])
            return entry['value']

    def set(
        self,
        key_data: Any,
        value: Any,
        ttl_seconds: Optional[int] = None
    ) -> None:
        """Set value in cache with TTL"""
        cache_key = self._generate_key(key_data)
        ttl = ttl_seconds if ttl_seconds is not None else self._default_ttl
        current_time = time.time()

        with self._lock:
            self._maybe_cleanup()
            self._enforce_size_limit()

            self._cache[cache_key] = {
                'value': value,
                'expires_at': current_time + ttl,
                'last_accessed': current_time,
                'created_at': current_time
            }

            logger.debug(
                "Cache set",
                cache_key=cache_key[:16],
                ttl_seconds=ttl,
                cache_size=len(self._cache)
            )

    def delete(self, key_data: Any) -> bool:
        """Delete value from cache"""
        cache_key = self._generate_key(key_data)

        with self._lock:
            if cache_key in self._cache:
                del self._cache[cache_key]
                logger.debug("Cache delete", cache_key=cache_key[:16])
                return True
            return False

    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            logger.info("Cache cleared", cleared_count=count)

    def get_stats(self) -> dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            current_time = time.time()
            expired_count = sum(
                1 for entry in self._cache.values()
                if current_time > entry['expires_at']
            )

            return {
                'total_entries': len(self._cache),
                'expired_entries': expired_count,
                'active_entries': len(self._cache) - expired_count,
                'max_size': self._max_size,
                'utilization_percent': (len(self._cache) / self._max_size) * 100,
                'last_cleanup': datetime.fromtimestamp(self._last_cleanup).isoformat(),
            }


# Global cache instance for OCR results
_ocr_cache: Optional[LocalMemoryCache] = None


def get_ocr_cache() -> LocalMemoryCache:
    """Get or create the global OCR cache instance"""
    global _ocr_cache
    if _ocr_cache is None:
        from app.core.config import settings
        _ocr_cache = LocalMemoryCache(
            max_size=1000,  # Store up to 1000 OCR results
            default_ttl_seconds=settings.ocr_cache_ttl_seconds,
            cleanup_interval_seconds=300  # Cleanup every 5 minutes
        )
    return _ocr_cache


def cache_ocr_result(image_data: bytes, result: Any) -> None:
    """Cache an OCR result using image data as key"""
    from app.core.config import settings
    if not settings.ocr_enable_caching:
        return

    cache = get_ocr_cache()
    cache.set(image_data, result, settings.ocr_cache_ttl_seconds)


def get_cached_ocr_result(image_data: bytes) -> Optional[Any]:
    """Get cached OCR result for image data"""
    from app.core.config import settings
    if not settings.ocr_enable_caching:
        return None

    cache = get_ocr_cache()
    return cache.get(image_data)


def get_ocr_cache_stats() -> dict[str, Any]:
    """Get OCR cache statistics"""
    cache = get_ocr_cache()
    return cache.get_stats()


async def periodic_cache_cleanup():
    """Periodic cache cleanup task (can be run as background task)"""
    while True:
        try:
            cache = get_ocr_cache()
            with cache._lock:
                cache._cleanup_expired()
            await asyncio.sleep(300)  # Every 5 minutes
        except Exception as e:
            logger.error("Cache cleanup failed", error=str(e))
            await asyncio.sleep(60)  # Retry after 1 minute on error
