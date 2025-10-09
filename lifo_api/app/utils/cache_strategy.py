"""
Enhanced Caching Strategy for Phase 2 API Consolidations
Implements multi-tier caching with intelligent invalidation
"""

import asyncio
import hashlib
import json
import time
from collections import defaultdict
from functools import wraps

import structlog
from redis import asyncio as aioredis

logger = structlog.get_logger()


class MultiTierCache:
    """
    Three-tier caching system optimized for mobile performance
    L1: In-memory cache (microseconds)
    L2: Redis cache (milliseconds)
    L3: Database cache (tens of milliseconds)
    """

    def __init__(self, redis_client: aioredis.Redis | None = None):
        self.l1_cache = {}  # In-memory cache
        self.redis_client = redis_client
        self.cache_stats = defaultdict(lambda: {"hits": 0, "misses": 0})

        # Cache configuration per tier
        self.config = {
            "l1": {
                "mobile": {"ttl": 5, "max_size": 100},
                "analytics": {"ttl": 10, "max_size": 50},
                "scoring": {"ttl": 30, "max_size": 200},
            },
            "l2": {
                "mobile": {"ttl": 180},  # 3 minutes
                "analytics": {"ttl": 900},  # 15 minutes
                "scoring": {"ttl": 300},  # 5 minutes
            },
        }

        # Start cache cleanup task
        asyncio.create_task(self._cleanup_l1_cache())

    async def get(self, key: str, cache_type: str = "mobile") -> dict | None:
        """Get value from cache with fallback through tiers"""

        # L1: Check in-memory cache
        if key in self.l1_cache:
            entry = self.l1_cache[key]
            if entry["expires"] > time.time():
                self.cache_stats[cache_type]["hits"] += 1
                logger.debug("L1 cache hit", key=key, cache_type=cache_type)
                return entry["data"]
            else:
                # Remove expired entry
                del self.l1_cache[key]

        # L2: Check Redis cache
        if self.redis_client:
            try:
                redis_data = await self.redis_client.get(key)
                if redis_data:
                    data = json.loads(redis_data)
                    # Populate L1 cache
                    await self._set_l1(key, data, cache_type)
                    self.cache_stats[cache_type]["hits"] += 1
                    logger.debug("L2 cache hit", key=key, cache_type=cache_type)
                    return data
            except Exception as e:
                logger.error("Redis cache error", error=str(e), key=key)

        self.cache_stats[cache_type]["misses"] += 1
        return None

    async def set(self, key: str, data: dict, cache_type: str = "mobile"):
        """Set value in all cache tiers"""

        # L1: Set in-memory cache
        await self._set_l1(key, data, cache_type)

        # L2: Set in Redis cache
        if self.redis_client:
            try:
                ttl = self.config["l2"][cache_type]["ttl"]
                await self.redis_client.setex(key, ttl, json.dumps(data, default=str))
            except Exception as e:
                logger.error("Redis cache set error", error=str(e), key=key)

    async def _set_l1(self, key: str, data: dict, cache_type: str):
        """Set value in L1 cache with size management"""
        config = self.config["l1"][cache_type]

        # Check cache size limit
        if len(self.l1_cache) >= config["max_size"]:
            # Remove oldest entries (simple LRU)
            oldest_key = min(
                self.l1_cache.keys(), key=lambda k: self.l1_cache[k].get("accessed", 0)
            )
            del self.l1_cache[oldest_key]

        self.l1_cache[key] = {
            "data": data,
            "expires": time.time() + config["ttl"],
            "accessed": time.time(),
            "cache_type": cache_type,
        }

    async def invalidate(self, pattern: str):
        """Invalidate cache entries matching pattern"""

        # L1: Remove from memory cache
        keys_to_remove = [k for k in self.l1_cache.keys() if pattern in k]
        for key in keys_to_remove:
            del self.l1_cache[key]

        # L2: Remove from Redis cache
        if self.redis_client:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self.redis_client.scan(
                        cursor, match=pattern, count=100
                    )
                    if keys:
                        await self.redis_client.delete(*keys)
                    if cursor == 0:
                        break
            except Exception as e:
                logger.error("Redis invalidation error", error=str(e), pattern=pattern)

    async def _cleanup_l1_cache(self):
        """Periodically clean up expired entries from L1 cache"""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                current_time = time.time()
                expired_keys = [
                    k for k, v in self.l1_cache.items() if v["expires"] < current_time
                ]
                for key in expired_keys:
                    del self.l1_cache[key]

                if expired_keys:
                    logger.info(
                        f"Cleaned up {len(expired_keys)} expired L1 cache entries"
                    )

            except Exception as e:
                logger.error("L1 cache cleanup error", error=str(e))

    def get_stats(self) -> dict:
        """Get cache performance statistics"""
        stats = {}
        for cache_type, data in self.cache_stats.items():
            total = data["hits"] + data["misses"]
            hit_rate = (data["hits"] / total * 100) if total > 0 else 0
            stats[cache_type] = {
                "hits": data["hits"],
                "misses": data["misses"],
                "hit_rate": f"{hit_rate:.1f}%",
                "l1_size": len(
                    [
                        k
                        for k, v in self.l1_cache.items()
                        if v.get("cache_type") == cache_type
                    ]
                ),
            }
        return stats


