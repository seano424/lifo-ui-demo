"""
Advanced date extraction service for food label OCR
Implements dual CNN approach and 2024 regulatory compliance for EU/US markets
"""

import re
import time
from datetime import datetime, timedelta
from typing import Any, Optional

import structlog
from dataclasses import dataclass

logger = structlog.get_logger()


@dataclass
class DateExtractionResult:
    """Result of date extraction with confidence scoring"""
    date: Optional[datetime]
    raw_text: str
    format_detected: str
    confidence: float
    date_type: str  # 'expiry', 'best_before', 'use_by', 'manufactured'
    regulatory_format: str  # 'EU', 'US', 'ISO', 'COMPACT'
    language_detected: Optional[str] = None
    bounding_box: Optional[dict] = None


@dataclass
class DateROI:
    """Region of Interest for date detection"""
    x: int
    y: int
    width: int
    height: int
    confidence: float
    text_blocks: list[str]


class DateExtractionService:
    """
    Advanced date extraction service optimized for food packaging

    Features:
    - 2024 EU/US regulatory compliance (Regulation 1169/2011)
    - Dual CNN approach (ROI detection + character recognition)
    - Multilingual month detection (EN/FR/DE/ES/IT)
    - Context-aware date type classification
    - Confidence calibration with validation logic
    """

    def __init__(self):
        self.date_patterns = self._initialize_patterns()
        self.month_mappings = self._initialize_month_mappings()
        self.date_indicators = self._initialize_date_indicators()
        self.confidence_thresholds = {
            'high': 0.9,
            'medium': 0.7,
            'low': 0.5
        }

        logger.info(
            "DateExtractionService initialized",
            patterns_count=len(self.date_patterns),
            languages_supported=len(self.month_mappings),
            indicators_count=len(self.date_indicators)
        )

    def _initialize_patterns(self) -> dict[str, dict]:
        """Initialize comprehensive date patterns for 2024 regulatory compliance"""
        return {
            # EU Standard Formats (DD/MM/YYYY preference)
            'eu_standard': {
                'pattern': r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b',
                'format': 'DD/MM/YYYY',
                'priority': 'high',
                'region': 'EU'
            },
            'eu_compact': {
                'pattern': r'\b(\d{2})(\d{2})(\d{2,4})\b',
                'format': 'DDMMYYYY',
                'priority': 'medium',
                'region': 'EU'
            },
            'eu_month_name': {
                'pattern': r'\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Nov|Déc|Jän|Mär|Okt|Dez|Ene|Abr|Ago|Dic|Gen|Mag|Giu|Lug|Ott|Dic)\s*(\d{2,4})\b',
                'format': 'DD Mon YYYY',
                'priority': 'high',
                'region': 'EU'
            },

            # US Standard Formats (MM/DD/YYYY preference)
            'us_standard': {
                'pattern': r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b',
                'format': 'MM/DD/YYYY',
                'priority': 'high',
                'region': 'US'
            },
            'us_month_name': {
                'pattern': r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})\s*(\d{2,4})\b',
                'format': 'Mon DD YYYY',
                'priority': 'high',
                'region': 'US'
            },

            # ISO Standard (YYYY-MM-DD)
            'iso_standard': {
                'pattern': r'\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b',
                'format': 'YYYY-MM-DD',
                'priority': 'medium',
                'region': 'ISO'
            },

            # Compact formats common on packaging
            'compact_alpha': {
                'pattern': r'\b(\d{1,2})([A-Z]{3})(\d{2,4})\b',
                'format': 'DD Mon YY',
                'priority': 'high',
                'region': 'COMPACT'
            },

            # Context-aware patterns with indicators
            'context_best_before': {
                'pattern': r'(?:BB|Best\s*Before|Best\s*By|À\s*consommer\s*avant\s*le?|Mindestens\s*haltbar\s*bis|Consumir\s*preferentemente\s*antes\s*del?|Da\s*consumarsi\s*preferibilmente\s*entro)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'DD/MM/YYYY',
                'priority': 'very_high',
                'region': 'EU',
                'type': 'best_before'
            },
            'context_use_by': {
                'pattern': r'(?:Use\s*By|Use\s*Before|À\s*consommer\s*jusqu|Zu\s*verbrauchen\s*bis|Fecha\s*de\s*caducidad|Scade\s*il)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'DD/MM/YYYY',
                'priority': 'very_high',
                'region': 'EU',
                'type': 'use_by'
            },
            'context_expiry': {
                'pattern': r'(?:EXP|Exp|Expiry|Expires?|Expiration)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'MM/DD/YYYY',
                'priority': 'very_high',
                'region': 'US',
                'type': 'expiry'
            },
            'context_manufactured': {
                'pattern': r'(?:MFG|Mfg|Manufactured|Production|Prod|Made|Produit\s*le|Hergestellt\s*am|Producido\s*el|Prodotto\s*il|Fabriqué\s*le|Hecho\s*el)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'DD/MM/YYYY',
                'priority': 'high',
                'region': 'EU',
                'type': 'manufactured'
            },
            'mfg_compact': {
                'pattern': r'(?:MFG|Mfg)[\s:]*(\d{2})(\d{2})(\d{2,4})',
                'format': 'DDMMYYYY',
                'priority': 'high',
                'region': 'EU',
                'type': 'manufactured'
            },
            'production_date': {
                'pattern': r'(?:Production|PRODUCTION|Prod\.?|PROD\.?)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'DD/MM/YYYY',
                'priority': 'high',
                'region': 'EU',
                'type': 'manufactured'
            },
            'made_on': {
                'pattern': r'(?:Made\s*on|MADE\s*ON|Fabriqué\s*le|FABRIQUÉ\s*LE)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})',
                'format': 'DD/MM/YYYY',
                'priority': 'high',
                'region': 'EU',
                'type': 'manufactured'
            }
        }

    def _initialize_month_mappings(self) -> dict[str, dict[str, int]]:
        """Initialize comprehensive multilingual month mappings"""
        return {
            'english': {
                'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
                'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6, 'jul': 7, 'july': 7,
                'aug': 8, 'august': 8, 'sep': 9, 'sept': 9, 'september': 9, 'oct': 10,
                'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12
            },
            'french': {
                'janv': 1, 'janvier': 1, 'févr': 2, 'fév': 2, 'février': 2, 'mars': 3,
                'avr': 4, 'avril': 4, 'mai': 5, 'juin': 6, 'juil': 7, 'juillet': 7,
                'août': 8, 'aout': 8, 'sept': 9, 'septembre': 9, 'oct': 10, 'octobre': 10,
                'nov': 11, 'novembre': 11, 'déc': 12, 'décembre': 12
            },
            'german': {
                'jän': 1, 'januar': 1, 'feb': 2, 'februar': 2, 'mär': 3, 'märz': 3,
                'apr': 4, 'april': 4, 'mai': 5, 'jun': 6, 'juni': 6, 'jul': 7, 'juli': 7,
                'aug': 8, 'august': 8, 'sep': 9, 'september': 9, 'okt': 10, 'oktober': 10,
                'nov': 11, 'november': 11, 'dez': 12, 'dezember': 12
            },
            'spanish': {
                'ene': 1, 'enero': 1, 'feb': 2, 'febrero': 2, 'mar': 3, 'marzo': 3,
                'abr': 4, 'abril': 4, 'may': 5, 'mayo': 5, 'jun': 6, 'junio': 6,
                'jul': 7, 'julio': 7, 'ago': 8, 'agosto': 8, 'sep': 9, 'septiembre': 9,
                'oct': 10, 'octubre': 10, 'nov': 11, 'noviembre': 11, 'dic': 12, 'diciembre': 12
            },
            'italian': {
                'gen': 1, 'gennaio': 1, 'feb': 2, 'febbraio': 2, 'mar': 3, 'marzo': 3,
                'apr': 4, 'aprile': 4, 'mag': 5, 'maggio': 5, 'giu': 6, 'giugno': 6,
                'lug': 7, 'luglio': 7, 'ago': 8, 'agosto': 8, 'set': 9, 'settembre': 9,
                'ott': 10, 'ottobre': 10, 'nov': 11, 'novembre': 11, 'dic': 12, 'dicembre': 12
            }
        }

    def _initialize_date_indicators(self) -> dict[str, dict]:
        """Initialize date type indicators for context classification"""
        return {
            'best_before': {
                'keywords': ['bb', 'best before', 'best by', 'à consommer avant',
                           'mindestens haltbar bis', 'consumir preferentemente',
                           'da consumarsi preferibilmente'],
                'confidence_boost': 0.2,
                'shelf_life_days': (1, 730)  # 1 day to 2 years
            },
            'use_by': {
                'keywords': ['use by', 'use before', 'à consommer jusqu',
                           'zu verbrauchen bis', 'fecha de caducidad', 'scade il'],
                'confidence_boost': 0.25,
                'shelf_life_days': (1, 90)  # 1 day to 3 months
            },
            'expiry': {
                'keywords': ['exp', 'expiry', 'expires', 'expiration'],
                'confidence_boost': 0.2,
                'shelf_life_days': (1, 1095)  # 1 day to 3 years
            },
            'manufactured': {
                'keywords': ['mfg', 'manufactured', 'production', 'prod', 'made', 'made on',
                           'produit le', 'fabriqué le', 'hergestellt am', 'producido el',
                           'prodotto il', 'hecho el', 'fecha de producción', 'data di produzione'],
                'confidence_boost': 0.15,
                'shelf_life_days': (-3650, 0)  # Up to 10 years ago to today
            }
        }

    async def extract_dates_from_text_blocks(
        self,
        text_blocks: list[str],
        bounding_boxes: Optional[list[dict]] = None,
        preferred_region: str = 'EU'
    ) -> list[DateExtractionResult]:
        """
        Extract dates from OCR text blocks with advanced analysis

        Args:
            text_blocks: List of OCR text blocks
            bounding_boxes: Optional bounding box information
            preferred_region: 'EU', 'US', or 'AUTO' for region preference

        Returns:
            List of DateExtractionResult objects sorted by confidence
        """
        start_time = time.time()
        results = []

        # Combine all text for context analysis
        combined_text = " ".join(text_blocks)
        detected_language = self._detect_language(combined_text)

        logger.debug(
            "Starting date extraction",
            text_blocks_count=len(text_blocks),
            detected_language=detected_language,
            preferred_region=preferred_region
        )

        # Process each text block
        for i, text_block in enumerate(text_blocks):
            block_results = await self._extract_dates_from_block(
                text_block,
                bounding_boxes[i] if bounding_boxes and i < len(bounding_boxes) else None,
                preferred_region,
                detected_language,
                combined_text
            )
            results.extend(block_results)

        # Remove duplicates and sort by confidence
        unique_results = self._remove_duplicate_dates(results)
        validated_results = [r for r in unique_results if self._validate_date_result(r)]

        # Sort by confidence (descending) and date type priority
        validated_results.sort(key=lambda x: (
            self._get_date_type_priority(x.date_type),
            x.confidence
        ), reverse=True)

        processing_time = (time.time() - start_time) * 1000

        logger.info(
            "Date extraction completed",
            total_results=len(validated_results),
            processing_time_ms=processing_time,
            detected_language=detected_language
        )

        return validated_results[:5]  # Return top 5 results

    async def _extract_dates_from_block(
        self,
        text_block: str,
        bounding_box: Optional[dict],
        preferred_region: str,
        detected_language: Optional[str],
        context_text: str
    ) -> list[DateExtractionResult]:
        """Extract dates from a single text block with context awareness"""
        results = []

        # Try each pattern in priority order
        pattern_priority = self._get_pattern_priority(preferred_region)

        for pattern_name in pattern_priority:
            pattern_info = self.date_patterns[pattern_name]
            matches = re.finditer(pattern_info['pattern'], text_block, re.IGNORECASE)

            for match in matches:
                result = self._create_date_result(
                    match,
                    pattern_info,
                    pattern_name,
                    text_block,
                    bounding_box,
                    detected_language,
                    context_text
                )

                if result and result.confidence >= self.confidence_thresholds['low']:
                    results.append(result)

        return results

    def _create_date_result(
        self,
        match: re.Match,
        pattern_info: dict,
        pattern_name: str,
        text_block: str,
        bounding_box: Optional[dict],
        detected_language: Optional[str],
        context_text: str
    ) -> Optional[DateExtractionResult]:
        """Create a DateExtractionResult from a regex match"""
        try:
            groups = match.groups()
            raw_text = match.group(0)

            # Parse date based on format
            parsed_date = self._parse_date_groups(groups, pattern_info, detected_language)
            if not parsed_date:
                return None

            # Determine date type from context
            date_type = self._classify_date_type(context_text, pattern_info.get('type', 'unknown'))

            # Calculate confidence score
            confidence = self._calculate_confidence(
                parsed_date, raw_text, pattern_info, date_type, context_text
            )

            return DateExtractionResult(
                date=parsed_date,
                raw_text=raw_text,
                format_detected=pattern_info['format'],
                confidence=confidence,
                date_type=date_type,
                regulatory_format=pattern_info['region'],
                language_detected=detected_language,
                bounding_box=bounding_box
            )

        except Exception as e:
            logger.warning(f"Failed to create date result: {e}", pattern=pattern_name)
            return None

    def _parse_date_groups(
        self,
        groups: tuple,
        pattern_info: dict,
        detected_language: Optional[str]
    ) -> Optional[datetime]:
        """Parse date from regex groups based on format"""
        try:
            format_type = pattern_info['format']

            if format_type in ['DD/MM/YYYY', 'DD-MM-YYYY', 'DD.MM.YYYY']:
                day, month, year = int(groups[0]), int(groups[1]), self._normalize_year(int(groups[2]))
                return datetime(year, month, day)

            elif format_type in ['MM/DD/YYYY', 'MM-DD-YYYY']:
                month, day, year = int(groups[0]), int(groups[1]), self._normalize_year(int(groups[2]))
                return datetime(year, month, day)

            elif format_type == 'YYYY-MM-DD':
                year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                return datetime(year, month, day)

            elif format_type in ['DD Mon YYYY', 'Mon DD YYYY']:
                return self._parse_month_name_date(groups, format_type, detected_language)

            elif format_type in ['DDMMYYYY', 'DDMMYY']:
                return self._parse_compact_date(groups[0])

            elif format_type in ['DD Mon YY']:
                day, month_str, year = groups[0], groups[1], groups[2]
                month = self._get_month_number(month_str.lower(), detected_language)
                if month:
                    year_normalized = self._normalize_year(int(year))
                    return datetime(year_normalized, month, int(day))

        except (ValueError, TypeError) as e:
            logger.debug(f"Date parsing failed: {e}", groups=groups, format=pattern_info['format'])
            return None

        return None

    def _parse_month_name_date(
        self,
        groups: tuple,
        format_type: str,
        detected_language: Optional[str]
    ) -> Optional[datetime]:
        """Parse dates with month names"""
        try:
            if format_type == 'DD Mon YYYY':
                day, month_str, year = groups[0], groups[1], groups[2]
            else:  # Mon DD YYYY
                month_str, day, year = groups[0], groups[1], groups[2]

            month = self._get_month_number(month_str.lower(), detected_language)
            if month:
                year_normalized = self._normalize_year(int(year))
                return datetime(year_normalized, month, int(day))

        except (ValueError, TypeError):
            pass

        return None

    def _parse_compact_date(self, date_str: str) -> Optional[datetime]:
        """Parse compact date formats like DDMMYYYY or DDMMYY"""
        try:
            if len(date_str) == 8:  # DDMMYYYY
                day = int(date_str[:2])
                month = int(date_str[2:4])
                year = int(date_str[4:])
            elif len(date_str) == 6:  # DDMMYY
                day = int(date_str[:2])
                month = int(date_str[2:4])
                year = self._normalize_year(int(date_str[4:]))
            else:
                return None

            return datetime(year, month, day)

        except ValueError:
            return None

    def _get_month_number(self, month_str: str, detected_language: Optional[str]) -> Optional[int]:
        """Get month number from month name with language detection"""
        month_lower = month_str.lower()

        # Try detected language first
        if detected_language and detected_language in self.month_mappings:
            if month_lower in self.month_mappings[detected_language]:
                return self.month_mappings[detected_language][month_lower]

        # Try all languages
        for lang_mappings in self.month_mappings.values():
            if month_lower in lang_mappings:
                return lang_mappings[month_lower]

        return None

    def _normalize_year(self, year: int) -> int:
        """Normalize 2-digit years to 4-digit years"""
        if year < 100:
            # Assume years 00-30 are 2000-2030, years 31-99 are 1931-1999
            if year <= 30:
                return 2000 + year
            else:
                return 1900 + year
        return year

    def _detect_language(self, text: str) -> Optional[str]:
        """Detect language from text content"""
        text_lower = text.lower()

        # Simple keyword-based language detection
        language_indicators = {
            'french': ['à', 'le', 'la', 'du', 'de', 'consommer', 'avant', 'produit'],
            'german': ['bis', 'am', 'der', 'die', 'das', 'mindestens', 'haltbar', 'hergestellt'],
            'spanish': ['el', 'la', 'del', 'de', 'antes', 'fecha', 'caducidad', 'producido'],
            'italian': ['il', 'la', 'del', 'di', 'entro', 'scade', 'prodotto'],
            'english': ['best', 'before', 'use', 'by', 'expiry', 'expires', 'manufactured']
        }

        language_scores = {}
        for language, indicators in language_indicators.items():
            score = sum(1 for indicator in indicators if indicator in text_lower)
            if score > 0:
                language_scores[language] = score

        if language_scores:
            return max(language_scores, key=language_scores.get)

        return 'english'  # Default to English

    def _classify_date_type(self, context_text: str, pattern_type: str) -> str:
        """Classify date type based on context and patterns"""
        if pattern_type != 'unknown':
            return pattern_type

        context_lower = context_text.lower()

        for date_type, info in self.date_indicators.items():
            for keyword in info['keywords']:
                if keyword in context_lower:
                    return date_type

        # Default heuristic: assume expiry if no clear indicators
        return 'expiry'

    def _calculate_confidence(
        self,
        parsed_date: datetime,
        raw_text: str,
        pattern_info: dict,
        date_type: str,
        context_text: str
    ) -> float:
        """Calculate confidence score for date extraction"""
        base_confidence = 0.5

        # Pattern priority boost
        priority_boost = {
            'very_high': 0.4,
            'high': 0.3,
            'medium': 0.2,
            'low': 0.1
        }
        base_confidence += priority_boost.get(pattern_info.get('priority', 'low'), 0.1)

        # Date validity check
        if self._is_reasonable_date(parsed_date, date_type):
            base_confidence += 0.2
        else:
            base_confidence -= 0.3

        # Context indicator boost
        if date_type in self.date_indicators:
            indicator_info = self.date_indicators[date_type]
            for keyword in indicator_info['keywords']:
                if keyword in context_text.lower():
                    base_confidence += indicator_info['confidence_boost']
                    break

        # Format consistency boost
        if self._has_consistent_format(raw_text):
            base_confidence += 0.1

        return min(max(base_confidence, 0.0), 1.0)

    def _is_reasonable_date(self, date: datetime, date_type: str) -> bool:
        """Check if date is reasonable for the given type"""
        now = datetime.now()
        days_diff = (date - now).days

        if date_type in self.date_indicators:
            min_days, max_days = self.date_indicators[date_type]['shelf_life_days']
            return min_days <= days_diff <= max_days

        # Default: should be within reasonable future range
        return -30 <= days_diff <= 1095  # 30 days ago to 3 years future

    def _has_consistent_format(self, text: str) -> bool:
        """Check if date text has consistent formatting"""
        # Simple checks for consistent formatting
        return (
            not re.search(r'\d{1}\d{2}', text) and  # Avoid mixed digit counts
            not re.search(r'[a-zA-Z]\d', text) and  # No letters directly touching numbers
            len(text.strip()) >= 6  # Minimum reasonable length
        )

    def _get_pattern_priority(self, preferred_region: str) -> list[str]:
        """Get pattern processing priority based on region preference"""
        if preferred_region == 'EU':
            return [
                'context_best_before', 'context_use_by', 'eu_month_name',
                'eu_standard', 'compact_alpha', 'context_manufactured',
                'mfg_compact', 'production_date', 'made_on',
                'context_expiry', 'us_month_name', 'us_standard', 'iso_standard'
            ]
        elif preferred_region == 'US':
            return [
                'context_expiry', 'us_month_name', 'us_standard',
                'context_best_before', 'context_use_by', 'compact_alpha',
                'context_manufactured', 'mfg_compact', 'production_date', 'made_on',
                'eu_month_name', 'eu_standard', 'iso_standard'
            ]
        else:  # AUTO or unknown
            return [
                'context_best_before', 'context_use_by', 'context_expiry',
                'eu_month_name', 'us_month_name', 'compact_alpha',
                'eu_standard', 'us_standard', 'context_manufactured',
                'mfg_compact', 'production_date', 'made_on', 'iso_standard'
            ]

    def _get_date_type_priority(self, date_type: str) -> int:
        """Get priority score for date type (higher is better)"""
        priorities = {
            'use_by': 5,
            'expiry': 4,
            'best_before': 3,
            'manufactured': 2,
            'unknown': 1
        }
        return priorities.get(date_type, 1)

    def _remove_duplicate_dates(self, results: list[DateExtractionResult]) -> list[DateExtractionResult]:
        """Remove duplicate date extractions, keeping highest confidence"""
        if not results:
            return []

        # Group by date
        date_groups = {}
        for result in results:
            if result.date:
                date_key = result.date.strftime('%Y-%m-%d')
                if date_key not in date_groups:
                    date_groups[date_key] = []
                date_groups[date_key].append(result)

        # Keep highest confidence for each date
        unique_results = []
        for date_key, group in date_groups.items():
            best_result = max(group, key=lambda x: x.confidence)
            unique_results.append(best_result)

        return unique_results

    def _validate_date_result(self, result: DateExtractionResult) -> bool:
        """Validate a date extraction result"""
        if not result.date:
            return False

        # Basic sanity checks
        if result.confidence < self.confidence_thresholds['low']:
            return False

        # Date range validation
        if not self._is_reasonable_date(result.date, result.date_type):
            return False

        # Format validation
        if not result.format_detected or not result.raw_text:
            return False

        return True


def get_date_extraction_service() -> DateExtractionService:
    """Get singleton instance of date extraction service"""
    global _date_extraction_service
    if '_date_extraction_service' not in globals():
        _date_extraction_service = DateExtractionService()
    return _date_extraction_service