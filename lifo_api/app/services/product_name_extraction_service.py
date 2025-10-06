"""
Advanced product name extraction service for food packaging OCR
Implements NLP-based classification and hierarchical text analysis
"""

import re
import time
from typing import Any, Optional
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()


@dataclass
class ProductNameResult:
    """Result of product name extraction"""
    product_name: str
    brand_name: str | None
    product_description: str | None
    confidence: float
    name_type: str  # 'brand', 'product', 'combined', 'description'
    hierarchy_level: int  # 1=primary, 2=secondary, 3=tertiary
    raw_text: str
    font_size_score: float = 0.0
    position_score: float = 0.0
    bounding_box: dict | None = None


@dataclass
class TextBlock:
    """Enhanced text block with analysis metadata"""
    text: str
    original_text: str
    bounding_box: dict | None
    index: int
    font_size_score: float = 0.0
    position_score: float = 0.0
    word_count: int = 0
    contains_brand_indicators: bool = False
    contains_product_indicators: bool = False
    contains_nutritional_info: bool = False
    contains_ingredients: bool = False


class ProductNameExtractionService:
    """
    Advanced product name extraction service for food packaging

    Features:
    - NLP-based brand vs product name classification
    - Font size and positioning analysis for hierarchy detection
    - Multi-line product name reconstruction
    - Ingredient/nutrition info filtering
    - Multilingual brand recognition (EU market focus)
    - Context-aware confidence scoring
    """

    def __init__(self):
        self.brand_indicators = self._initialize_brand_indicators()
        self.product_indicators = self._initialize_product_indicators()
        self.exclusion_patterns = self._initialize_exclusion_patterns()
        self.food_categories = self._initialize_food_categories()
        self.confidence_thresholds = {
            'high': 0.80,
            'medium': 0.65,
            'low': 0.45
        }

        logger.info(
            "ProductNameExtractionService initialized",
            brand_indicators_count=len(self.brand_indicators),
            product_indicators_count=len(self.product_indicators),
            food_categories_count=len(self.food_categories)
        )

    def _initialize_brand_indicators(self) -> dict[str, float]:
        """Initialize brand name indicators with confidence weights"""
        return {
            # Common brand suffixes/prefixes
            'ltd': 0.8, 'limited': 0.8, 'inc': 0.8, 'incorporated': 0.8,
            'co': 0.7, 'company': 0.7, 'corp': 0.7, 'corporation': 0.7,
            'gmbh': 0.8, 'sa': 0.7, 'sas': 0.7, 'spa': 0.7,

            # Brand quality indicators
            'premium': 0.6, 'select': 0.6, 'choice': 0.6, 'signature': 0.7,
            'finest': 0.6, 'quality': 0.5, 'special': 0.5, 'deluxe': 0.6,

            # European brand indicators
            'bio': 0.6, 'organic': 0.6, 'naturel': 0.6, 'natural': 0.6,
            'fresh': 0.5, 'farm': 0.6, 'artisan': 0.7, 'traditional': 0.6,

            # Multilingual brand terms
            'marque': 0.7,  # French: brand
            'marke': 0.7,   # German: brand
            'marca': 0.7,   # Spanish/Italian: brand
        }

    def _initialize_product_indicators(self) -> dict[str, float]:
        """Initialize product name/description indicators"""
        return {
            # Product descriptors
            'flavour': 0.7, 'flavor': 0.7, 'taste': 0.6, 'style': 0.6,
            'variety': 0.6, 'type': 0.5, 'recipe': 0.6, 'blend': 0.6,

            # Food preparation indicators
            'fresh': 0.6, 'frozen': 0.7, 'dried': 0.6, 'smoked': 0.7,
            'grilled': 0.6, 'roasted': 0.6, 'baked': 0.6, 'steamed': 0.6,

            # Size/quantity indicators
            'large': 0.5, 'small': 0.5, 'medium': 0.5, 'extra': 0.5,
            'family': 0.6, 'portion': 0.5, 'serving': 0.5,

            # Multilingual product terms
            'produit': 0.7,  # French: product
            'produkt': 0.7,  # German: product
            'producto': 0.7, # Spanish: product
            'prodotto': 0.7, # Italian: product
        }

    def _initialize_exclusion_patterns(self) -> list[str]:
        """Initialize patterns to exclude from product names"""
        return [
            # Nutritional information
            r'\b\d+\s*(kcal|cal|calories|kj|protein|fat|sugar|salt|sodium)\b',
            r'\b\d+\s*(g|kg|ml|l|oz|lb)\b',  # Weight/volume
            r'\b\d+%\b',  # Percentages

            # Ingredient lists
            r'\bingredients?\s*:',
            r'\bingrédients?\s*:',  # French
            r'\bzutaten\s*:',       # German
            r'\bingredientes\s*:',  # Spanish
            r'\bingredienti\s*:',   # Italian

            # Allergen information
            r'\bcontains?\s*:',
            r'\bcontient\s*:',      # French
            r'\benthält\s*:',       # German
            r'\bcontiene\s*:',      # Spanish/Italian

            # Storage instructions
            r'\bstore\s+in',
            r'\bconserver\s+au',    # French
            r'\blagern\s+bei',      # German
            r'\bconservar\s+en',    # Spanish

            # Regulatory text
            r'\b[A-Z]{2,}\s+\d+',   # Regulation codes
            r'\bec\s+\d+',          # EC numbers
            r'\be\d+',              # E-numbers

            # Dates and codes
            r'\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b',  # Dates
            r'\bbatch\s*:?\s*\w+',
            r'\blot\s*:?\s*\w+',

            # Barcodes
            r'\b\d{8,13}\b',        # Barcode numbers

            # Website/contact info
            r'\bwww\.',
            r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b',  # Email
            r'\b\+?\d{1,3}[-.\s]?\d{3,}\b',  # Phone numbers
        ]

    def _initialize_food_categories(self) -> dict[str, list[str]]:
        """Initialize food category keywords for context"""
        return {
            'dairy': [
                'milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream',
                'lait', 'fromage', 'yaourt',  # French
                'milch', 'käse', 'joghurt',   # German
                'leche', 'queso', 'yogur',    # Spanish
                'latte', 'formaggio', 'yogurt' # Italian
            ],
            'meat': [
                'chicken', 'beef', 'pork', 'lamb', 'turkey', 'ham', 'bacon',
                'poulet', 'bœuf', 'porc', 'agneau',  # French
                'huhn', 'rindfleisch', 'schwein',    # German
                'pollo', 'carne', 'cerdo', 'cordero', # Spanish
                'pollo', 'manzo', 'maiale', 'agnello' # Italian
            ],
            'beverages': [
                'water', 'juice', 'coffee', 'tea', 'soda', 'beer', 'wine',
                'eau', 'jus', 'café', 'thé', 'vin',   # French
                'wasser', 'saft', 'kaffee', 'tee',    # German
                'agua', 'zumo', 'café', 'té', 'vino', # Spanish
                'acqua', 'succo', 'caffè', 'tè', 'vino' # Italian
            ],
            'bakery': [
                'bread', 'cake', 'cookies', 'biscuits', 'pastry',
                'pain', 'gâteau', 'biscuits', 'pâtisserie',  # French
                'brot', 'kuchen', 'kekse', 'gebäck',         # German
                'pan', 'pastel', 'galletas', 'pastelería',   # Spanish
                'pane', 'torta', 'biscotti', 'pasticceria'   # Italian
            ]
        }

    async def extract_product_names_from_text_blocks(
        self,
        text_blocks: list[str],
        bounding_boxes: list[dict] | None = None,
        language_preference: str = 'auto'
    ) -> list[ProductNameResult]:
        """
        Extract product names from OCR text blocks with advanced analysis

        Args:
            text_blocks: List of OCR text blocks
            bounding_boxes: Optional bounding box information
            language_preference: Language preference for processing

        Returns:
            List of ProductNameResult objects sorted by confidence
        """
        start_time = time.time()

        logger.debug(
            "Starting product name extraction",
            text_blocks_count=len(text_blocks),
            language_preference=language_preference
        )

        # Create enhanced text blocks with metadata
        enhanced_blocks = self._create_enhanced_blocks(text_blocks, bounding_boxes)

        # Filter out non-product text
        filtered_blocks = self._filter_non_product_text(enhanced_blocks)

        # Extract product name candidates
        candidates = []

        # 1. Single block analysis
        single_block_candidates = await self._extract_single_block_candidates(
            filtered_blocks, language_preference
        )
        candidates.extend(single_block_candidates)

        # 2. Multi-line reconstruction
        multiline_candidates = await self._extract_multiline_candidates(
            filtered_blocks, language_preference
        )
        candidates.extend(multiline_candidates)

        # 3. Brand + product combination
        combined_candidates = await self._extract_combined_candidates(
            filtered_blocks, language_preference
        )
        candidates.extend(combined_candidates)

        # Remove duplicates and validate
        unique_candidates = self._remove_duplicate_names(candidates)
        validated_candidates = [c for c in unique_candidates if self._validate_product_name(c)]

        # Sort by confidence and hierarchy
        validated_candidates.sort(key=lambda x: (
            x.hierarchy_level,  # Primary hierarchy first
            x.confidence,       # Then by confidence
            x.font_size_score + x.position_score  # Then by visual importance
        ), reverse=True)

        processing_time = (time.time() - start_time) * 1000

        logger.info(
            "Product name extraction completed",
            total_results=len(validated_candidates),
            processing_time_ms=processing_time
        )

        return validated_candidates[:5]  # Return top 5 results

    def _create_enhanced_blocks(
        self,
        text_blocks: list[str],
        bounding_boxes: list[dict] | None
    ) -> list[TextBlock]:
        """Create enhanced text blocks with analysis metadata"""
        enhanced_blocks = []

        for i, text in enumerate(text_blocks):
            bounding_box = bounding_boxes[i] if bounding_boxes and i < len(bounding_boxes) else None

            # Calculate scores
            font_size_score = self._calculate_font_size_score(bounding_box)
            position_score = self._calculate_position_score(bounding_box)

            # Analyze content
            word_count = len(text.split())
            contains_brand_indicators = self._contains_brand_indicators(text)
            contains_product_indicators = self._contains_product_indicators(text)
            contains_nutritional_info = self._contains_nutritional_info(text)
            contains_ingredients = self._contains_ingredients(text)

            enhanced_block = TextBlock(
                text=text.strip(),
                original_text=text,
                bounding_box=bounding_box,
                index=i,
                font_size_score=font_size_score,
                position_score=position_score,
                word_count=word_count,
                contains_brand_indicators=contains_brand_indicators,
                contains_product_indicators=contains_product_indicators,
                contains_nutritional_info=contains_nutritional_info,
                contains_ingredients=contains_ingredients
            )

            enhanced_blocks.append(enhanced_block)

        return enhanced_blocks

    def _calculate_font_size_score(self, bounding_box: dict | None) -> float:
        """Calculate font size score from bounding box dimensions"""
        if not bounding_box:
            return 0.5  # Neutral score

        try:
            height = bounding_box.get('height', 0)
            width = bounding_box.get('width', 0)

            # Larger text typically indicates more important content
            # Normalize based on typical font sizes on packaging
            size_score = 0.5  # Base score

            if height > 0:
                # Height is primary indicator of font size
                if height >= 30:  # Large text
                    size_score += 0.4
                elif height >= 20:  # Medium-large text
                    size_score += 0.3
                elif height >= 15:  # Medium text
                    size_score += 0.2
                elif height >= 10:  # Small-medium text
                    size_score += 0.1
                # Very small text (< 10) gets no bonus

            # Width can indicate title-style text
            if width > 0 and height > 0:
                aspect_ratio = width / height
                if 5 <= aspect_ratio <= 15:  # Typical title proportions
                    size_score += 0.1

            return min(size_score, 1.0)

        except (KeyError, TypeError, ZeroDivisionError):
            return 0.5

    def _calculate_position_score(self, bounding_box: dict | None) -> float:
        """Calculate position score based on typical product name placement"""
        if not bounding_box:
            return 0.5  # Neutral score

        try:
            x = bounding_box.get('x', 0)
            y = bounding_box.get('y', 0)

            # Typical product name positions on food packaging
            position_score = 0.5  # Base score

            # Assuming normalized coordinates (0-1)
            if 0 <= x <= 1 and 0 <= y <= 1:
                # Upper portion of package (product names often at top)
                if 0.1 <= y <= 0.4:
                    position_score += 0.3
                elif 0.4 <= y <= 0.6:  # Middle portion
                    position_score += 0.2

                # Centered horizontally (brands/products often centered)
                if 0.2 <= x <= 0.8:
                    position_score += 0.2

            return min(position_score, 1.0)

        except (KeyError, TypeError):
            return 0.5

    def _contains_brand_indicators(self, text: str) -> bool:
        """Check if text contains brand indicators"""
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in self.brand_indicators.keys())

    def _contains_product_indicators(self, text: str) -> bool:
        """Check if text contains product indicators"""
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in self.product_indicators.keys())

    def _contains_nutritional_info(self, text: str) -> bool:
        """Check if text contains nutritional information"""
        nutritional_patterns = [
            r'\b\d+\s*(kcal|cal|calories|kj)\b',
            r'\b\d+\s*g\s*(protein|fat|sugar|salt)\b',
            r'\bper\s+100\s*g\b',
            r'\benergy\b',
            r'\bnutrition\b',
        ]

        text_lower = text.lower()
        return any(re.search(pattern, text_lower) for pattern in nutritional_patterns)

    def _contains_ingredients(self, text: str) -> bool:
        """Check if text contains ingredient information"""
        ingredient_patterns = [
            r'\bingredients?\s*:',
            r'\bingrédients?\s*:',
            r'\bzutaten\s*:',
            r'\bingredientes\s*:',
            r'\bingredienti\s*:',
        ]

        text_lower = text.lower()
        return any(re.search(pattern, text_lower) for pattern in ingredient_patterns)

    def _filter_non_product_text(self, blocks: list[TextBlock]) -> list[TextBlock]:
        """Filter out blocks that clearly don't contain product names"""
        filtered_blocks = []

        for block in blocks:
            # Skip nutritional and ingredient information
            if block.contains_nutritional_info or block.contains_ingredients:
                continue

            # Skip blocks matching exclusion patterns
            text_lower = block.text.lower()
            should_exclude = False

            for pattern in self.exclusion_patterns:
                if re.search(pattern, text_lower):
                    should_exclude = True
                    break

            if should_exclude:
                continue

            # Skip very short or very long text (unlikely to be product names)
            if len(block.text.strip()) < 2 or len(block.text.strip()) > 100:
                continue

            # Skip blocks that are mostly numbers
            if len(re.sub(r'[^\d]', '', block.text)) / len(block.text) > 0.7:
                continue

            filtered_blocks.append(block)

        return filtered_blocks

    async def _extract_single_block_candidates(
        self,
        blocks: list[TextBlock],
        language_preference: str
    ) -> list[ProductNameResult]:
        """Extract product name candidates from single blocks"""
        candidates = []

        for block in blocks:
            # Clean the text
            cleaned_text = self._clean_product_text(block.text)
            if not cleaned_text:
                continue

            # Classify text type
            name_type = self._classify_text_type(cleaned_text, block)

            # Calculate confidence
            confidence = self._calculate_single_block_confidence(block, name_type)

            # Determine hierarchy level
            hierarchy_level = self._determine_hierarchy_level(block, name_type)

            # Extract brand and product components
            brand_name, product_description = self._separate_brand_and_product(cleaned_text)

            candidate = ProductNameResult(
                product_name=cleaned_text,
                brand_name=brand_name,
                product_description=product_description,
                confidence=confidence,
                name_type=name_type,
                hierarchy_level=hierarchy_level,
                raw_text=block.text,
                font_size_score=block.font_size_score,
                position_score=block.position_score,
                bounding_box=block.bounding_box
            )

            candidates.append(candidate)

        return candidates

    async def _extract_multiline_candidates(
        self,
        blocks: list[TextBlock],
        language_preference: str
    ) -> list[ProductNameResult]:
        """Extract product names that span multiple lines"""
        candidates = []

        # Look for adjacent blocks that could form complete product names
        for i, block1 in enumerate(blocks):
            for j in range(i + 1, min(i + 3, len(blocks))):  # Check next 2 blocks
                block2 = blocks[j]

                # Check if blocks are visually adjacent
                if self._are_blocks_adjacent(block1, block2):
                    combined_text = self._combine_block_texts(block1.text, block2.text)
                    cleaned_text = self._clean_product_text(combined_text)

                    if cleaned_text and len(cleaned_text) > len(block1.text.strip()):
                        # Create combined result
                        combined_confidence = (
                            self._calculate_single_block_confidence(block1, 'combined') +
                            self._calculate_single_block_confidence(block2, 'combined')
                        ) / 2

                        # Bonus for successful combination
                        combined_confidence = min(combined_confidence + 0.1, 1.0)

                        hierarchy_level = min(
                            self._determine_hierarchy_level(block1, 'combined'),
                            self._determine_hierarchy_level(block2, 'combined')
                        )

                        brand_name, product_description = self._separate_brand_and_product(cleaned_text)

                        candidate = ProductNameResult(
                            product_name=cleaned_text,
                            brand_name=brand_name,
                            product_description=product_description,
                            confidence=combined_confidence,
                            name_type='combined',
                            hierarchy_level=hierarchy_level,
                            raw_text=f"{block1.text} {block2.text}",
                            font_size_score=(block1.font_size_score + block2.font_size_score) / 2,
                            position_score=(block1.position_score + block2.position_score) / 2,
                            bounding_box=block1.bounding_box
                        )

                        candidates.append(candidate)

        return candidates

    async def _extract_combined_candidates(
        self,
        blocks: list[TextBlock],
        language_preference: str
    ) -> list[ProductNameResult]:
        """Extract brand + product combinations"""
        candidates = []

        # Find potential brand blocks
        brand_blocks = [b for b in blocks if b.contains_brand_indicators]
        product_blocks = [b for b in blocks if b.contains_product_indicators]

        for brand_block in brand_blocks:
            for product_block in product_blocks:
                if brand_block.index != product_block.index:
                    # Create combined brand + product name
                    brand_text = self._clean_product_text(brand_block.text)
                    product_text = self._clean_product_text(product_block.text)

                    if brand_text and product_text:
                        combined_name = f"{brand_text} {product_text}"

                        confidence = (
                            self._calculate_single_block_confidence(brand_block, 'brand') +
                            self._calculate_single_block_confidence(product_block, 'product')
                        ) / 2

                        # Bonus for brand+product combination
                        confidence = min(confidence + 0.15, 1.0)

                        candidate = ProductNameResult(
                            product_name=combined_name,
                            brand_name=brand_text,
                            product_description=product_text,
                            confidence=confidence,
                            name_type='combined',
                            hierarchy_level=1,  # High priority for brand+product
                            raw_text=f"{brand_block.text} {product_block.text}",
                            font_size_score=max(brand_block.font_size_score, product_block.font_size_score),
                            position_score=(brand_block.position_score + product_block.position_score) / 2,
                            bounding_box=brand_block.bounding_box
                        )

                        candidates.append(candidate)

        return candidates

    def _clean_product_text(self, text: str) -> str:
        """Clean and normalize product text"""
        if not text:
            return ""

        # Remove extra whitespace
        cleaned = re.sub(r'\s+', ' ', text.strip())

        # Remove common non-product elements
        cleaned = re.sub(r'\b\d+\s*(g|kg|ml|l|oz|lb)\b', '', cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r'\b\d+%\b', '', cleaned)

        # Remove special characters at start/end
        cleaned = re.sub(r'^[^\w\s]+|[^\w\s]+$', '', cleaned)

        # Title case normalization (optional)
        if cleaned.isupper() and len(cleaned) > 10:
            cleaned = cleaned.title()

        return cleaned.strip()

    def _classify_text_type(self, text: str, block: TextBlock) -> str:
        """Classify the type of text (brand, product, description, etc.)"""
        text_lower = text.lower()

        # Brand indicators
        brand_score = sum(
            weight for keyword, weight in self.brand_indicators.items()
            if keyword in text_lower
        )

        # Product indicators
        product_score = sum(
            weight for keyword, weight in self.product_indicators.items()
            if keyword in text_lower
        )

        # Additional heuristics
        if block.contains_brand_indicators:
            brand_score += 0.5

        if block.contains_product_indicators:
            product_score += 0.5

        # Font size and position can indicate importance
        if block.font_size_score > 0.7:  # Large text often brand/product
            if brand_score > product_score:
                brand_score += 0.3
            else:
                product_score += 0.3

        # Determine type
        if brand_score > product_score and brand_score > 0.5:
            return 'brand'
        elif product_score > 0.5:
            return 'product'
        elif len(text.split()) == 1 and text.isupper():
            return 'brand'  # Single uppercase word likely brand
        else:
            return 'description'

    def _calculate_single_block_confidence(self, block: TextBlock, name_type: str) -> float:
        """Calculate confidence for single block extraction"""
        base_confidence = 0.4

        # Visual importance (font size + position)
        visual_score = (block.font_size_score + block.position_score) / 2
        base_confidence += visual_score * 0.3

        # Name type bonus
        type_bonus = {
            'brand': 0.2,
            'product': 0.2,
            'combined': 0.25,
            'description': 0.1
        }
        base_confidence += type_bonus.get(name_type, 0.1)

        # Content quality indicators
        if block.contains_brand_indicators or block.contains_product_indicators:
            base_confidence += 0.15

        # Length heuristics (product names have optimal length range)
        text_length = len(block.text.strip())
        if 5 <= text_length <= 50:  # Optimal range
            base_confidence += 0.1
        elif text_length < 5 or text_length > 80:  # Too short or long
            base_confidence -= 0.2

        # Word count (1-5 words typically optimal for product names)
        if 1 <= block.word_count <= 5:
            base_confidence += 0.1

        return min(max(base_confidence, 0.0), 1.0)

    def _determine_hierarchy_level(self, block: TextBlock, name_type: str) -> int:
        """Determine hierarchy level (1=primary, 2=secondary, 3=tertiary)"""
        # Font size is primary indicator
        hierarchy_level: int
        if block.font_size_score >= 0.8:
            hierarchy_level = 1  # Primary
        elif block.font_size_score >= 0.6:
            hierarchy_level = 2  # Secondary
        else:
            hierarchy_level = 3  # Tertiary

        # Name type can influence hierarchy
        if name_type == 'brand' and block.font_size_score >= 0.5:
            hierarchy_level = min(hierarchy_level - 1, 1)  # Promote brands

        return hierarchy_level

    def _separate_brand_and_product(self, text: str) -> tuple[str | None, str | None]:
        """Attempt to separate brand name from product description"""
        words = text.split()

        if len(words) <= 1:
            return None, text

        # Simple heuristic: first 1-2 words often brand, rest product
        if len(words) >= 3:
            # Check if first word looks like a brand
            first_word = words[0].lower()
            if (first_word in self.brand_indicators or
                first_word.isupper() or
                first_word.istitle()):
                return words[0], " ".join(words[1:])

        # If no clear separation, return as product only
        return None, text

    def _are_blocks_adjacent(self, block1: TextBlock, block2: TextBlock) -> bool:
        """Check if two blocks are visually adjacent"""
        if not block1.bounding_box or not block2.bounding_box:
            return False

        try:
            # Simple adjacency check based on position
            y1 = block1.bounding_box.get('y', 0)
            y2 = block2.bounding_box.get('y', 0)
            h1 = block1.bounding_box.get('height', 0)

            # Check if blocks are vertically close
            vertical_distance = abs(y2 - (y1 + h1))
            return vertical_distance <= h1 * 0.5  # Within 50% of font height

        except (KeyError, TypeError):
            return False

    def _combine_block_texts(self, text1: str, text2: str) -> str:
        """Intelligently combine text from two blocks"""
        # Simple combination with space
        combined = f"{text1.strip()} {text2.strip()}"
        return combined

    def _remove_duplicate_names(self, candidates: list[ProductNameResult]) -> list[ProductNameResult]:
        """Remove duplicate product name extractions"""
        if not candidates:
            return []

        # Group by normalized product name
        name_groups: dict[str, list[ProductNameResult]] = {}
        for candidate in candidates:
            normalized_name = candidate.product_name.lower().strip()
            if normalized_name not in name_groups:
                name_groups[normalized_name] = []
            name_groups[normalized_name].append(candidate)

        # Keep highest confidence for each name
        unique_candidates = []
        for name, group in name_groups.items():
            best_candidate = max(group, key=lambda x: x.confidence)
            unique_candidates.append(best_candidate)

        return unique_candidates

    def _validate_product_name(self, result: ProductNameResult) -> bool:
        """Validate a product name extraction result"""
        if not result.product_name or not result.product_name.strip():
            return False

        # Minimum confidence threshold
        if result.confidence < self.confidence_thresholds['low']:
            return False

        # Length validation
        name_length = len(result.product_name.strip())
        if name_length < 2 or name_length > 100:
            return False

        # Must contain some alphabetic characters
        if not re.search(r'[a-zA-Z]', result.product_name):
            return False

        return True


# Global service instance
_product_name_extraction_service: ProductNameExtractionService | None = None

def get_product_name_extraction_service() -> ProductNameExtractionService:
    """Get singleton instance of product name extraction service"""
    global _product_name_extraction_service
    if _product_name_extraction_service is None:
        _product_name_extraction_service = ProductNameExtractionService()
    return _product_name_extraction_service