"""
Performance optimization utilities for mobile MVP
Caching, async processing, and mobile-specific optimizations
"""
import time
import asyncio
from functools import wraps, lru_cache
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
import structlog
import json
import hashlib

logger = structlog.get_logger()

# Performance monitoring decorator
def measure_time(operation_name: str):
    """Decorator to measure and log operation performance"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                processing_time_ms = (time.time() - start_time) * 1000
                logger.info("Performance measurement", 
                          operation=operation_name,
                          processing_time_ms=processing_time_ms,
                          success=True)
                return result
            except Exception as e:
                processing_time_ms = (time.time() - start_time) * 1000
                logger.error("Performance measurement", 
                           operation=operation_name,
                           processing_time_ms=processing_time_ms,
                           success=False,
                           error=str(e))
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                processing_time_ms = (time.time() - start_time) * 1000
                logger.info("Performance measurement", 
                          operation=operation_name,
                          processing_time_ms=processing_time_ms,
                          success=True)
                return result
            except Exception as e:
                processing_time_ms = (time.time() - start_time) * 1000
                logger.error("Performance measurement", 
                           operation=operation_name,
                           processing_time_ms=processing_time_ms,
                           success=False,
                           error=str(e))
                raise
        
        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper
    return decorator


# Mobile-optimized caching
class MobileCache:
    """Simple in-memory cache optimized for mobile responses"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self._cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = f"{prefix}:{args}:{sorted(kwargs.items())}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get item from cache"""
        if key in self._cache:
            cache_item = self._cache[key]
            if datetime.utcnow() < cache_item['expires_at']:
                return cache_item['data']
            else:
                del self._cache[key]
        return None
    
    def set(self, key: str, data: Any, ttl: Optional[int] = None) -> None:
        """Set item in cache"""
        ttl = ttl or self.default_ttl
        expires_at = datetime.utcnow() + timedelta(seconds=ttl)
        self._cache[key] = {
            'data': data,
            'expires_at': expires_at
        }
    
    def clear_prefix(self, prefix: str) -> None:
        """Clear all cache entries with given prefix"""
        keys_to_delete = [k for k in self._cache.keys() if k.startswith(prefix)]
        for key in keys_to_delete:
            del self._cache[key]
    
    def cache_size(self) -> int:
        """Get current cache size"""
        return len(self._cache)
    
    def cleanup_expired(self) -> int:
        """Remove expired entries, return count removed"""
        now = datetime.utcnow()
        expired_keys = [
            k for k, v in self._cache.items() 
            if now >= v['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)


# Global cache instance
mobile_cache = MobileCache()


def cached_mobile_response(ttl: int = 300, prefix: str = "mobile"):
    """Decorator for caching mobile API responses"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = mobile_cache._generate_key(prefix, *args, **kwargs)
            
            # Try to get from cache
            cached_result = mobile_cache.get(cache_key)
            if cached_result is not None:
                logger.debug("Cache hit", cache_key=cache_key, prefix=prefix)
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs)
            mobile_cache.set(cache_key, result, ttl)
            logger.debug("Cache miss - stored result", cache_key=cache_key, prefix=prefix)
            
            return result
        return wrapper
    return decorator


# Batch processing utilities
class BatchProcessor:
    """Async batch processor for mobile operations"""
    
    def __init__(self, batch_size: int = 50, max_concurrent: int = 5):
        self.batch_size = batch_size
        self.max_concurrent = max_concurrent
    
    async def process_items(self, items: list, processor_func: Callable, **kwargs):
        """Process items in batches with concurrency control"""
        if not items:
            return []
        
        # Split into batches
        batches = [
            items[i:i + self.batch_size] 
            for i in range(0, len(items), self.batch_size)
        ]
        
        # Process batches with concurrency limit
        semaphore = asyncio.Semaphore(self.max_concurrent)
        
        async def process_batch(batch):
            async with semaphore:
                return await processor_func(batch, **kwargs)
        
        # Execute all batches
        batch_results = await asyncio.gather(
            *[process_batch(batch) for batch in batches],
            return_exceptions=True
        )
        
        # Flatten results and handle exceptions
        results = []
        for batch_result in batch_results:
            if isinstance(batch_result, Exception):
                logger.error("Batch processing error", error=str(batch_result))
                continue
            if isinstance(batch_result, list):
                results.extend(batch_result)
            else:
                results.append(batch_result)
        
        return results


# Mobile response compression
class MobileResponseOptimizer:
    """Optimize responses for mobile consumption"""
    
    @staticmethod
    def compress_batch_list(batches: list, fields_to_keep: Optional[list] = None) -> list:
        """Compress batch data for mobile transmission"""
        if not fields_to_keep:
            fields_to_keep = [
                'batch_id', 'sku', 'category', 'quantity', 
                'days_to_expiry', 'urgency_score', 'location'
            ]
        
        compressed = []
        for batch in batches:
            compressed_batch = {
                field: batch.get(field) 
                for field in fields_to_keep 
                if field in batch
            }
            compressed.append(compressed_batch)
        
        return compressed
    
    @staticmethod
    def paginate_response(data: list, page: int = 1, page_size: int = 20) -> Dict[str, Any]:
        """Paginate data for mobile consumption"""
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return {
            'data': data[start_idx:end_idx],
            'pagination': {
                'page': page,
                'page_size': page_size,
                'total_items': len(data),
                'total_pages': (len(data) + page_size - 1) // page_size,
                'has_next': end_idx < len(data),
                'has_previous': page > 1
            }
        }


