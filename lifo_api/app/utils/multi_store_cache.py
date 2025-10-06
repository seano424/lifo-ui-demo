"""
Multi-Store Caching Utilities for Phase 3 MVP
Simple caching layer to optimize performance across 5-10 stores
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Dict, Optional
import structlog

logger = structlog.get_logger()

class MultiStoreCache:
    """
    Simple in-memory cache for multi-store operations
    Designed for MVP scale (5-10 stores) with basic TTL and cache invalidation
    """
    __slots__ = ('_cache', '_default_ttl', '_stats')
    
    def __init__(self, default_ttl_minutes: int = 5):
        self._cache: dict[str, dict[str, Any]] = {}
        self._default_ttl = timedelta(minutes=default_ttl_minutes)
        self._stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "evictions": 0
        }
    
    def _generate_key(self, user_id: str, operation: str, params: dict[str, Any] | None = None) -> str:
        """Generate cache key for multi-store operations"""
        if params:
            param_str = "_".join(f"{k}:{v}" for k, v in sorted(params.items()))
            return f"multi_store:{user_id}:{operation}:{param_str}"
        return f"multi_store:{user_id}:{operation}"
    
    def _is_expired(self, cache_entry: dict[str, Any]) -> bool:
        """Check if cache entry has expired"""
        return datetime.utcnow() > cache_entry["expires_at"]
    
    def _cleanup_expired(self) -> None:
        """Remove expired entries from cache - optimized single-pass"""
        current_time = datetime.utcnow()
        expired_keys = [
            key for key, entry in self._cache.items() 
            if current_time > entry["expires_at"]
        ]
        
        for key in expired_keys:
            del self._cache[key]
            self._stats["evictions"] += 1
    
    async def get(self, user_id: str, operation: str, params: dict[str, Any] | None = None) -> Any | None:
        """Get cached data for multi-store operation"""
        try:
            # Periodic cleanup (every 10th operation)
            if (self._stats["hits"] + self._stats["misses"]) % 10 == 0:
                self._cleanup_expired()
            
            cache_key = self._generate_key(user_id, operation, params)
            
            if cache_key not in self._cache:
                self._stats["misses"] += 1
                return None
            
            cache_entry = self._cache[cache_key]
            
            if self._is_expired(cache_entry):
                del self._cache[cache_key]
                self._stats["misses"] += 1
                self._stats["evictions"] += 1
                return None
            
            self._stats["hits"] += 1
            cache_entry["last_accessed"] = datetime.utcnow()
            
            logger.debug(
                "Multi-store cache hit",
                user_id=user_id,
                operation=operation,
                cache_key=cache_key
            )
            
            return cache_entry["data"]
            
        except Exception as e:
            logger.warning("Multi-store cache get failed", error=str(e))
            return None
    
    async def set(self, user_id: str, operation: str, data: Any, params: dict[str, Any] | None = None, ttl_minutes: int | None = None) -> None:
        """Cache data for multi-store operation"""
        try:
            cache_key = self._generate_key(user_id, operation, params)
            ttl = timedelta(minutes=ttl_minutes or self._default_ttl.total_seconds() / 60)
            
            now = datetime.utcnow()
            cache_entry = {
                "data": data,
                "created_at": now,
                "expires_at": now + ttl,
                "last_accessed": now,
                "operation": operation,
                "user_id": user_id
            }
            
            self._cache[cache_key] = cache_entry
            self._stats["sets"] += 1
            
            # Simple memory management for MVP - limit to 1000 entries
            if len(self._cache) > 1000:
                # Remove oldest entries
                oldest_keys = sorted(
                    self._cache.keys(),
                    key=lambda k: self._cache[k]["last_accessed"]
                )[:100]  # Remove 100 oldest entries
                
                for key in oldest_keys:
                    del self._cache[key]
                    self._stats["evictions"] += 1
            
            logger.debug(
                "Multi-store cache set",
                user_id=user_id,
                operation=operation,
                cache_key=cache_key,
                ttl_minutes=ttl.total_seconds() / 60
            )
            
        except Exception as e:
            logger.warning("Multi-store cache set failed", error=str(e))
    
    async def invalidate_user(self, user_id: str) -> None:
        """Invalidate all cache entries for a specific user"""
        try:
            user_keys = [k for k in self._cache.keys() if f"multi_store:{user_id}:" in k]
            
            for key in user_keys:
                del self._cache[key]
                self._stats["evictions"] += 1
            
            logger.info(
                "Multi-store cache invalidated for user",
                user_id=user_id,
                invalidated_count=len(user_keys)
            )
            
        except Exception as e:
            logger.warning("Multi-store cache invalidation failed", error=str(e))
    
    async def invalidate_operation(self, operation: str) -> None:
        """Invalidate all cache entries for a specific operation"""
        try:
            operation_keys = [k for k in self._cache.keys() if f":{operation}:" in k or k.endswith(f":{operation}")]
            
            for key in operation_keys:
                del self._cache[key]
                self._stats["evictions"] += 1
            
            logger.info(
                "Multi-store cache invalidated for operation",
                operation=operation,
                invalidated_count=len(operation_keys)
            )
            
        except Exception as e:
            logger.warning("Multi-store cache operation invalidation failed", error=str(e))
    
    def get_stats(self) -> dict[str, Any]:
        """Get cache performance statistics"""
        total_requests = self._stats["hits"] + self._stats["misses"]
        hit_rate = (self._stats["hits"] / total_requests * 100) if total_requests > 0 else 0
        
        return {
            "hit_rate_percent": round(hit_rate, 1),
            "total_requests": total_requests,
            "cache_size": len(self._cache),
            "statistics": self._stats.copy(),
            "efficiency": "excellent" if hit_rate > 80 else "good" if hit_rate > 60 else "needs_improvement"
        }
    
    async def clear_all(self) -> None:
        """Clear all cache entries (for testing/maintenance)"""
        cleared_count = len(self._cache)
        self._cache.clear()
        self._stats["evictions"] += cleared_count
        
        logger.info("Multi-store cache cleared", cleared_count=cleared_count)


# Global cache instance for the application
_multi_store_cache: MultiStoreCache | None = None


def get_multi_store_cache() -> MultiStoreCache:
    """Get or create the global multi-store cache instance"""
    global _multi_store_cache
    
    if _multi_store_cache is None:
        _multi_store_cache = MultiStoreCache(default_ttl_minutes=5)  # 5-minute default TTL for MVP
        logger.info("Multi-store cache initialized for Phase 3 MVP")
    
    return _multi_store_cache


async def cache_multi_store_operation(
    user_id: str,
    operation: str,
    data_fetcher,
    params: dict[str, Any] | None = None,
    ttl_minutes: int = 5
) -> Any:
    """
    Decorator-like function to cache multi-store operations
    
    Usage:
        result = await cache_multi_store_operation(
            user_id="user123",
            operation="overview",
            data_fetcher=lambda: expensive_multi_store_operation(),
            params={"days": 30},
            ttl_minutes=10
        )
    """
    cache = get_multi_store_cache()
    
    # Try to get from cache first
    cached_data = await cache.get(user_id, operation, params)
    if cached_data is not None:
        return cached_data
    
    # Fetch fresh data
    try:
        fresh_data = await data_fetcher() if asyncio.iscoroutinefunction(data_fetcher) else data_fetcher()
        
        # Cache the result
        await cache.set(user_id, operation, fresh_data, params, ttl_minutes)
        
        return fresh_data
        
    except Exception as e:
        logger.error(
            "Multi-store operation failed",
            user_id=user_id,
            operation=operation,
            error=str(e)
        )
        raise