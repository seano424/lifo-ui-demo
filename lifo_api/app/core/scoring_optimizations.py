"""
Scoring Algorithm Optimizations for LIFO AI Engine
High-priority enhancements that can be immediately integrated
"""

import hashlib
import json
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Any

import numpy as np
import structlog

logger = structlog.get_logger()


class SeasonalAdjustmentService:
    """
    Dynamic seasonal adjustment for scoring based on category and time of year
    Priority 1 Enhancement - Low effort, high impact
    """
    
    def __init__(self):
        self.logger = structlog.get_logger().bind(component="seasonal_adjustment")
        
        # Seasonal patterns by category
        self.seasonal_patterns = {
            "beverages": {
                "summer_boost": {"months": [6, 7, 8], "multiplier": 1.2},
                "winter_decline": {"months": [12, 1, 2], "multiplier": 0.9}
            },
            "bakery_fresh": {
                "holiday_boost": {"months": [11, 12], "multiplier": 1.15},
                "summer_decline": {"months": [7, 8], "multiplier": 0.95}
            },
            "fresh_produce": {
                "spring_boost": {"months": [3, 4, 5], "multiplier": 1.1},
                "winter_decline": {"months": [12, 1, 2], "multiplier": 0.85}
            },
            "frozen_foods": {
                "summer_boost": {"months": [6, 7, 8], "multiplier": 1.1},
                "spring_decline": {"months": [3, 4, 5], "multiplier": 0.95}
            },
            "dairy_eggs": {
                "holiday_boost": {"months": [11, 12], "multiplier": 1.1},
                "summer_decline": {"months": [7, 8], "multiplier": 0.9}
            },
            "spices_condiments": {
                "holiday_boost": {"months": [11, 12], "multiplier": 1.2},
                "summer_boost": {"months": [6, 7], "multiplier": 1.1}
            }
        }
    
    def calculate_seasonal_adjustment(
        self, 
        category: str, 
        current_date: datetime | None = None
    ) -> float:
        """
        Calculate seasonal adjustment factor for a category
        
        Args:
            category: Product category code
            current_date: Date to calculate adjustment for (defaults to now)
            
        Returns:
            Multiplier between 0.8 and 1.2
        """
        if current_date is None:
            current_date = datetime.now()
        
        month = current_date.month
        pattern = self.seasonal_patterns.get(category)
        
        if not pattern:
            return 1.0  # No adjustment for unknown categories
        
        for period in pattern.values():
            if month in period["months"]:
                self.logger.debug(
                    "Applying seasonal adjustment",
                    category=category,
                    month=month,
                    multiplier=period["multiplier"]
                )
                return period["multiplier"]
        
        return 1.0  # No adjustment for this month
    
    def apply_seasonal_adjustment(
        self,
        base_score: float,
        category: str,
        current_date: datetime | None = None
    ) -> float:
        """
        Apply seasonal adjustment to a base score
        
        Args:
            base_score: Original composite score
            category: Product category
            current_date: Date for adjustment calculation
            
        Returns:
            Adjusted score (capped at 1.0)
        """
        adjustment = self.calculate_seasonal_adjustment(category, current_date)
        adjusted_score = base_score * adjustment
        
        # Apply smoothing to prevent drastic changes
        if adjustment > 1.0:
            # For boosts, use a softer curve
            adjusted_score = base_score + (adjusted_score - base_score) * 0.7
        elif adjustment < 1.0:
            # For declines, preserve urgency for high scores
            if base_score >= 0.7:
                adjusted_score = base_score + (adjusted_score - base_score) * 0.5
        
        return min(1.0, max(0.0, adjusted_score))