# Performance monitoring
class PerformanceMonitor:
    """Monitor API performance for mobile optimization"""
    
    def __init__(self):
        self.metrics = {}
        self.slow_threshold_ms = 500  # Mobile target
    
    def record_operation(self, operation: str, duration_ms: float, success: bool):
        """Record operation performance"""
        if operation not in self.metrics:
            self.metrics[operation] = {
                'total_calls': 0,
                'total_duration_ms': 0,
                'success_count': 0,
                'failure_count': 0,
                'slow_calls': 0,
                'fastest_ms': float('inf'),
                'slowest_ms': 0
            }
        
        stats = self.metrics[operation]
        stats['total_calls'] += 1
        stats['total_duration_ms'] += duration_ms
        
        if success:
            stats['success_count'] += 1
        else:
            stats['failure_count'] += 1
        
        if duration_ms > self.slow_threshold_ms:
            stats['slow_calls'] += 1
        
        stats['fastest_ms'] = min(stats['fastest_ms'], duration_ms)
        stats['slowest_ms'] = max(stats['slowest_ms'], duration_ms)
    
    def get_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        summary = {}
        
        for operation, stats in self.metrics.items():
            if stats['total_calls'] > 0:
                summary[operation] = {
                    'avg_duration_ms': stats['total_duration_ms'] / stats['total_calls'],
                    'success_rate': stats['success_count'] / stats['total_calls'],
                    'slow_call_rate': stats['slow_calls'] / stats['total_calls'],
                    'fastest_ms': stats['fastest_ms'] if stats['fastest_ms'] != float('inf') else 0,
                    'slowest_ms': stats['slowest_ms'],
                    'total_calls': stats['total_calls']
                }
        
        return summary


# Global performance monitor
performance_monitor = PerformanceMonitor()


# Async utilities for mobile
async def timeout_after(seconds: float):
    """Timeout decorator for mobile operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                logger.warning("Operation timeout", 
                             function=func.__name__, 
                             timeout_seconds=seconds)
                raise
        return wrapper
    return decorator


# Mobile-optimized database query helpers
def optimize_query_for_mobile(base_query: str, limit: int = 50) -> str:
    """Optimize database queries for mobile performance"""
    # Add LIMIT if not present
    if 'LIMIT' not in base_query.upper():
        base_query += f' LIMIT {limit}'
    
    # Add basic optimization hints
    if 'SELECT' in base_query.upper() and 'ORDER BY' in base_query.upper():
        # Query is already optimized with ordering
        pass
    
    return base_query


# Response compression for mobile
def compress_for_mobile(data: Any, compression_level: str = "standard") -> Any:
    """Compress data for mobile transmission"""
    if compression_level == "aggressive":
        # Remove null values and empty strings
        if isinstance(data, dict):
            return {k: compress_for_mobile(v, compression_level) 
                   for k, v in data.items() 
                   if v is not None and v != ""}
        elif isinstance(data, list):
            return [compress_for_mobile(item, compression_level) 
                   for item in data if item is not None]
    
    elif compression_level == "standard":
        # Basic compression - round numbers, truncate strings
        if isinstance(data, dict):
            compressed = {}
            for k, v in data.items():
                if isinstance(v, float):
                    compressed[k] = round(v, 2)
                elif isinstance(v, str) and len(v) > 100:
                    compressed[k] = v[:97] + "..."
                else:
                    compressed[k] = v
            return compressed
        elif isinstance(data, float):
            return round(data, 2)
    
    return data


# Cache warming for frequently accessed data
async def warm_mobile_cache(store_id: str, read_ops):
    """Pre-warm cache with frequently accessed mobile data"""
    try:
        # Cache store inventory summary
        cache_key = mobile_cache._generate_key("mobile_summary", store_id)
        if not mobile_cache.get(cache_key):
            inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)
            mobile_cache.set(cache_key, inventory_data, ttl=300)
        
        # Cache category weights
        common_categories = ['fresh_produce', 'dairy', 'bakery_fresh', 'meat_fish']
        for category in common_categories:
            cache_key = mobile_cache._generate_key("category_weights", category)
            if not mobile_cache.get(cache_key):
                weights = await read_ops.get_category_weights(category)
                mobile_cache.set(cache_key, weights, ttl=1800)  # 30 min cache
        
        logger.info("Mobile cache warmed", store_id=store_id)
        
    except Exception as e:
        logger.error("Cache warming failed", store_id=store_id, error=str(e))


# Mobile health check
def mobile_performance_health_check() -> Dict[str, Any]:
    """Check mobile performance health"""
    summary = performance_monitor.get_summary()
    cache_stats = {
        'cache_size': mobile_cache.cache_size(),
        'expired_cleaned': mobile_cache.cleanup_expired()
    }
    
    # Identify performance issues
    issues = []
    for operation, stats in summary.items():
        if stats['avg_duration_ms'] > 500:  # Mobile threshold
            issues.append(f"{operation} averaging {stats['avg_duration_ms']:.1f}ms (target: <500ms)")
        if stats['success_rate'] < 0.95:
            issues.append(f"{operation} success rate {stats['success_rate']:.1%} (target: >95%)")
    
    return {
        'performance_summary': summary,
        'cache_statistics': cache_stats,
        'performance_issues': issues,
        'overall_health': 'good' if not issues else 'needs_attention',
        'checked_at': datetime.utcnow().isoformat()
    }