class SmartCacheInvalidator:
    """Intelligent cache invalidation based on data dependencies"""

    def __init__(self, cache: MultiTierCache):
        self.cache = cache
        self.dependency_map = {
            "inventory_batches": ["mobile:*", "analytics:*", "scoring:*"],
            "product_scores": ["mobile:*", "dashboard:*", "scoring:*"],
            "products": ["mobile:*", "analytics:*"],
            "actions": ["analytics:*", "performance:*"],
        }

    async def invalidate_on_change(self, table: str, store_id: str):
        """Invalidate related cache entries when data changes"""
        patterns = self.dependency_map.get(table, [])

        for pattern in patterns:
            # Replace wildcard with store_id
            specific_pattern = pattern.replace("*", store_id)
            await self.cache.invalidate(specific_pattern)

        logger.info(
            "Cache invalidated", table=table, store_id=store_id, patterns=patterns
        )


def cached_response(ttl: int = 300, cache_type: str = "general"):
    """Decorator for caching endpoint responses"""

    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = _generate_cache_key(func.__name__, args, kwargs)

            # Try to get from cache
            cache = kwargs.get("cache")  # Inject cache instance
            if cache:
                cached_data = await cache.get(cache_key, cache_type)
                if cached_data:
                    logger.debug(
                        "Cache hit", function=func.__name__, cache_key=cache_key
                    )
                    return cached_data

            # Execute function
            result = await func(*args, **kwargs)

            # Store in cache
            if cache and result:
                await cache.set(cache_key, result, cache_type)
                logger.debug(
                    "Cache set", function=func.__name__, cache_key=cache_key, ttl=ttl
                )

            return result

        return wrapper

    return decorator


def _generate_cache_key(func_name: str, args: tuple, kwargs: dict) -> str:
    """Generate consistent cache key from function and arguments"""
    # Filter out non-serializable arguments
    serializable_kwargs = {
        k: v
        for k, v in kwargs.items()
        if k not in ["db", "cache", "current_user", "request"]
    }

    key_data = {
        "func": func_name,
        "args": [str(arg) for arg in args if not hasattr(arg, "__dict__")],
        "kwargs": serializable_kwargs,
    }

    key_string = json.dumps(key_data, sort_keys=True)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()[:8]

    return f"{func_name}:{key_hash}"


class CacheWarmer:
    """Pre-populate cache with frequently accessed data"""

    def __init__(self, cache: MultiTierCache):
        self.cache = cache
        self.warming_tasks = []

    async def warm_cache_on_startup(self, db_session):
        """Warm cache with critical data on application startup"""
        try:
            from app.database.read_only_operations import get_read_only_operations

            read_ops = get_read_only_operations(db_session)

            # Get list of active stores
            stores = await read_ops.get_active_stores()

            warming_tasks = []
            for store in stores:
                # Warm mobile cache
                warming_tasks.append(self._warm_mobile_cache(store.id, read_ops))

                # Warm analytics cache
                warming_tasks.append(self._warm_analytics_cache(store.id, read_ops))

            # Execute warming tasks in parallel
            results = await asyncio.gather(*warming_tasks, return_exceptions=True)

            success_count = sum(1 for r in results if not isinstance(r, Exception))
            logger.info(
                "Cache warming completed",
                total_stores=len(stores),
                successful=success_count,
                failed=len(results) - success_count,
            )

        except Exception as e:
            logger.error("Cache warming failed", error=str(e))

    async def _warm_mobile_cache(self, store_id: str, read_ops):
        """Warm mobile-specific cache entries"""
        try:
            # Generate mobile summary
            mobile_data = await read_ops.get_mobile_summary(store_id)
            await self.cache.set(f"mobile:{store_id}", mobile_data, "mobile")

            # Generate urgent batches
            urgent_data = await read_ops.get_urgent_batches(store_id, limit=10)
            await self.cache.set(f"mobile:urgent:{store_id}", urgent_data, "mobile")

            return True
        except Exception as e:
            logger.error("Failed to warm mobile cache", store_id=store_id, error=str(e))
            return False

    async def _warm_analytics_cache(self, store_id: str, read_ops):
        """Warm analytics cache entries"""
        try:
            # Cache 7-day analytics (most common)
            analytics_7d = await read_ops.get_store_analytics(store_id, days=7)
            await self.cache.set(f"analytics:{store_id}:7", analytics_7d, "analytics")

            return True
        except Exception as e:
            logger.error(
                "Failed to warm analytics cache", store_id=store_id, error=str(e)
            )
            return False


# Global cache instance (to be initialized in app startup)
_global_cache: MultiTierCache | None = None


def init_cache(redis_url: str | None = None) -> MultiTierCache:
    """Initialize global cache instance"""
    global _global_cache

    redis_client = None
    if redis_url:
        try:
            redis_client = aioredis.from_url(
                redis_url, encoding="utf-8", decode_responses=True, max_connections=50
            )
            logger.info("Redis cache initialized", url=redis_url)
        except Exception as e:
            logger.error("Failed to initialize Redis", error=str(e))

    _global_cache = MultiTierCache(redis_client)
    return _global_cache


def get_cache() -> MultiTierCache | None:
    """Get global cache instance"""
    return _global_cache
