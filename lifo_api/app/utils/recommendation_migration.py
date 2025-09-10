"""
Recommendation Migration Utilities
Handles migration from legacy recommendation formats to standardized FastAPI formats
"""



class RecommendationMigrator:
    """Handles mapping between legacy and FastAPI recommendation formats"""

    # Mapping from legacy recommendations to FastAPI standard
    LEGACY_TO_FASTAPI_MAP: dict[str, str] = {
        # Legacy format -> FastAPI standard
        "immediate_action": "discount_aggressive",
        "high_priority": "discount_aggressive",
        "medium_priority": "discount_moderate",
        "discount_heavily": "discount_aggressive",
        "normal": "maintain",

        # Keep existing FastAPI standards as-is
        "dispose": "dispose",
        "discount_aggressive": "discount_aggressive",
        "discount_moderate": "discount_moderate",
        "alert": "alert",
        "monitor": "monitor",
        "maintain": "maintain",
    }

    # Reverse mapping for compatibility
    FASTAPI_TO_DISPLAY_MAP: dict[str, str] = {
        "dispose": "Dispose Immediately",
        "discount_aggressive": "Apply Heavy Discount",
        "discount_moderate": "Apply Moderate Discount",
        "alert": "Monitor Closely",
        "monitor": "Routine Monitoring",
        "maintain": "No Action Needed",
    }

    # Priority mapping for sorting
    PRIORITY_ORDER: dict[str, int] = {
        "dispose": 1,
        "discount_aggressive": 2,
        "discount_moderate": 3,
        "alert": 4,
        "monitor": 5,
        "maintain": 6,
    }

    @classmethod
    def migrate_recommendation(cls, legacy_recommendation: str) -> str:
        """
        Migrate a legacy recommendation to FastAPI standard format
        
        Args:
            legacy_recommendation: The legacy recommendation value
            
        Returns:
            str: Standardized FastAPI recommendation
        """
        if not legacy_recommendation:
            return "maintain"

        # Clean the input
        cleaned = legacy_recommendation.strip().lower()

        # Check direct mapping
        if cleaned in cls.LEGACY_TO_FASTAPI_MAP:
            return cls.LEGACY_TO_FASTAPI_MAP[cleaned]

        # Fuzzy matching for variations
        if "immediate" in cleaned or "urgent" in cleaned:
            return "discount_aggressive"
        elif "high" in cleaned and "priority" in cleaned:
            return "discount_aggressive"
        elif "medium" in cleaned and "priority" in cleaned:
            return "discount_moderate"
        elif "discount" in cleaned and ("heavy" in cleaned or "heavily" in cleaned):
            return "discount_aggressive"
        elif "discount" in cleaned and "moderate" in cleaned:
            return "discount_moderate"
        elif "normal" in cleaned or "maintain" in cleaned:
            return "maintain"
        elif "monitor" in cleaned:
            return "monitor"
        elif "alert" in cleaned:
            return "alert"
        elif "dispose" in cleaned:
            return "dispose"

        # Default fallback
        return "maintain"

    @classmethod
    def get_display_text(cls, recommendation: str) -> str:
        """
        Get user-friendly display text for a recommendation
        
        Args:
            recommendation: FastAPI standard recommendation
            
        Returns:
            str: Human-readable display text
        """
        # First migrate if it's legacy format
        standard_recommendation = cls.migrate_recommendation(recommendation)

        return cls.FASTAPI_TO_DISPLAY_MAP.get(
            standard_recommendation,
            recommendation.replace("_", " ").title()
        )

    @classmethod
    def get_priority_score(cls, recommendation: str) -> int:
        """
        Get priority score for sorting (lower = higher priority)
        
        Args:
            recommendation: Recommendation to score
            
        Returns:
            int: Priority score (1 = highest priority)
        """
        # First migrate if it's legacy format
        standard_recommendation = cls.migrate_recommendation(recommendation)

        return cls.PRIORITY_ORDER.get(standard_recommendation, 99)

    @classmethod
    def get_action_category(cls, recommendation: str) -> str:
        """
        Categorize recommendation into action type
        
        Args:
            recommendation: Recommendation to categorize
            
        Returns:
            str: Action category (critical, action_needed, monitor, normal)
        """
        standard_recommendation = cls.migrate_recommendation(recommendation)

        if standard_recommendation in ["dispose"]:
            return "critical"
        elif standard_recommendation in ["discount_aggressive"]:
            return "action_needed"
        elif standard_recommendation in ["discount_moderate", "alert"]:
            return "monitor"
        else:
            return "normal"

    @classmethod
    def should_show_discount_suggestion(cls, recommendation: str) -> bool:
        """
        Check if recommendation should show discount suggestions
        
        Args:
            recommendation: Recommendation to check
            
        Returns:
            bool: True if discount suggestions should be shown
        """
        standard_recommendation = cls.migrate_recommendation(recommendation)
        return standard_recommendation in ["discount_aggressive", "discount_moderate"]

    @classmethod
    def get_suggested_discount_range(cls, recommendation: str, margin_percent: float) -> dict[str, int] | None:
        """
        Get suggested discount range based on recommendation and margin
        
        Args:
            recommendation: FastAPI recommendation
            margin_percent: Product margin percentage
            
        Returns:
            Optional[Dict[str, int]]: Dict with 'min' and 'max' discount percentages
        """
        standard_recommendation = cls.migrate_recommendation(recommendation)

        if not cls.should_show_discount_suggestion(standard_recommendation):
            return None

        # Calculate safe discount range based on margin
        max_safe_discount = min(int(margin_percent * 0.8), 60)  # Don't go below 20% margin

        if standard_recommendation == "discount_aggressive":
            return {
                "min": min(20, max_safe_discount),
                "max": max_safe_discount
            }
        elif standard_recommendation == "discount_moderate":
            return {
                "min": 5,
                "max": min(25, max_safe_discount)
            }

        return None


# Utility functions for easy importing
def migrate_recommendation(recommendation: str) -> str:
    """Convenience function for migrating recommendations"""
    return RecommendationMigrator.migrate_recommendation(recommendation)


def get_display_text(recommendation: str) -> str:
    """Convenience function for getting display text"""
    return RecommendationMigrator.get_display_text(recommendation)


def get_priority_score(recommendation: str) -> int:
    """Convenience function for getting priority score"""
    return RecommendationMigrator.get_priority_score(recommendation)