class EnhancedVelocityAnalyzer:
    """
    Enhanced velocity analysis with trend detection
    Priority 4 Enhancement - Medium effort, high impact
    """
    
    def __init__(self):
        self.logger = structlog.get_logger().bind(component="velocity_analyzer")
        
        # Category-specific volatility factors
        self.volatility_factors = {
            "fresh_produce": 1.2,
            "specialty_items": 1.3,
            "fresh_meat_fish": 1.15,
            "bakery_fresh": 1.1,
            "dairy_eggs": 1.05,
            "canned_jarred": 0.8,
            "dry_goods": 0.9,
            "spices_condiments": 0.85,
            "frozen_foods": 0.95
        }
    
    def calculate_sales_trend(
        self,
        historical_sales: list[float],
        lookback_days: int = 7
    ) -> float:
        """
        Calculate sales trend from historical data
        
        Args:
            historical_sales: Daily sales history (most recent last)
            lookback_days: Days to analyze for trend
            
        Returns:
            Trend value between -1.0 (declining) and 1.0 (growing)
        """
        if not historical_sales or len(historical_sales) < 3:
            return 0.0  # No trend data available
        
        # Use recent data for trend
        recent_sales = historical_sales[-lookback_days:] if len(historical_sales) > lookback_days else historical_sales
        
        if len(recent_sales) < 2:
            return 0.0
        
        # Calculate simple linear regression slope
        x = np.arange(len(recent_sales))
        y = np.array(recent_sales)
        
        # Avoid division by zero
        if np.std(y) == 0:
            return 0.0
        
        # Calculate correlation coefficient as trend indicator
        correlation = np.corrcoef(x, y)[0, 1] if len(x) > 1 else 0.0
        
        # Calculate relative change
        avg_early = np.mean(y[:len(y)//2]) if len(y) > 1 else y[0]
        avg_late = np.mean(y[len(y)//2:]) if len(y) > 1 else y[-1]
        
        if avg_early > 0:
            relative_change = (avg_late - avg_early) / avg_early
        else:
            relative_change = 0.0
        
        # Combine correlation and relative change
        trend = (correlation * 0.6 + np.clip(relative_change, -1, 1) * 0.4)
        
        return float(np.clip(trend, -1.0, 1.0))
    
    def calculate_velocity_score_enhanced(
        self,
        current_quantity: float,
        avg_daily_sales: float,
        days_to_expiry: int,
        category: str,
        historical_sales: list[float] | None = None
    ) -> tuple[float, dict[str, Any]]:
        """
        Enhanced velocity scoring with trend analysis
        
        Returns:
            Tuple of (score, metadata)
        """
        # Calculate base velocity score
        if days_to_expiry <= 0:
            return 1.0, {"reason": "expired"}
        
        if avg_daily_sales <= 0:
            base_score = 0.8
            sales_trend = 0.0
        else:
            days_to_sell = current_quantity / avg_daily_sales
            
            # Calculate base score
            if days_to_sell <= days_to_expiry * 0.7:
                base_score = 0.1
            elif days_to_sell <= days_to_expiry * 0.9:
                base_score = 0.3
            elif days_to_sell <= days_to_expiry:
                base_score = 0.6
            else:
                excess_ratio = (days_to_sell - days_to_expiry) / days_to_expiry
                base_score = min(1.0, 0.8 + excess_ratio * 0.2)
            
            # Calculate trend if historical data available
            sales_trend = self.calculate_sales_trend(historical_sales) if historical_sales else 0.0
        
        # Apply trend adjustment
        if sales_trend < -0.3:
            trend_multiplier = 1.3  # Declining sales increase urgency
        elif sales_trend > 0.3:
            trend_multiplier = 0.8  # Growing sales decrease urgency  
        else:
            trend_multiplier = 1.0
        
        # Apply volatility adjustment
        volatility_multiplier = self.volatility_factors.get(category, 1.0)
        
        # Calculate final score
        enhanced_score = base_score * trend_multiplier * volatility_multiplier
        enhanced_score = min(1.0, max(0.0, enhanced_score))
        
        metadata = {
            "base_score": base_score,
            "sales_trend": sales_trend,
            "trend_multiplier": trend_multiplier,
            "volatility_multiplier": volatility_multiplier,
            "days_to_sell": current_quantity / avg_daily_sales if avg_daily_sales > 0 else None
        }
        
        return enhanced_score, metadata


class IntelligentScoringCache:
    """
    Intelligent caching for scoring results with context-aware invalidation
    Priority 3 Enhancement - Medium effort, high impact
    """
    
    def __init__(self, max_size: int = 10000):
        self.cache = {}
        self.cache_metadata = {}
        self.cache_hits = defaultdict(int)
        self.cache_misses = defaultdict(int)
        self.access_history = deque(maxlen=max_size * 2)
        self.max_size = max_size
        self.logger = structlog.get_logger().bind(component="scoring_cache")
    
    def _generate_cache_key(self, batch_id: str, context: dict) -> str:
        """Generate a cache key from batch ID and context"""
        # Include relevant context in cache key
        context_str = json.dumps({
            "days_to_expiry": context.get("days_to_expiry"),
            "current_quantity": context.get("current_quantity"),
            "store_id": context.get("store_id"),
            "category": context.get("category")
        }, sort_keys=True)
        
        hash_input = f"{batch_id}_{context_str}"
        return hashlib.md5(hash_input.encode()).hexdigest()
    
    def get_cached_score(
        self, 
        batch_id: str, 
        context: dict
    ) -> dict[str, Any] | None:
        """
        Retrieve cached score with freshness validation
        
        Args:
            batch_id: Batch identifier
            context: Scoring context including urgency level
            
        Returns:
            Cached scoring result or None if not valid
        """
        cache_key = self._generate_cache_key(batch_id, context)
        
        if cache_key not in self.cache:
            self.cache_misses[batch_id] += 1
            return None
        
        cached_entry = self.cache[cache_key]
        cached_metadata = self.cache_metadata[cache_key]
        
        # Determine cache validity based on urgency
        urgency_level = context.get("urgency_level", "low")
        days_to_expiry = context.get("days_to_expiry", 30)
        
        # Dynamic cache TTL based on urgency
        if days_to_expiry <= 0:
            max_age = timedelta(minutes=1)  # Expired items need frequent updates
        elif urgency_level == "critical" or days_to_expiry <= 1:
            max_age = timedelta(minutes=5)
        elif urgency_level == "high" or days_to_expiry <= 3:
            max_age = timedelta(minutes=15)
        elif urgency_level == "medium" or days_to_expiry <= 7:
            max_age = timedelta(minutes=30)
        else:
            max_age = timedelta(hours=1)
        
        # Check cache age
        cache_age = datetime.now() - cached_metadata["timestamp"]
        if cache_age > max_age:
            # Cache expired
            self.cache_misses[batch_id] += 1
            self._evict_entry(cache_key)
            return None
        
        # Valid cache hit
        self.cache_hits[batch_id] += 1
        self.access_history.append({
            "batch_id": batch_id,
            "timestamp": datetime.now(),
            "hit": True
        })
        
        self.logger.debug(
            "Cache hit",
            batch_id=batch_id,
            cache_age_seconds=cache_age.total_seconds(),
            urgency_level=urgency_level
        )
        
        return cached_entry
    
    def store_score(
        self,
        batch_id: str,
        context: dict,
        score_result: dict
    ):
        """
        Store scoring result in cache
        
        Args:
            batch_id: Batch identifier
            context: Scoring context
            score_result: Scoring result to cache
        """
        cache_key = self._generate_cache_key(batch_id, context)
        
        # Implement LRU eviction if cache is full
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        self.cache[cache_key] = score_result
        self.cache_metadata[cache_key] = {
            "timestamp": datetime.now(),
            "batch_id": batch_id,
            "access_count": 0,
            "urgency_level": context.get("urgency_level", "low")
        }
        
        self.logger.debug(
            "Score cached",
            batch_id=batch_id,
            cache_size=len(self.cache)
        )
    
    def _evict_entry(self, cache_key: str):
        """Remove an entry from cache"""
        if cache_key in self.cache:
            del self.cache[cache_key]
            del self.cache_metadata[cache_key]
    
    def _evict_lru(self):
        """Evict least recently used entries"""
        # Find oldest entries with low urgency
        candidates = []
        for key, metadata in self.cache_metadata.items():
            if metadata["urgency_level"] in ["low", "none"]:
                candidates.append((key, metadata["timestamp"]))
        
        if candidates:
            # Sort by timestamp and evict oldest
            candidates.sort(key=lambda x: x[1])
            self._evict_entry(candidates[0][0])
        else:
            # If no low urgency items, evict oldest overall
            oldest_key = min(self.cache_metadata.keys(), 
                           key=lambda k: self.cache_metadata[k]["timestamp"])
            self._evict_entry(oldest_key)
    
    def get_cache_statistics(self) -> dict[str, Any]:
        """
        Get cache performance statistics
        
        Returns:
            Dictionary with cache metrics
        """
        total_hits = sum(self.cache_hits.values())
        total_misses = sum(self.cache_misses.values())
        total_requests = total_hits + total_misses
        
        hit_rate = total_hits / total_requests if total_requests > 0 else 0
        
        # Analyze hot and cold items
        hot_items = sorted(
            self.cache_hits.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]
        
        cold_items = sorted(
            self.cache_misses.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            "cache_size": len(self.cache),
            "total_hits": total_hits,
            "total_misses": total_misses,
            "hit_rate": hit_rate,
            "hot_items": hot_items,
            "cold_items": cold_items,
            "memory_usage_mb": len(str(self.cache)) / (1024 * 1024)  # Approximate
        }
    
    def clear_cache(self):
        """Clear all cached entries"""
        self.cache.clear()
        self.cache_metadata.clear()
        self.logger.info("Cache cleared")


class EnhancedBulkDetector:
    """
    Enhanced bulk quantity detection with velocity pattern analysis
    Priority 2 Enhancement - Low effort, high impact
    """
    
    def __init__(self):
        self.logger = structlog.get_logger().bind(component="bulk_detector")
        
        # Category-specific bulk thresholds
        self.bulk_thresholds = {
            "specialty_items": 10,
            "fresh_meat_fish": 15,
            "fresh_produce": 30,
            "bakery_fresh": 25,
            "dairy_eggs": 20,
            "deli_prepared": 15,
            "frozen_foods": 40,
            "beverages": 40,
            "dry_goods": 50,
            "canned_jarred": 60,
            "spices_condiments": 20,
            "pantry_staples": 50
        }
        
        # Velocity estimation factors by category
        self.velocity_factors = {
            "specialty_items": 0.02,  # Very slow moving
            "spices_condiments": 0.03,
            "canned_jarred": 0.04,
            "dry_goods": 0.05,
            "pantry_staples": 0.06,
            "frozen_foods": 0.08,
            "beverages": 0.10,
            "dairy_eggs": 0.12,
            "bakery_fresh": 0.15,
            "deli_prepared": 0.18,
            "fresh_produce": 0.20,
            "fresh_meat_fish": 0.15
        }
    
    def detect_bulk_mismatch(
        self,
        current_quantity: float,
        category: str,
        days_to_expiry: int,
        historical_velocity: dict | None = None,
        avg_daily_sales: float | None = None
    ) -> dict[str, Any]:
        """
        Detect bulk quantity mismatches that require special handling
        
        Args:
            current_quantity: Current inventory quantity
            category: Product category
            days_to_expiry: Days until expiration
            historical_velocity: Historical sales velocity data
            avg_daily_sales: Average daily sales rate
            
        Returns:
            Dictionary with bulk detection results and recommendations
        """
        threshold = self.bulk_thresholds.get(category, 25)
        
        # Check if quantity meets bulk threshold
        is_bulk = current_quantity >= threshold
        
        # For medium quantities with urgent expiry, lower the threshold
        if not is_bulk and days_to_expiry <= 2:
            adjusted_threshold = threshold * 0.6
            is_bulk = current_quantity >= adjusted_threshold
        
        if not is_bulk:
            return {
                "is_bulk_mismatch": False,
                "quantity": current_quantity,
                "threshold": threshold
            }
        
        # Calculate velocity-based sellout probability
        if avg_daily_sales and avg_daily_sales > 0:
            estimated_daily_sales = avg_daily_sales
        elif historical_velocity:
            # Use historical percentiles if available
            estimated_daily_sales = historical_velocity.get("p50", 
                current_quantity * self.velocity_factors.get(category, 0.1))
        else:
            # Fallback to category-based estimation
            estimated_daily_sales = current_quantity * self.velocity_factors.get(category, 0.1)
        
        # Calculate sellout days
        sellout_days = current_quantity / estimated_daily_sales if estimated_daily_sales > 0 else 999
        
        # Calculate sellout probability
        if sellout_days <= days_to_expiry * 0.7:
            sellout_probability = 0.9  # Very likely to sell
        elif sellout_days <= days_to_expiry:
            sellout_probability = 0.5  # Moderate chance
        elif sellout_days <= days_to_expiry * 1.5:
            sellout_probability = 0.2  # Low chance
        else:
            sellout_probability = 0.05  # Very unlikely
        
        # Determine urgency and recommendations
        excess_days = max(0, sellout_days - days_to_expiry)
        excess_ratio = excess_days / days_to_expiry if days_to_expiry > 0 else 10
        
        if excess_ratio > 2:
            urgency = "critical"
            recommended_action = "donate"
            recommended_percentage = min(80, int((1 - sellout_probability) * 100))
        elif excess_ratio > 1:
            urgency = "high"
            recommended_action = "donate" if sellout_probability < 0.3 else "discount"
            recommended_percentage = min(60, int((1 - sellout_probability) * 80))
        elif excess_ratio > 0.5:
            urgency = "medium"
            recommended_action = "discount"
            recommended_percentage = 30
        else:
            urgency = "low"
            recommended_action = "monitor"
            recommended_percentage = 0
        
        result = {
            "is_bulk_mismatch": True,
            "quantity": current_quantity,
            "threshold": threshold,
            "sellout_days": sellout_days,
            "days_to_expiry": days_to_expiry,
            "sellout_probability": sellout_probability,
            "excess_days": excess_days,
            "excess_ratio": excess_ratio,
            "urgency": urgency,
            "recommended_action": recommended_action,
            "recommended_percentage": recommended_percentage,
            "estimated_daily_sales": estimated_daily_sales
        }
        
        self.logger.info(
            "Bulk mismatch detected",
            category=category,
            quantity=current_quantity,
            sellout_days=sellout_days,
            days_to_expiry=days_to_expiry,
            urgency=urgency
        )
        
        return result
    
    def calculate_optimal_split(
        self,
        total_quantity: float,
        days_to_expiry: int,
        category: str
    ) -> dict[str, Any]:
        """
        Calculate optimal split between donation and discount for bulk quantities
        
        Returns:
            Dictionary with split recommendations
        """
        threshold = self.bulk_thresholds.get(category, 25)
        
        if total_quantity < threshold:
            return {
                "should_split": False,
                "total_quantity": total_quantity
            }
        
        # Calculate optimal split based on expiry urgency
        if days_to_expiry <= 1:
            # Very urgent - maximize donation
            donate_percentage = 70
            discount_percentage = 30
        elif days_to_expiry <= 3:
            # Urgent - balanced approach
            donate_percentage = 50
            discount_percentage = 50
        elif days_to_expiry <= 7:
            # Medium urgency - favor discount
            donate_percentage = 30
            discount_percentage = 70
        else:
            # Low urgency - mostly discount
            donate_percentage = 20
            discount_percentage = 80
        
        donate_quantity = total_quantity * (donate_percentage / 100)
        discount_quantity = total_quantity * (discount_percentage / 100)
        
        return {
            "should_split": True,
            "total_quantity": total_quantity,
            "donate_quantity": donate_quantity,
            "donate_percentage": donate_percentage,
            "discount_quantity": discount_quantity,
            "discount_percentage": discount_percentage,
            "reasoning": f"Bulk quantity split for {days_to_expiry} days to expiry"
        }


class OptimizedScoringOrchestrator:
    """
    Orchestrator that combines all optimizations for enhanced scoring
    """
    
    def __init__(self):
        self.seasonal_service = SeasonalAdjustmentService()
        self.velocity_analyzer = EnhancedVelocityAnalyzer()
        self.cache = IntelligentScoringCache()
        self.bulk_detector = EnhancedBulkDetector()
        self.logger = structlog.get_logger().bind(component="scoring_orchestrator")
    
    def score_with_optimizations(
        self,
        batch_data: dict[str, Any],
        base_scores: dict[str, float],
        historical_data: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """
        Apply all optimizations to scoring
        
        Args:
            batch_data: Batch information
            base_scores: Base scoring results (expiry, velocity, margin)
            historical_data: Optional historical sales data
            
        Returns:
            Enhanced scoring result with optimization metadata
        """
        batch_id = batch_data.get("batch_id")
        category = batch_data.get("category", "general")
        days_to_expiry = batch_data.get("days_to_expiry", 30)
        
        # Check cache first
        cache_context = {
            "days_to_expiry": days_to_expiry,
            "current_quantity": batch_data.get("current_quantity"),
            "store_id": batch_data.get("store_id"),
            "category": category,
            "urgency_level": self._determine_urgency_level(days_to_expiry, base_scores.get("composite_score", 0))
        }
        
        cached_result = self.cache.get_cached_score(batch_id, cache_context)
        if cached_result:
            return cached_result
        
        # Apply seasonal adjustment
        base_composite = base_scores.get("composite_score", 0)
        seasonally_adjusted_score = self.seasonal_service.apply_seasonal_adjustment(
            base_composite, category
        )
        
        # Enhanced velocity analysis if historical data available
        if historical_data and historical_data.get("sales_history"):
            enhanced_velocity, velocity_metadata = self.velocity_analyzer.calculate_velocity_score_enhanced(
                current_quantity=batch_data.get("current_quantity", 0),
                avg_daily_sales=batch_data.get("avg_daily_sales", 1),
                days_to_expiry=days_to_expiry,
                category=category,
                historical_sales=historical_data.get("sales_history")
            )
            
            # Recalculate composite with enhanced velocity
            composite_score = (
                base_scores.get("expiry_score", 0) * 0.5 +
                enhanced_velocity * 0.3 +
                base_scores.get("margin_score", 0) * 0.2
            )
            composite_score = self.seasonal_service.apply_seasonal_adjustment(
                composite_score, category
            )
        else:
            composite_score = seasonally_adjusted_score
            velocity_metadata = {}
            enhanced_velocity = base_scores.get("velocity_score", 0)
        
        # Bulk detection
        bulk_analysis = self.bulk_detector.detect_bulk_mismatch(
            current_quantity=batch_data.get("current_quantity", 0),
            category=category,
            days_to_expiry=days_to_expiry,
            historical_velocity=historical_data.get("velocity_stats") if historical_data else None,
            avg_daily_sales=batch_data.get("avg_daily_sales")
        )
        
        # Adjust score based on bulk detection
        if bulk_analysis["is_bulk_mismatch"]:
            if bulk_analysis["urgency"] == "critical":
                composite_score = max(composite_score, 0.85)
            elif bulk_analysis["urgency"] == "high":
                composite_score = max(composite_score, 0.7)
        
        # Prepare enhanced result
        enhanced_result = {
            "batch_id": batch_id,
            "composite_score": composite_score,
            "base_composite_score": base_composite,
            "expiry_score": base_scores.get("expiry_score", 0),
            "velocity_score": enhanced_velocity,
            "margin_score": base_scores.get("margin_score", 0),
            "seasonal_adjustment": composite_score / base_composite if base_composite > 0 else 1.0,
            "velocity_metadata": velocity_metadata,
            "bulk_analysis": bulk_analysis,
            "optimization_metadata": {
                "seasonal_applied": True,
                "velocity_enhanced": bool(velocity_metadata),
                "bulk_detected": bulk_analysis["is_bulk_mismatch"],
                "cached": False
            },
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache the result
        self.cache.store_score(batch_id, cache_context, enhanced_result)
        
        return enhanced_result
    
    def _determine_urgency_level(self, days_to_expiry: int, composite_score: float) -> str:
        """Determine urgency level for caching purposes"""
        if days_to_expiry <= 0 or composite_score >= 0.9:
            return "critical"
        elif days_to_expiry <= 1 or composite_score >= 0.8:
            return "high"
        elif days_to_expiry <= 3 or composite_score >= 0.6:
            return "medium"
        elif days_to_expiry <= 7 or composite_score >= 0.4:
            return "low"
        else:
            return "none"
    
    def get_optimization_metrics(self) -> dict[str, Any]:
        """Get metrics about optimization performance"""
        return {
            "cache_statistics": self.cache.get_cache_statistics(),
            "optimizations_active": {
                "seasonal_adjustment": True,
                "enhanced_velocity": True,
                "intelligent_caching": True,
                "bulk_detection": True
            },
            "timestamp": datetime.now().isoformat()
        }


# Factory function for creating orchestrator
def create_optimized_scorer() -> OptimizedScoringOrchestrator:
    """Create an optimized scoring orchestrator instance"""
    return OptimizedScoringOrchestrator()