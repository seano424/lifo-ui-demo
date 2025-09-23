"""
Centralized Category Mapping Service
Consolidates all category mapping logic across CSV processing modules
"""

from typing import Any, Dict, List, Optional

import structlog
from sqlalchemy import text

# Import database operations for category resolution
try:
    from app.database.connection import get_db_sync
except ImportError:
    # Fallback for testing or standalone usage
    get_db_sync = None

logger = structlog.get_logger()


class CategoryMappingService:
    """
    Centralized category mapping service
    Consolidates duplicate category mapping logic from multiple modules
    """

    # Consolidated category mappings from all modules
    CATEGORY_MAPPING = {
        # Fresh produce
        "produce": "fresh_produce",
        "fruits": "fresh_produce",
        "vegetables": "fresh_produce",
        "légumes": "fresh_produce",
        "fruits et légumes": "fresh_produce",
        "fresh": "fresh_produce",
        "organic": "fresh_produce",
        
        # Meat and fish
        "meat": "fresh_meat_fish",
        "fish": "fresh_meat_fish", 
        "seafood": "fresh_meat_fish",
        "poultry": "fresh_meat_fish",
        "viande": "fresh_meat_fish",
        "poisson": "fresh_meat_fish",
        "chicken": "fresh_meat_fish",
        "beef": "fresh_meat_fish",
        "pork": "fresh_meat_fish",
        
        # Dairy and eggs
        "dairy": "dairy_eggs",
        "milk": "dairy_eggs",
        "cheese": "dairy_eggs",
        "yogurt": "dairy_eggs",
        "yoghurt": "dairy_eggs",
        "eggs": "dairy_eggs",
        "produits laitiers": "dairy_eggs",
        "lait": "dairy_eggs",
        "butter": "dairy_eggs",
        "cream": "dairy_eggs",
        
        # Bakery
        "bakery": "bakery_fresh",
        "bread": "bakery_fresh",
        "pastry": "bakery_fresh",
        "boulangerie": "bakery_fresh",
        "pain": "bakery_fresh",
        "cake": "bakery_fresh",
        "muffin": "bakery_fresh",
        "croissant": "bakery_fresh",
        
        # Frozen foods
        "frozen": "frozen_foods",
        "frozen foods": "frozen_foods",
        "surgelé": "frozen_foods",
        "congelé": "frozen_foods",
        "ice cream": "frozen_foods",
        "frozen vegetables": "frozen_foods",
        "frozen meals": "frozen_foods",
        
        # Deli and prepared
        "deli": "deli_prepared",
        "prepared": "deli_prepared",
        "ready meals": "deli_prepared",
        "sandwiches": "deli_prepared",
        "salads": "deli_prepared",
        "cooked": "deli_prepared",
        
        # Chilled packaged
        "chilled": "chilled_packaged",
        "packaged": "chilled_packaged",
        "refrigerated": "chilled_packaged",
        "cold": "chilled_packaged",
        
        # Canned and jarred
        "canned": "canned_jarred",
        "jarred": "canned_jarred",
        "tinned": "canned_jarred",
        "preserved": "canned_jarred",
        "jars": "canned_jarred",
        "cans": "canned_jarred",
        "conserve": "canned_jarred",
        
        # Dry goods
        "dry": "dry_goods",
        "dry goods": "dry_goods",
        "grains": "dry_goods",
        "rice": "dry_goods",
        "pasta": "dry_goods",
        "cereals": "dry_goods",
        "flour": "dry_goods",
        "beans": "dry_goods",
        "lentils": "dry_goods",
        
        # Beverages
        "beverages": "beverages",
        "drinks": "beverages",
        "boissons": "beverages",
        "water": "beverages",
        "juice": "beverages",
        "soda": "beverages",
        "coffee": "beverages",
        "tea": "beverages",
        "wine": "beverages",
        "beer": "beverages",
        
        # Spices and condiments
        "spices": "spices_condiments",
        "condiments": "spices_condiments",
        "herbs": "spices_condiments",
        "sauces": "spices_condiments",
        "dressing": "spices_condiments",
        "seasoning": "spices_condiments",
        "salt": "spices_condiments",
        "pepper": "spices_condiments",
        "oil": "spices_condiments",
        "vinegar": "spices_condiments",
        
        # Pantry staples
        "pantry": "pantry_staples",
        "staples": "pantry_staples",
        "basics": "pantry_staples",
        "essentials": "pantry_staples",
        "baking": "pantry_staples",
        "sugar": "pantry_staples",
        
        # Bulk items
        "bulk": "bulk_items",
        "wholesale": "bulk_items",
        "large": "bulk_items",
        "family size": "bulk_items",
        
        # Specialty items
        "specialty": "specialty_items",
        "gourmet": "specialty_items",
        "organic": "specialty_items",
        "artisan": "specialty_items",
        "premium": "specialty_items",
        "imported": "specialty_items",
        
        # Household and other
        "general": "household_other",
        "other": "household_other",
        "household": "household_other",
        "cleaning": "household_other",
        "personal care": "household_other",
        "toiletries": "household_other",
        "office": "household_other",
        "miscellaneous": "household_other",
        "misc": "household_other",
        
        # Legacy mappings for backward compatibility
        "dairy": "dairy_eggs",
        "frozen": "frozen_foods",
        "bakery": "bakery_fresh",
        "produce": "fresh_produce",
        "meat": "fresh_meat_fish",
        "general": "household_other",
        "pantry": "pantry_staples",
        "canned": "canned_jarred",
        "spices": "spices_condiments",
        "bulk": "bulk_items",
    }

    # Shelf life mapping (days) for categories
    SHELF_LIFE_MAPPING = {
        "fresh_produce": 7,
        "fresh_meat_fish": 3,
        "bakery_fresh": 2,
        "dairy_eggs": 14,
        "deli_prepared": 3,
        "frozen_foods": 365,
        "chilled_packaged": 21,
        "pantry_staples": 730,
        "canned_jarred": 1095,
        "dry_goods": 365,
        "beverages": 180,
        "spices_condiments": 1095,
        "household_other": 180,
        "specialty_items": 90,
        "bulk_items": 365,
    }

    # Risk levels for categories (for LIFO scoring)
    RISK_LEVELS = {
        "fresh_produce": "high",
        "fresh_meat_fish": "very_high",
        "bakery_fresh": "very_high", 
        "dairy_eggs": "high",
        "deli_prepared": "very_high",
        "frozen_foods": "low",
        "chilled_packaged": "medium",
        "pantry_staples": "low",
        "canned_jarred": "very_low",
        "dry_goods": "low",
        "beverages": "medium",
        "spices_condiments": "very_low",
        "household_other": "low",
        "specialty_items": "medium",
        "bulk_items": "low",
    }

    def __init__(self):
        self.logger = logger.bind(component="category_mapper")
        self._category_cache: Dict[str, str] = {}  # category_code -> category_uuid cache
        self._reverse_cache: Dict[str, str] = {}   # category_uuid -> category_code cache

    def map_category(self, raw_category: str) -> str:
        """
        Map raw category string to standardized category code
        
        Args:
            raw_category: Raw category from CSV
            
        Returns:
            Standardized category code
        """
        if not raw_category:
            return "dry_goods"  # Default fallback
        
        category_str = str(raw_category).lower().strip()
        
        # Direct mapping check
        if category_str in self.CATEGORY_MAPPING:
            return self.CATEGORY_MAPPING[category_str]
        
        # Partial matching for flexibility
        for key, value in self.CATEGORY_MAPPING.items():
            if key in category_str or category_str in key:
                return value
        
        # Advanced fuzzy matching
        mapped_category = self._fuzzy_match_category(category_str)
        if mapped_category:
            return mapped_category
        
        # Default fallback
        self.logger.warning(
            "Category mapping not found, using default",
            raw_category=raw_category,
            fallback="dry_goods"
        )
        return "dry_goods"

    def _fuzzy_match_category(self, category_str: str) -> Optional[str]:
        """
        Perform fuzzy matching for category strings
        
        Args:
            category_str: Category string to match
            
        Returns:
            Matched category code or None
        """
        # Split into words for better matching
        words = category_str.split()
        
        for word in words:
            if word in self.CATEGORY_MAPPING:
                return self.CATEGORY_MAPPING[word]
        
        # Check for common patterns
        patterns = {
            r".*meat.*": "fresh_meat_fish",
            r".*fish.*": "fresh_meat_fish", 
            r".*dairy.*": "dairy_eggs",
            r".*milk.*": "dairy_eggs",
            r".*bread.*": "bakery_fresh",
            r".*fruit.*": "fresh_produce",
            r".*vegetable.*": "fresh_produce",
            r".*frozen.*": "frozen_foods",
            r".*drink.*": "beverages",
            r".*beverage.*": "beverages",
            r".*spice.*": "spices_condiments",
            r".*sauce.*": "spices_condiments",
            r".*clean.*": "household_other",
        }
        
        import re
        for pattern, category in patterns.items():
            if re.search(pattern, category_str):
                return category
        
        return None

    async def resolve_category_uuid(self, category_code: str) -> str:
        """
        Resolve category code to UUID from database
        
        Args:
            category_code: Standard category code
            
        Returns:
            Category UUID or category_code as fallback
        """
        # Check cache first
        if category_code in self._category_cache:
            return self._category_cache[category_code]
        
        try:
            if get_db_sync is None:
                # Fallback: return category_code if no database access
                self.logger.warning(
                    "No database access available, using category_code",
                    category_code=category_code
                )
                return category_code
            
            # Query database for category UUID
            with get_db_sync() as db:
                result = db.execute(
                    text(
                        "SELECT category_id FROM inventory.categories WHERE category_code = :code LIMIT 1"
                    ),
                    {"code": category_code},
                ).fetchone()
                
                if result:
                    category_uuid = str(result[0])
                    self._category_cache[category_code] = category_uuid
                    self._reverse_cache[category_uuid] = category_code
                    return category_uuid
                else:
                    # Try fallback to dry_goods
                    fallback_result = db.execute(
                        text(
                            "SELECT category_id FROM inventory.categories WHERE category_code = 'dry_goods' LIMIT 1"
                        )
                    ).fetchone()
                    
                    if fallback_result:
                        fallback_uuid = str(fallback_result[0])
                        self._category_cache["dry_goods"] = fallback_uuid
                        self._reverse_cache[fallback_uuid] = "dry_goods"
                        
                        self.logger.warning(
                            "Category not found in database, using dry_goods fallback",
                            requested_category=category_code
                        )
                        return fallback_uuid
                    else:
                        # Ultimate fallback: return the category_code
                        self.logger.error(
                            "No categories found in database, using category_code as fallback",
                            category_code=category_code
                        )
                        return category_code
        
        except Exception as e:
            self.logger.error(
                "Error resolving category UUID",
                category_code=category_code,
                error=str(e)
            )
            # Fallback: return category_code if database query fails
            return category_code

    def get_shelf_life_days(self, category_code: str) -> int:
        """
        Get typical shelf life for category
        
        Args:
            category_code: Standard category code
            
        Returns:
            Shelf life in days
        """
        return self.SHELF_LIFE_MAPPING.get(category_code, 30)  # Default 30 days

    def get_risk_level(self, category_code: str) -> str:
        """
        Get risk level for category (for LIFO scoring)
        
        Args:
            category_code: Standard category code
            
        Returns:
            Risk level string
        """
        return self.RISK_LEVELS.get(category_code, "medium")  # Default medium risk

    def get_all_categories(self) -> Dict[str, Dict[str, Any]]:
        """
        Get all category information
        
        Returns:
            Dictionary of all categories with metadata
        """
        categories = {}
        
        # Get unique category codes
        unique_codes = set(self.CATEGORY_MAPPING.values())
        
        for code in unique_codes:
            categories[code] = {
                "category_code": code,
                "shelf_life_days": self.get_shelf_life_days(code),
                "risk_level": self.get_risk_level(code),
                "display_name": code.replace("_", " ").title()
            }
        
        return categories

    def get_category_suggestions(self, partial_category: str, limit: int = 5) -> List[str]:
        """
        Get category suggestions for partial matches
        
        Args:
            partial_category: Partial category string
            limit: Maximum number of suggestions
            
        Returns:
            List of suggested category codes
        """
        if not partial_category:
            return []
        
        search_term = partial_category.lower().strip()
        suggestions = []
        
        # Direct matches first
        for key, value in self.CATEGORY_MAPPING.items():
            if search_term in key and value not in suggestions:
                suggestions.append(value)
                if len(suggestions) >= limit:
                    break
        
        # If not enough suggestions, add fuzzy matches
        if len(suggestions) < limit:
            for key, value in self.CATEGORY_MAPPING.items():
                if (key in search_term or any(word in key for word in search_term.split())) and value not in suggestions:
                    suggestions.append(value)
                    if len(suggestions) >= limit:
                        break
        
        return suggestions

    def validate_category_code(self, category_code: str) -> bool:
        """
        Validate if category code is valid
        
        Args:
            category_code: Category code to validate
            
        Returns:
            True if valid category code
        """
        return category_code in set(self.CATEGORY_MAPPING.values())

    def clear_cache(self) -> None:
        """Clear the category UUID cache"""
        self._category_cache.clear()
        self._reverse_cache.clear()
        self.logger.info("Category cache cleared")


# Global instance
_category_mapper = None


def get_category_mapper() -> CategoryMappingService:
    """Get or create the global category mapper instance"""
    global _category_mapper
    if _category_mapper is None:
        _category_mapper = CategoryMappingService()
    return _category_mapper