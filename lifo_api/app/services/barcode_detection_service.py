"""
Advanced barcode detection service for food packaging OCR
Implements sophisticated detection algorithms with checksum validation
"""

import re
import time
from typing import Any, Optional
from dataclasses import dataclass

import structlog

logger = structlog.get_logger()


@dataclass
class BarcodeDetectionResult:
    """Result of barcode detection with validation"""
    value: str
    format: str  # 'EAN-13', 'UPC-A', 'EAN-8', 'UPC-E', 'CODE-128'
    confidence: float
    checksum_valid: bool
    source: str  # 'single_block', 'fragmented', 'zero_padded', 'context_enhanced'
    raw_text: str
    bounding_box: Optional[dict] = None
    position_score: float = 0.0  # Positioning heuristic score


@dataclass
class BarcodeCandidate:
    """Intermediate barcode candidate for processing"""
    text: str
    clean_digits: str
    original_text: str
    bounding_box: Optional[dict]
    index: int
    context_score: float = 0.0


class BarcodeDetectionService:
    """
    Advanced barcode detection service optimized for food packaging

    Features:
    - Multi-format support (EAN-13, UPC-A, EAN-8, UPC-E, CODE-128)
    - Sophisticated checksum validation algorithms
    - Fragmented barcode reconstruction
    - Context-aware confidence scoring
    - Position-based heuristics for European retail
    - Integration-ready for Roboflow/ZXing APIs
    """

    def __init__(self):
        self.barcode_formats = self._initialize_barcode_formats()
        self.context_indicators = self._initialize_context_indicators()
        self.confidence_thresholds = {
            'high': 0.85,
            'medium': 0.70,
            'low': 0.50
        }
        self.date_exclusion_patterns = self._initialize_date_exclusion_patterns()

        logger.info(
            "BarcodeDetectionService initialized",
            supported_formats=list(self.barcode_formats.keys()),
            context_indicators_count=len(self.context_indicators)
        )

    def _initialize_barcode_formats(self) -> dict[str, dict]:
        """Initialize barcode format specifications and validation rules"""
        return {
            'EAN-13': {
                'length': 13,
                'priority': 'very_high',  # Most common in Europe
                'pattern': r'\b\d{13}\b',
                'checksum_validator': self._validate_ean13,
                'common_prefixes': ['4', '5', '6', '7', '8', '9'],  # European prefixes
                'description': 'European Article Number (13 digits)'
            },
            'UPC-A': {
                'length': 12,
                'priority': 'high',
                'pattern': r'\b\d{12}\b',
                'checksum_validator': self._validate_upc_a,
                'common_prefixes': ['0', '1', '2', '3'],  # North American prefixes
                'description': 'Universal Product Code A (12 digits)'
            },
            'EAN-8': {
                'length': 8,
                'priority': 'medium',
                'pattern': r'\b\d{8}\b',
                'checksum_validator': self._validate_ean8,
                'common_prefixes': ['2', '3', '4', '5', '6', '7', '8', '9'],
                'description': 'European Article Number (8 digits)'
            },
            'UPC-E': {
                'length': 6,
                'priority': 'low',
                'pattern': r'\b\d{6}\b',
                'checksum_validator': self._validate_upc_e,
                'common_prefixes': ['0', '1'],
                'description': 'Universal Product Code E (6 digits compressed)'
            },
            'CODE-128': {
                'length': None,  # Variable length
                'priority': 'low',
                'pattern': r'\b\d{8,14}\b',  # 8-14 digits typical
                'checksum_validator': self._validate_code128,
                'common_prefixes': [],
                'description': 'Code 128 (variable length)'
            }
        }

    def _initialize_context_indicators(self) -> dict[str, float]:
        """Initialize context indicators that suggest barcode presence"""
        return {
            'barcode': 1.0,
            'ean': 0.9,
            'upc': 0.9,
            'gtin': 0.8,
            'code': 0.7,
            'article': 0.6,
            'product': 0.5,
            'item': 0.5,
            'ref': 0.4,
            'numero': 0.4,  # French: number
            'nummer': 0.4,  # German: number
            'numero': 0.4,  # Spanish/Italian: number
        }

    def _initialize_date_exclusion_patterns(self) -> list[str]:
        """Initialize patterns that indicate date content (to exclude from barcode detection)"""
        return [
            # Date keywords that indicate this is NOT a barcode
            r'\b(?:exp|expiry|expires?|expiration)\b',
            r'\b(?:best\s*before|best\s*by|bb)\b',
            r'\b(?:use\s*by|use\s*before)\b',
            r'\b(?:sell\s*by|sell\s*before)\b',
            r'\b(?:display\s*until|display\s*by)\b',
            r'\b(?:mfg|manufactured|production|prod|made)\b',
            # Non-English date indicators
            r'\b(?:à\s*consommer|mindestens\s*haltbar|consumir\s*preferentemente)\b',
            r'\b(?:da\s*consumarsi|vendre\s*avant|verkaufen\s*bis|scade\s*il)\b',
            # Date format patterns with context
            r'\b\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}\b',  # Traditional date formats
            r'\b\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}\b',    # ISO-style dates
        ]

    async def detect_barcodes_from_text_blocks(
        self,
        text_blocks: list[str],
        bounding_boxes: Optional[list[dict]] = None,
        region_preference: str = 'EU'
    ) -> list[BarcodeDetectionResult]:
        """
        Detect barcodes from OCR text blocks with advanced algorithms

        Args:
            text_blocks: List of OCR text blocks
            bounding_boxes: Optional bounding box information
            region_preference: 'EU', 'US', or 'AUTO' for format preference

        Returns:
            List of BarcodeDetectionResult objects sorted by confidence
        """
        start_time = time.time()
        candidates = []

        logger.debug(
            "Starting barcode detection",
            text_blocks_count=len(text_blocks),
            region_preference=region_preference
        )

        # Extract barcode candidates from text blocks
        for i, text_block in enumerate(text_blocks):
            block_candidates = self._extract_candidates_from_block(
                text_block,
                bounding_boxes[i] if bounding_boxes and i < len(bounding_boxes) else None,
                i
            )
            candidates.extend(block_candidates)

        # Process candidates with different strategies
        results = []

        # 1. Single block detection (highest priority)
        single_block_results = await self._detect_single_block_barcodes(
            candidates, region_preference
        )
        results.extend(single_block_results)

        # 2. Fragmented barcode detection (if no high-confidence single blocks)
        if not any(r.confidence >= self.confidence_thresholds['high'] for r in results):
            fragmented_results = await self._detect_fragmented_barcodes(
                candidates, region_preference
            )
            results.extend(fragmented_results)

        # 3. Zero-padding enhancement for UPC codes
        if region_preference in ['US', 'AUTO']:
            padded_results = await self._detect_zero_padded_barcodes(
                candidates, region_preference
            )
            results.extend(padded_results)

        # Remove duplicates and validate
        unique_results = self._remove_duplicate_barcodes(results)
        validated_results = [r for r in unique_results if self._validate_barcode_result(r)]

        # Sort by confidence and format priority
        validated_results.sort(key=lambda x: (
            self._get_format_priority(x.format, region_preference),
            x.confidence,
            x.position_score
        ), reverse=True)

        processing_time = (time.time() - start_time) * 1000

        logger.info(
            "Barcode detection completed",
            total_results=len(validated_results),
            processing_time_ms=processing_time,
            region_preference=region_preference
        )

        return validated_results[:3]  # Return top 3 results

    def _extract_candidates_from_block(
        self,
        text_block: str,
        bounding_box: Optional[dict],
        index: int
    ) -> list[BarcodeCandidate]:
        """Extract potential barcode candidates from a text block"""
        candidates = []

        # Skip if this text block likely contains dates
        if self._is_likely_date_context(text_block):
            logger.debug(
                "Skipping potential date context for barcode detection",
                text_block=text_block[:50]
            )
            return candidates

        # Find all numeric sequences
        numeric_patterns = [
            r'\d{6,}',  # 6 or more consecutive digits
            r'\d{3,}\s+\d{3,}',  # Digits with spaces
            r'\d{3,}[-]\d{3,}',  # Digits with hyphens
        ]

        for pattern in numeric_patterns:
            matches = re.finditer(pattern, text_block)
            for match in matches:
                clean_digits = re.sub(r'[^\d]', '', match.group())
                if len(clean_digits) >= 6:  # Minimum barcode length

                    # Additional date exclusion check for the specific match
                    if self._is_likely_date_sequence(match.group(), text_block):
                        logger.debug(
                            "Excluding likely date sequence from barcode candidates",
                            sequence=match.group()
                        )
                        continue

                    context_score = self._calculate_context_score(text_block)

                    candidate = BarcodeCandidate(
                        text=match.group(),
                        clean_digits=clean_digits,
                        original_text=text_block,
                        bounding_box=bounding_box,
                        index=index,
                        context_score=context_score
                    )
                    candidates.append(candidate)

        return candidates

    def _calculate_context_score(self, text: str) -> float:
        """Calculate context score based on nearby indicators"""
        text_lower = text.lower()
        score = 0.0

        for indicator, weight in self.context_indicators.items():
            if indicator in text_lower:
                score += weight

        # Penalize if date-like content is detected
        if self._is_likely_date_context(text):
            score *= 0.3  # Significantly reduce score for date contexts

        # Normalize score
        return min(score, 1.0)

    def _is_likely_date_context(self, text: str) -> bool:
        """Check if text block contains date-related content"""
        text_lower = text.lower()

        # Check for date exclusion patterns
        for pattern in self.date_exclusion_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True

        # Use date extraction service for additional validation if available
        try:
            # Lazy import to avoid circular dependency
            from .date_extraction_service import get_date_extraction_service
            date_service = get_date_extraction_service()
            is_date, confidence = date_service.is_likely_date(text)
            return is_date and confidence > 0.6
        except Exception:
            # Fallback to pattern-based detection if service fails
            return False

    def _is_likely_date_sequence(self, sequence: str, context: str) -> bool:
        """Check if a specific numeric sequence is likely a date"""
        # Check for date-like patterns in the sequence itself
        sequence_clean = re.sub(r'[^\d]', '', sequence)

        # Common date formats that shouldn't be barcodes
        if len(sequence_clean) == 8:  # DDMMYYYY or YYYYMMDD
            # Check if it could be a valid date
            try:
                # Try YYYYMMDD format
                if sequence_clean[:4] in ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']:
                    month = int(sequence_clean[4:6])
                    day = int(sequence_clean[6:8])
                    if 1 <= month <= 12 and 1 <= day <= 31:
                        return True

                # Try DDMMYYYY format
                day = int(sequence_clean[:2])
                month = int(sequence_clean[2:4])
                year = int(sequence_clean[4:])
                if 1 <= day <= 31 and 1 <= month <= 12 and 1900 <= year <= 2050:
                    return True

            except (ValueError, IndexError):
                pass

        elif len(sequence_clean) == 6:  # DDMMYY or YYMMDD
            try:
                # Multiple potential date interpretations
                # If context contains date keywords, more likely to be a date
                context_lower = context.lower()
                date_indicators = ['exp', 'expiry', 'best', 'use', 'sell', 'mfg', 'prod']
                if any(indicator in context_lower for indicator in date_indicators):
                    return True
            except (ValueError, IndexError):
                pass

        return False

    async def _detect_single_block_barcodes(
        self,
        candidates: list[BarcodeCandidate],
        region_preference: str
    ) -> list[BarcodeDetectionResult]:
        """Detect barcodes from single text blocks"""
        results = []

        for candidate in candidates:
            # Try each barcode format in priority order
            format_priority = self._get_format_priority_list(region_preference)

            for format_name in format_priority:
                format_info = self.barcode_formats[format_name]

                # Check length match (for fixed-length formats)
                if format_info['length'] and len(candidate.clean_digits) == format_info['length']:
                    result = self._create_barcode_result(
                        candidate,
                        format_name,
                        format_info,
                        'single_block'
                    )

                    if result and result.confidence >= self.confidence_thresholds['low']:
                        results.append(result)

        return results

    async def _detect_fragmented_barcodes(
        self,
        candidates: list[BarcodeCandidate],
        region_preference: str
    ) -> list[BarcodeDetectionResult]:
        """Detect barcodes that are split across multiple text blocks"""
        results = []

        # Try combining adjacent candidates
        for i, candidate1 in enumerate(candidates):
            if len(candidate1.clean_digits) >= 4:  # First part must be substantial

                # Look for adjacent candidates
                for j in range(i + 1, min(i + 4, len(candidates))):
                    candidate2 = candidates[j]

                    if len(candidate2.clean_digits) >= 2:  # Second part minimum
                        combined_digits = candidate1.clean_digits + candidate2.clean_digits

                        # Check if combined length matches any format
                        for format_name, format_info in self.barcode_formats.items():
                            if format_info['length'] and len(combined_digits) == format_info['length']:

                                # Create combined candidate
                                combined_candidate = BarcodeCandidate(
                                    text=f"{candidate1.text} {candidate2.text}",
                                    clean_digits=combined_digits,
                                    original_text=f"{candidate1.original_text} {candidate2.original_text}",
                                    bounding_box=candidate1.bounding_box,
                                    index=candidate1.index,
                                    context_score=(candidate1.context_score + candidate2.context_score) / 2
                                )

                                result = self._create_barcode_result(
                                    combined_candidate,
                                    format_name,
                                    format_info,
                                    'fragmented'
                                )

                                if result and result.confidence >= self.confidence_thresholds['low']:
                                    # Reduce confidence for fragmented detection
                                    result.confidence *= 0.85
                                    results.append(result)

        return results

    async def _detect_zero_padded_barcodes(
        self,
        candidates: list[BarcodeCandidate],
        region_preference: str
    ) -> list[BarcodeDetectionResult]:
        """Detect UPC-A barcodes that need zero padding"""
        results = []

        for candidate in candidates:
            # Check for 11-digit numbers that might be UPC-A with missing leading zero
            if len(candidate.clean_digits) == 11:
                padded_digits = "0" + candidate.clean_digits

                upc_a_info = self.barcode_formats['UPC-A']
                padded_candidate = BarcodeCandidate(
                    text=candidate.text,
                    clean_digits=padded_digits,
                    original_text=candidate.original_text,
                    bounding_box=candidate.bounding_box,
                    index=candidate.index,
                    context_score=candidate.context_score
                )

                result = self._create_barcode_result(
                    padded_candidate,
                    'UPC-A',
                    upc_a_info,
                    'zero_padded'
                )

                if result and result.confidence >= self.confidence_thresholds['low']:
                    # Slightly reduce confidence for padding
                    result.confidence *= 0.95
                    results.append(result)

        return results

    def _create_barcode_result(
        self,
        candidate: BarcodeCandidate,
        format_name: str,
        format_info: dict,
        source: str
    ) -> Optional[BarcodeDetectionResult]:
        """Create a BarcodeDetectionResult from a candidate"""
        try:
            # Validate checksum
            checksum_valid = format_info['checksum_validator'](candidate.clean_digits)

            # Calculate confidence score
            confidence = self._calculate_barcode_confidence(
                candidate, format_info, checksum_valid, source
            )

            # Calculate position score
            position_score = self._calculate_position_score(candidate.bounding_box)

            return BarcodeDetectionResult(
                value=candidate.clean_digits,
                format=format_name,
                confidence=confidence,
                checksum_valid=checksum_valid,
                source=source,
                raw_text=candidate.text,
                bounding_box=candidate.bounding_box,
                position_score=position_score
            )

        except Exception as e:
            logger.warning(f"Failed to create barcode result: {e}", format=format_name)
            return None

    def _calculate_barcode_confidence(
        self,
        candidate: BarcodeCandidate,
        format_info: dict,
        checksum_valid: bool,
        source: str
    ) -> float:
        """Calculate confidence score for barcode detection"""
        base_confidence = 0.3

        # Checksum validation boost (major factor)
        if checksum_valid:
            base_confidence += 0.4
        else:
            base_confidence -= 0.2

        # Format priority boost
        priority_boost = {
            'very_high': 0.3,
            'high': 0.2,
            'medium': 0.1,
            'low': 0.05
        }
        base_confidence += priority_boost.get(format_info.get('priority', 'low'), 0.05)

        # Context indicators boost
        base_confidence += candidate.context_score * 0.2

        # Source reliability adjustment
        source_multiplier = {
            'single_block': 1.0,
            'fragmented': 0.85,
            'zero_padded': 0.95,
            'context_enhanced': 0.9
        }
        base_confidence *= source_multiplier.get(source, 1.0)

        # Digit pattern consistency
        if self._has_consistent_digit_pattern(candidate.clean_digits):
            base_confidence += 0.1

        # Prefix validation for regional formats
        if self._has_valid_prefix(candidate.clean_digits, format_info):
            base_confidence += 0.1

        return min(max(base_confidence, 0.0), 1.0)

    def _calculate_position_score(self, bounding_box: Optional[dict]) -> float:
        """Calculate position-based heuristic score"""
        if not bounding_box:
            return 0.5  # Neutral score

        # Typical barcode positions on food packaging
        # - Lower third of package (common placement)
        # - Not too close to edges
        # - Reasonable aspect ratio

        score = 0.5  # Base score

        try:
            x, y, width, height = (
                bounding_box.get('x', 0),
                bounding_box.get('y', 0),
                bounding_box.get('width', 0),
                bounding_box.get('height', 0)
            )

            # Aspect ratio check (barcodes are typically wide)
            if width > 0 and height > 0:
                aspect_ratio = width / height
                if 3 <= aspect_ratio <= 8:  # Good barcode aspect ratio
                    score += 0.2
                elif aspect_ratio > 1:
                    score += 0.1

            # Position heuristics (assuming normalized coordinates)
            if 0 < x < 1 and 0 < y < 1:
                # Prefer lower portion of image
                if 0.6 <= y <= 0.9:
                    score += 0.2

                # Avoid extreme edges
                if 0.1 <= x <= 0.9:
                    score += 0.1

        except (KeyError, TypeError, ZeroDivisionError):
            pass

        return min(score, 1.0)

    def _has_consistent_digit_pattern(self, digits: str) -> bool:
        """Check if digits have consistent patterns"""
        # Avoid obviously non-barcode patterns
        if digits == '0' * len(digits):  # All zeros
            return False
        if digits == '1' * len(digits):  # All ones
            return False
        if len(set(digits)) < 3:  # Too few unique digits
            return False

        return True

    def _has_valid_prefix(self, digits: str, format_info: dict) -> bool:
        """Check if barcode has valid prefix for format"""
        if not digits or not format_info.get('common_prefixes'):
            return True  # No specific requirements

        first_digit = digits[0]
        return first_digit in format_info['common_prefixes']

    def _get_format_priority(self, format_name: str, region_preference: str) -> int:
        """Get priority score for barcode format"""
        base_priority = {
            'EAN-13': 5,
            'UPC-A': 4,
            'EAN-8': 3,
            'UPC-E': 2,
            'CODE-128': 1
        }

        priority = base_priority.get(format_name, 1)

        # Regional adjustments
        if region_preference == 'EU':
            if format_name.startswith('EAN'):
                priority += 2
        elif region_preference == 'US':
            if format_name.startswith('UPC'):
                priority += 2

        return priority

    def _get_format_priority_list(self, region_preference: str) -> list[str]:
        """Get ordered list of formats by priority"""
        formats = list(self.barcode_formats.keys())

        if region_preference == 'EU':
            return ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E', 'CODE-128']
        elif region_preference == 'US':
            return ['UPC-A', 'EAN-13', 'UPC-E', 'EAN-8', 'CODE-128']
        else:  # AUTO
            return ['EAN-13', 'UPC-A', 'EAN-8', 'UPC-E', 'CODE-128']

    # Checksum validation methods
    def _validate_ean13(self, digits: str) -> bool:
        """Validate EAN-13 barcode using check digit"""
        if len(digits) != 13:
            return False

        try:
            # EAN-13 check digit calculation
            odd_sum = sum(int(digits[i]) for i in range(0, 12, 2))
            even_sum = sum(int(digits[i]) for i in range(1, 12, 2))
            check_sum = (odd_sum + even_sum * 3) % 10
            check_digit = (10 - check_sum) % 10
            return int(digits[12]) == check_digit
        except (ValueError, IndexError):
            return False

    def _validate_upc_a(self, digits: str) -> bool:
        """Validate UPC-A barcode using check digit"""
        if len(digits) != 12:
            return False

        try:
            # UPC-A check digit calculation
            odd_sum = sum(int(digits[i]) for i in range(0, 11, 2))
            even_sum = sum(int(digits[i]) for i in range(1, 11, 2))
            check_sum = (odd_sum * 3 + even_sum) % 10
            check_digit = (10 - check_sum) % 10
            return int(digits[11]) == check_digit
        except (ValueError, IndexError):
            return False

    def _validate_ean8(self, digits: str) -> bool:
        """Validate EAN-8 barcode using check digit"""
        if len(digits) != 8:
            return False

        try:
            # EAN-8 check digit calculation
            odd_sum = sum(int(digits[i]) for i in range(0, 7, 2))
            even_sum = sum(int(digits[i]) for i in range(1, 7, 2))
            check_sum = (odd_sum * 3 + even_sum) % 10
            check_digit = (10 - check_sum) % 10
            return int(digits[7]) == check_digit
        except (ValueError, IndexError):
            return False

    def _validate_upc_e(self, digits: str) -> bool:
        """Validate UPC-E barcode (simplified validation)"""
        if len(digits) != 6:
            return False

        # UPC-E validation is complex (expansion to UPC-A required)
        # For now, basic digit validation
        try:
            int(digits)  # Ensure all digits
            return True
        except ValueError:
            return False

    def _validate_code128(self, digits: str) -> bool:
        """Validate CODE-128 barcode (simplified validation)"""
        if len(digits) < 8 or len(digits) > 14:
            return False

        # CODE-128 has complex validation rules
        # For now, basic digit validation
        try:
            int(digits)  # Ensure all digits
            return True
        except ValueError:
            return False

    def _remove_duplicate_barcodes(self, results: list[BarcodeDetectionResult]) -> list[BarcodeDetectionResult]:
        """Remove duplicate barcode detections, keeping highest confidence"""
        if not results:
            return []

        # Group by barcode value
        barcode_groups: dict[str, list[BarcodeDetectionResult]] = {}
        for result in results:
            if result.value not in barcode_groups:
                barcode_groups[result.value] = []
            barcode_groups[result.value].append(result)

        # Keep highest confidence for each barcode
        unique_results = []
        for barcode_value, group in barcode_groups.items():
            best_result = max(group, key=lambda x: x.confidence)
            unique_results.append(best_result)

        return unique_results

    def _validate_barcode_result(self, result: BarcodeDetectionResult) -> bool:
        """Validate a barcode detection result"""
        if not result.value or not result.format:
            return False

        # Minimum confidence threshold
        if result.confidence < self.confidence_thresholds['low']:
            return False

        # Must have valid digits
        if not result.value.isdigit():
            return False

        # Format-specific validation
        format_info = self.barcode_formats.get(result.format)
        if format_info and format_info['length']:
            if len(result.value) != format_info['length']:
                return False

        return True

    def is_barcode_likely(self, text: str) -> tuple[bool, float]:
        """Check if text is likely a barcode (complementary to date detection)"""
        text_clean = re.sub(r'[^\d]', '', text)

        # Must have sufficient digits
        if len(text_clean) < 6:
            return False, 0.0

        # Check for date exclusions first
        if self._is_likely_date_context(text) or self._is_likely_date_sequence(text, text):
            return False, 0.0

        confidence = 0.0

        # Length-based scoring (typical barcode lengths)
        if len(text_clean) in [8, 12, 13]:  # Common barcode lengths
            confidence += 0.4
        elif len(text_clean) in [6, 14]:  # Less common but valid
            confidence += 0.3
        elif 8 <= len(text_clean) <= 14:  # Within reasonable range
            confidence += 0.2

        # Context scoring
        context_score = self._calculate_context_score(text)
        confidence += context_score * 0.3

        # Pattern consistency
        if self._has_consistent_digit_pattern(text_clean):
            confidence += 0.2

        # Not date-like
        if not self._is_likely_date_sequence(text, text):
            confidence += 0.1

        return confidence > 0.5, min(confidence, 1.0)


# Global service instance
_barcode_detection_service: Optional[BarcodeDetectionService] = None

def get_barcode_detection_service() -> BarcodeDetectionService:
    """Get singleton instance of barcode detection service"""
    global _barcode_detection_service
    if _barcode_detection_service is None:
        _barcode_detection_service = BarcodeDetectionService()
    return _barcode_detection_service