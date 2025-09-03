"""
Product scanning service with Google Vision API for OCR and barcode detection
Focused on complex image processing while frontend handles simple product lookups
"""

import asyncio
import re
from datetime import datetime, timedelta
from typing import Any

import structlog

from app.models.base import ConfigurableModel
from app.services.vision_service import GoogleVisionService, VisionScanResult

logger = structlog.get_logger()


class ProductScanResult(ConfigurableModel):
    """OCR and barcode scanning result focused on Google Vision processing"""

    # Vision processing results
    vision_result: VisionScanResult

    # Extracted data from image processing
    primary_barcode: str | None = None
    suggested_expiry_date: datetime | None = None
    confidence_score: float = 0.0

    # OCR extracted text suggestions
    suggested_name: str | None = None
    raw_text_blocks: list[str] = []

    # Processing metadata
    processing_time_ms: float = 0.0
    data_sources: list[str] = ["google_vision"]
    requires_user_confirmation: bool = True

    # Quality indicators
    barcode_confidence: float = 0.0
    expiry_confidence: float = 0.0


class ScanningWorkflow(ConfigurableModel):
    """Scanning workflow configuration focused on vision processing"""

    enable_barcode_detection: bool = True
    enable_expiry_extraction: bool = True
    enable_text_extraction: bool = True
    require_user_confirmation: bool = True
    confidence_threshold: float = 0.7
    max_processing_time_ms: float = 5000


class ProductScanningError(Exception):
    """Custom exception for product scanning errors"""

    def __init__(self, message: str, error_type: str = "processing_error"):
        self.message = message
        self.error_type = error_type
        super().__init__(message)


class ProductScanningService:
    """
    Product scanning service for Google Vision API
    Focused on OCR, barcode detection, and text extraction
    """

    def __init__(self, vision_service: GoogleVisionService | None = None):
        """Initialize scanning service with vision API client"""
        self.vision_service = vision_service or GoogleVisionService()

        # Default workflow configuration
        self.default_workflow = ScanningWorkflow()

        # Date metadata storage
        self._last_selected_date_metadata: (
            dict[str, dict[str, Any] | int | str] | None
        ) = None
        self._last_dual_dates = {"expiry_date": None, "manufacture_date": None}

    async def scan_product_image(
        self, image_data: bytes, workflow: ScanningWorkflow | None = None
    ) -> ProductScanResult:
        """
        Perform image scanning focused on OCR and barcode detection

        Args:
            image_data: Raw image bytes
            workflow: Scanning workflow configuration

        Returns:
            OCR and barcode scanning result
        """
        workflow = workflow or self.default_workflow
        start_time = datetime.now()

        try:
            # Step 1: Process image with Google Vision
            logger.info("Starting vision processing")
            vision_result = await self._process_image_with_timeout(
                image_data, timeout_ms=workflow.max_processing_time_ms
            )

            # Step 2: Extract primary barcode
            primary_barcode = self._extract_primary_barcode(vision_result)
            logger.info(f"Primary barcode detected: {primary_barcode}")

            # Step 3: Extract expiry date suggestions
            suggested_expiry = self._extract_best_expiry_date(vision_result)

            # Step 4: Generate text-based suggestions from OCR
            suggestions = self._generate_text_suggestions(vision_result)

            # Step 5: Calculate confidence scores
            confidence_scores = self._calculate_confidence_scores(
                vision_result, primary_barcode, suggested_expiry
            )

            # Step 6: Build result
            processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000

            result = ProductScanResult(
                vision_result=vision_result,
                primary_barcode=primary_barcode,
                suggested_expiry_date=suggested_expiry,
                confidence_score=confidence_scores["overall"],
                suggested_name=suggestions.get("name"),
                raw_text_blocks=[ocr.text for ocr in vision_result.raw_text],
                processing_time_ms=processing_time_ms,
                barcode_confidence=confidence_scores["barcode"],
                expiry_confidence=confidence_scores["expiry"],
                requires_user_confirmation=self._requires_user_confirmation(
                    confidence_scores["overall"], workflow.confidence_threshold
                ),
            )

            logger.info(
                "Product scanning completed",
                barcode=primary_barcode,
                has_expiry=suggested_expiry is not None,
                confidence=confidence_scores["overall"],
                processing_time_ms=processing_time_ms,
            )

            # Store dual dates for API access
            dual_dates = self._select_best_manufacture_and_expiry_dates(vision_result)
            self._last_dual_dates = dual_dates

            return result

        except Exception as e:
            processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(
                "Product scanning failed",
                error=str(e),
                processing_time_ms=processing_time_ms,
            )
            raise ProductScanningError(f"Image processing failed: {str(e)}") from e

    async def extract_primary_barcode(self, image_data: bytes) -> str | None:
        """Extract primary barcode from image - simple wrapper for frontend"""
        try:
            vision_result = await self._process_image_with_timeout(
                image_data, timeout_ms=3000
            )
            return self._extract_primary_barcode(vision_result)
        except Exception as e:
            logger.warning(f"Barcode extraction failed: {e}")
            return None

    async def extract_expiry_date(self, image_data: bytes) -> datetime | None:
        """Extract expiry date from image - simple wrapper for frontend"""
        try:
            vision_result = await self._process_image_with_timeout(
                image_data, timeout_ms=4000
            )
            return self._extract_best_expiry_date(vision_result)
        except Exception as e:
            logger.warning(f"Expiry date extraction failed: {e}")
            return None

    async def _process_image_with_timeout(
        self, image_data: bytes, timeout_ms: float
    ) -> VisionScanResult:
        """Process image with timeout protection"""
        try:
            return await asyncio.wait_for(
                self.vision_service.process_image(image_data), timeout=timeout_ms / 1000
            )
        except TimeoutError as e:
            raise ProductScanningError(
                f"Vision processing timed out after {timeout_ms}ms",
                error_type="timeout_error",
            ) from e

    def _extract_primary_barcode(self, vision_result: VisionScanResult) -> str | None:
        """Extract the most confident barcode from vision results"""
        if not vision_result.barcodes:
            return None

        # Sort by confidence and return the best one
        best_barcode = max(vision_result.barcodes, key=lambda b: b.confidence)

        if best_barcode.confidence >= 0.6:  # Minimum confidence threshold
            return best_barcode.value

        return None

    def _extract_all_dates_with_classification(
        self, vision_result: VisionScanResult
    ) -> list[dict]:
        """Extract and classify ALL dates as manufacture vs expiry for dual extraction"""

        all_candidate_dates = []

        # Collect dates from regular expiry detection
        if vision_result.expiry_dates:
            for expiry in vision_result.expiry_dates:
                if (
                    expiry.confidence >= 0.3 and expiry.date
                ):  # Lower threshold to capture more candidates
                    raw_text = getattr(expiry, "raw_text", "")
                    date_type, type_confidence, detected_language = (
                        self._detect_european_date_type(raw_text)
                    )

                    candidate = {
                        "date": expiry.date,
                        "confidence": expiry.confidence,
                        "source": "expiry_detection",
                        "raw_text": raw_text,
                        "context_score": self._calculate_expiry_context_score(raw_text),
                        "date_type": date_type,
                        "type_confidence": type_confidence,
                        "detected_language": detected_language,
                    }
                    candidate["purpose"] = self._classify_date_purpose(candidate)
                    all_candidate_dates.append(candidate)

        # Collect dates from barcode field (fallback for misclassified dates)
        if vision_result.barcodes:
            for barcode in vision_result.barcodes:
                barcode_value = barcode.value.strip()
                parsed_date = self._try_parse_barcode_as_date(barcode_value)
                if parsed_date:
                    # Try to detect date type from surrounding context (if any)
                    date_type, type_confidence, detected_language = (
                        self._detect_european_date_type(barcode_value)
                    )

                    candidate = {
                        "date": parsed_date,
                        "confidence": barcode.confidence
                        * 0.8,  # Slightly lower confidence for barcode-sourced dates
                        "source": "barcode_parsing",
                        "raw_text": barcode_value,
                        "context_score": 0.5,  # Neutral context score for barcode dates
                        "date_type": date_type if date_type != "unknown" else "unknown",
                        "type_confidence": type_confidence
                        if date_type != "unknown"
                        else 0.3,
                        "detected_language": detected_language
                        if detected_language != "unknown"
                        else "unknown",
                    }
                    candidate["purpose"] = self._classify_date_purpose(candidate)
                    all_candidate_dates.append(candidate)

        # Collect dates from text fragments (for fragmented date detection)
        text_dates = self._extract_dates_from_text_fragments(vision_result.raw_text)
        for text_date in text_dates:
            text_date["purpose"] = self._classify_date_purpose(text_date)
        all_candidate_dates.extend(text_dates)

        return all_candidate_dates

    def _extract_best_expiry_date(
        self, vision_result: VisionScanResult
    ) -> datetime | None:
        """Extract the best expiry date (legacy method for backward compatibility)"""
        dual_dates = self._select_best_manufacture_and_expiry_dates(vision_result)
        return dual_dates.get("expiry_date")

    def _select_best_manufacture_and_expiry_dates(
        self, vision_result: VisionScanResult
    ) -> dict:
        """Select best manufacture date AND best expiry date from all candidates"""

        all_candidates = self._extract_all_dates_with_classification(vision_result)

        if not all_candidates:
            return {"expiry_date": None, "manufacture_date": None, "metadata": {}}

        # Separate by purpose
        expiry_candidates = [c for c in all_candidates if c["purpose"] == "expiry"]
        manufacture_candidates = [
            c for c in all_candidates if c["purpose"] == "manufacture"
        ]
        unknown_candidates = [c for c in all_candidates if c["purpose"] == "unknown"]

        # Select best expiry date
        best_expiry = None
        expiry_metadata = {}

        if expiry_candidates:
            # Prioritize by context strength, then by confidence (no date preference)
            best_expiry_candidate = max(
                expiry_candidates,
                key=lambda x: (
                    self._get_expiry_priority_score(x["date_type"]),
                    x["type_confidence"],
                ),
            )
            best_expiry = best_expiry_candidate["date"]
            expiry_metadata = {
                "context": best_expiry_candidate.get("date_type", "unknown"),
                "confidence": best_expiry_candidate.get("type_confidence", 0.3),
                "language": best_expiry_candidate.get("detected_language", "unknown"),
                "raw_context": best_expiry_candidate.get("raw_text", ""),
                "source": best_expiry_candidate.get("source", "unknown"),
            }
        elif unknown_candidates:
            # Fallback: use latest unknown date as expiry
            best_unknown = max(unknown_candidates, key=lambda x: x["date"])
            best_expiry = best_unknown["date"]
            expiry_metadata = {
                "context": "inferred_from_latest_date",
                "confidence": 0.5,
                "source": best_unknown.get("source", "unknown"),
            }

        # Select best manufacture date
        best_manufacture = None
        manufacture_metadata = {}

        if manufacture_candidates:
            # For manufacture dates, prefer highest confidence
            best_manufacture_candidate = max(
                manufacture_candidates, key=lambda x: x["type_confidence"]
            )
            best_manufacture = best_manufacture_candidate["date"]
            manufacture_metadata = {
                "context": best_manufacture_candidate.get("date_type", "unknown"),
                "confidence": best_manufacture_candidate.get("type_confidence", 0.3),
                "language": best_manufacture_candidate.get(
                    "detected_language", "unknown"
                ),
                "raw_context": best_manufacture_candidate.get("raw_text", ""),
                "source": best_manufacture_candidate.get("source", "unknown"),
            }
        elif len(unknown_candidates) > 1 and best_expiry:
            # Only infer manufacture date if we have strong evidence of multiple distinct dates
            # AND the expiry date was inferred (not definitively identified)
            remaining_unknowns = [
                c for c in unknown_candidates if c["date"] != best_expiry
            ]

            # Only infer manufacture date if:
            # 1. We have multiple remaining unknown dates after selecting expiry
            # 2. The expiry date confidence is low (meaning it was inferred, not definitive)
            # 3. There's a reasonable time gap between dates (not just OCR duplicates)
            if (
                remaining_unknowns
                and len(remaining_unknowns) >= 2
                and expiry_metadata.get("confidence", 0) < 0.7
            ):
                # Check if there's a reasonable time gap (at least 6 months)
                potential_manufacture = min(remaining_unknowns, key=lambda x: x["date"])
                if best_expiry and potential_manufacture["date"]:
                    time_diff = best_expiry - potential_manufacture["date"]
                    if time_diff.days >= 180:  # At least 6 months difference
                        best_manufacture = potential_manufacture["date"]
                        manufacture_metadata = {
                            "context": "inferred_from_earlier_date",
                            "confidence": 0.4,
                            "source": potential_manufacture.get("source", "unknown"),
                        }

            # If we have a definitive expiry date (like "BEST BY"), don't infer manufacture

        # Create comprehensive metadata
        combined_metadata = {
            "total_dates_detected": len(all_candidates),
            "expiry_candidates": len(expiry_candidates),
            "manufacture_candidates": len(manufacture_candidates),
            "unknown_candidates": len(unknown_candidates),
            "extraction_strategy": "dual_context_based"
            if (expiry_candidates and manufacture_candidates)
            else "temporal_inference",
            "expiry_metadata": expiry_metadata,
            "manufacture_metadata": manufacture_metadata,
        }

        # Store metadata for API response
        self._last_selected_date_metadata = combined_metadata

        logger.info(
            f"Dual date extraction: expiry={best_expiry}, manufacture={best_manufacture}, strategy={combined_metadata['extraction_strategy']}"
        )

        return {
            "expiry_date": best_expiry,
            "manufacture_date": best_manufacture,
            "metadata": combined_metadata,
        }

    def _get_expiry_priority_score(self, date_type: str) -> float:
        """Get priority score for expiry date types"""
        priority_scores = {
            "expiry_definitive": 1.0,  # EXP, MHD, THT - highest priority
            "expiry_quality": 0.8,  # BEST BY - medium priority
            "expiry_retail": 0.6,  # SELL BY - lower priority
            "unknown": 0.4,  # No context - lowest priority
        }
        return priority_scores.get(date_type, 0.0)

    def _try_parse_barcode_as_date(self, barcode_value: str) -> datetime | None:
        """Try to parse a barcode value as a date"""
        import re
        from datetime import datetime

        # Common date patterns that might be misclassified as barcodes
        date_patterns = [
            # DD/MM/YYYY or MM/DD/YYYY
            (r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$", "DD/MM/YYYY"),
            # YYYY/MM/DD
            (r"^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$", "YYYY/MM/DD"),
            # DD/MM/YY
            (r"^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$", "DD/MM/YY"),
        ]

        for pattern, format_name in date_patterns:
            match = re.match(pattern, barcode_value)
            if match:
                try:
                    groups = match.groups()

                    if format_name == "DD/MM/YYYY":
                        day, month, year = groups
                        parsed_date = datetime(int(year), int(month), int(day))
                    elif format_name == "YYYY/MM/DD":
                        year, month, day = groups
                        parsed_date = datetime(int(year), int(month), int(day))
                    elif format_name == "DD/MM/YY":
                        day, month, year = groups
                        year = int(year)
                        if year < 50:
                            year += 2000
                        else:
                            year += 1900
                        parsed_date = datetime(year, int(month), int(day))
                    else:
                        continue

                    # Validate date is reasonable (not too far in past/future)
                    now = datetime.now()
                    ten_years_ago = now - timedelta(days=10 * 365)
                    five_years_future = now + timedelta(days=5 * 365)

                    if ten_years_ago <= parsed_date <= five_years_future:
                        return parsed_date

                except (ValueError, IndexError):
                    continue

        return None

    # European month names dictionary
    EUROPEAN_MONTHS = {
        "en": {
            "jan": 1,
            "feb": 2,
            "mar": 3,
            "apr": 4,
            "may": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "oct": 10,
            "nov": 11,
            "dec": 12,
            "january": 1,
            "february": 2,
            "march": 3,
            "april": 4,
            "june": 6,
            "july": 7,
            "august": 8,
            "september": 9,
            "october": 10,
            "november": 11,
            "december": 12,
        },
        "fr": {
            "janv": 1,
            "févr": 2,
            "mars": 3,
            "avr": 4,
            "mai": 5,
            "juin": 6,
            "juil": 7,
            "août": 8,
            "sept": 9,
            "oct": 10,
            "nov": 11,
            "déc": 12,
            "janvier": 1,
            "février": 2,
            "avril": 4,
            "juillet": 7,
            "septembre": 9,
            "octobre": 10,
            "novembre": 11,
            "décembre": 12,
        },
        "de": {
            "jan": 1,
            "feb": 2,
            "mär": 3,
            "apr": 4,
            "mai": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "okt": 10,
            "nov": 11,
            "dez": 12,
            "januar": 1,
            "februar": 2,
            "märz": 3,
            "april": 4,
            "juni": 6,
            "juli": 7,
            "august": 8,
            "september": 9,
            "oktober": 10,
            "november": 11,
            "dezember": 12,
        },
        "nl": {
            "jan": 1,
            "feb": 2,
            "mrt": 3,
            "apr": 4,
            "mei": 5,
            "jun": 6,
            "jul": 7,
            "aug": 8,
            "sep": 9,
            "okt": 10,
            "nov": 11,
            "dec": 12,
            "januari": 1,
            "februari": 2,
            "maart": 3,
            "april": 4,
            "juni": 6,
            "juli": 7,
            "augustus": 8,
            "september": 9,
            "oktober": 10,
            "november": 11,
            "december": 12,
        },
    }

    # Enhanced European date context classification for dual extraction
    EUROPEAN_DATE_CONTEXT = {
        "expiry_definitive": {  # Clear expiry indicators - highest priority
            "en": [
                "exp",
                "expires",
                "expiry",
                "expiration date",
                "use by",
                "consume by",
            ],
            "fr": [
                "exp",
                "expire le",
                "péremption",
                "à consommer jusqu'au",
                "à consommer avant le",
            ],
            "de": [
                "mhd",
                "mindesthaltbarkeitsdatum",
                "verfällt am",
                "haltbar bis",
                "verbrauchen bis",
            ],
            "nl": [
                "tht",
                "ten minste houdbaar tot",
                "vervalt op",
                "houdbaar tot",
                "consumeren voor",
            ],
        },
        "expiry_quality": {  # Quality dates (still expiry-related) - medium priority
            "en": ["best by", "best before", "bb"],
            "fr": [
                "à consommer de préférence avant",
                "dlc",
                "de préférence avant",
                "acpav",
            ],
            "de": ["mindestens haltbar bis"],
            "nl": ["ten minste houdbaar", "minste houdbaar"],
        },
        "expiry_retail": {  # Retail guidance - lower priority but still expiry
            "en": ["sell by", "sell before"],
            "fr": ["à vendre avant", "vente avant"],
            "de": ["verkaufen bis", "verkauf bis"],
            "nl": ["verkopen voor", "te verkopen tot"],
        },
        "manufacture_definitive": {  # Clear manufacture indicators
            "en": ["pro", "prod", "manufactured", "made", "packed", "production date"],
            "fr": [
                "pro",
                "fab",
                "fabriqué le",
                "produit le",
                "date de production",
                "emballé le",
            ],
            "de": [
                "hergestellt am",
                "produziert am",
                "herst",
                "prod",
                "produktionsdatum",
            ],
            "nl": ["geproduceerd op", "gemaakt op", "verpakt op", "productiedatum"],
        },
    }

    def _detect_european_date_type(self, text: str) -> tuple[str, float, str]:
        """Detect date type with enhanced European language support for dual extraction"""
        if not text:
            return "unknown", 0.3, "unknown"

        text_lower = text.lower().strip()

        # Normalize common European characters for better matching
        text_normalized = (
            text_lower.replace("ä", "a")
            .replace("ö", "o")
            .replace("ü", "u")
            .replace("é", "e")
            .replace("è", "e")
            .replace("à", "a")
            .replace("ç", "c")
            .replace("ê", "e")
            .replace("ô", "o")
        )

        best_match = ("unknown", 0.3, "unknown")

        for context_category, languages in self.EUROPEAN_DATE_CONTEXT.items():
            for lang, keywords in languages.items():
                for keyword in keywords:
                    keyword_normalized = keyword.lower()

                    # Check for exact match or keyword as substring
                    if keyword_normalized in text_normalized:
                        # Base confidence based on keyword length and specificity
                        confidence = 0.95 if len(keyword) > 3 else 0.85

                        # High confidence for very specific European abbreviations
                        if keyword_normalized in ["mhd", "dlc", "tht", "exp", "pro"]:
                            confidence = 0.98

                        # Bonus confidence for definitive contexts
                        if context_category in [
                            "expiry_definitive",
                            "manufacture_definitive",
                        ]:
                            confidence += 0.02

                        # If this is a better match, update best_match
                        if confidence > best_match[1]:
                            best_match = (context_category, confidence, lang)

        return best_match

    def _classify_date_purpose(self, date_candidate: dict) -> str:
        """Classify date as expiry vs manufacture based on context"""
        context_type = date_candidate.get("date_type", "unknown")

        if context_type in ["expiry_definitive", "expiry_quality", "expiry_retail"]:
            return "expiry"
        elif context_type == "manufacture_definitive":
            return "manufacture"
        else:
            return "unknown"

    def _calculate_expiry_context_score(self, text: str) -> float:
        """Calculate context score based on expiry-related keywords near the date"""
        if not text:
            return 0.5

        # Use the new European date type detection
        date_type, confidence, language = self._detect_european_date_type(text)

        # Convert date type to score
        type_scores = {
            "expires": 0.9,  # Strongest expiry indicator
            "use_by": 0.85,  # Strong expiry indicator
            "best_by": 0.7,  # Quality indicator, but still expiry-related
            "sell_by": 0.6,  # Store guidance, less relevant for consumer
            "manufactured": 0.1,  # Production date, not expiry
            "unknown": 0.5,  # Neutral baseline
        }

        base_score = type_scores.get(date_type, 0.5)

        # Boost score based on detection confidence
        final_score = base_score + (confidence - 0.5) * 0.2

        return max(0.0, min(1.0, final_score))  # Clamp to [0.0, 1.0]

    def _extract_dates_from_text_fragments(self, text_blocks) -> list[dict]:
        """Extract dates from fragmented OCR text blocks"""
        import re
        from datetime import datetime

        candidate_dates: list[dict[str, Any]] = []

        if not text_blocks:
            return candidate_dates

        # Combine adjacent text blocks to handle fragmented dates
        combined_texts = []

        # Try different text combinations with reasonable search range
        for i in range(len(text_blocks)):
            for j in range(
                i + 1, min(i + 6, len(text_blocks) + 1)
            ):  # Look ahead up to 5 blocks
                combined_text = " ".join(
                    [block.text.strip() for block in text_blocks[i:j]]
                )
                combined_texts.append(
                    {
                        "text": combined_text,
                        "avg_confidence": sum(
                            block.confidence for block in text_blocks[i:j]
                        )
                        / (j - i),
                        "block_range": f"{i}-{j - 1}",
                    }
                )

        # Look for date patterns in combined texts
        date_patterns = [
            (r"(\d{1,2})[/\-\.\s]+(\d{1,2})[/\-\.\s]+(\d{4})", "DD/MM/YYYY"),
            (r"(\d{4})[/\-\.\s]+(\d{1,2})[/\-\.\s]+(\d{1,2})", "YYYY/MM/DD"),
            (r"(\d{1,2})[/\-\.\s]+(\d{1,2})[/\-\.\s]+(\d{2})", "DD/MM/YY"),
            # European month name patterns (e.g., "22NOV2017", "15 DEC 2024")
            (r"(\d{1,2})\s*([A-Za-zÀ-ÿ]{3,9})\s*(\d{4})", "DD MON YYYY"),
            (r"(\d{1,2})\s*([A-Za-zÀ-ÿ]{3,9})\s*(\d{2})", "DD MON YY"),
            # Partial date patterns (e.g., "SEP 30", "NOV 15", "DEC 2024")
            (r"([A-Za-zÀ-ÿ]{3,9})\s+(\d{1,2})(?:\s+(\d{4}))?", "MON DD [YYYY]"),
            (r"(\d{1,2})\s+([A-Za-zÀ-ÿ]{3,9})(?:\s+(\d{4}))?", "DD MON [YYYY]"),
        ]

        for text_combo in combined_texts:
            text = text_combo["text"]

            for pattern, format_name in date_patterns:
                matches = re.finditer(pattern, text)
                for match in matches:
                    try:
                        groups = match.groups()

                        if format_name == "DD/MM/YYYY":
                            day, month, year = groups
                            parsed_date = datetime(int(year), int(month), int(day))
                        elif format_name == "YYYY/MM/DD":
                            year, month, day = groups
                            parsed_date = datetime(int(year), int(month), int(day))
                        elif format_name == "DD/MM/YY":
                            day, month, year = groups
                            year = int(year)
                            if year < 50:
                                year += 2000
                            else:
                                year += 1900
                            parsed_date = datetime(year, int(month), int(day))
                        elif format_name in ["DD MON YYYY", "DD MON YY"]:
                            day, month_name, year = groups

                            # Parse European month name
                            month_num = self._parse_european_month(month_name)
                            if not month_num:
                                continue  # Skip if month not recognized

                            year = int(year)
                            if format_name == "DD MON YY":
                                if year < 50:
                                    year += 2000
                                else:
                                    year += 1900

                            parsed_date = datetime(year, month_num, int(day))
                        elif format_name in ["MON DD [YYYY]", "DD MON [YYYY]"]:
                            # Handle partial dates with simple current year inference
                            if format_name == "MON DD [YYYY]":
                                month_name, day, year = groups
                            else:  # DD MON [YYYY]
                                day, month_name, year = groups

                            # Parse European month name
                            month_num = self._parse_european_month(month_name)
                            if not month_num:
                                continue  # Skip if month not recognized

                            # Use provided year or infer current year (user's simple approach)
                            if year:
                                year = int(year)
                            else:
                                year = datetime.now().year

                            parsed_date = datetime(year, month_num, int(day))
                        else:
                            continue

                        # Validate date is reasonable
                        now = datetime.now()
                        ten_years_ago = now - timedelta(days=10 * 365)
                        five_years_future = now + timedelta(days=5 * 365)

                        if ten_years_ago <= parsed_date <= five_years_future:
                            # Detect date type from text context
                            date_type, type_confidence, detected_language = (
                                self._detect_european_date_type(text)
                            )

                            candidate_dates.append(
                                {
                                    "date": parsed_date,
                                    "confidence": text_combo["avg_confidence"]
                                    * 0.7,  # Lower confidence for text parsing
                                    "source": "text_fragment_parsing",
                                    "raw_text": text,
                                    "context_score": self._calculate_expiry_context_score(
                                        text
                                    ),
                                    "date_type": date_type,
                                    "type_confidence": type_confidence,
                                    "detected_language": detected_language,
                                }
                            )

                    except (ValueError, IndexError):
                        continue

        return candidate_dates

    def _select_best_expiry_date(self, candidate_dates: list[dict]) -> dict | None:
        """Select the best expiry date from candidates using European date type priority"""
        if not candidate_dates:
            return None

        # Priority ranking for European date types
        date_type_priority = {
            "expires": 1.0,  # Highest priority - clear expiry dates
            "use_by": 0.9,  # High priority - food safety dates
            "best_by": 0.7,  # Medium priority - quality dates
            "sell_by": 0.6,  # Lower priority - retail guidance
            "unknown": 0.5,  # Neutral - no clear type detected
            "manufactured": 0.1,  # Lowest priority - production dates
        }

        # Score each candidate based on date type, confidence, and context
        for candidate in candidate_dates:
            date_type = candidate.get("date_type", "unknown")
            type_confidence = candidate.get("type_confidence", 0.3)
            ocr_confidence = candidate.get("confidence", 0.5)

            # Calculate composite score
            type_score = date_type_priority.get(date_type, 0.5)
            composite_score = (
                type_score * 0.4  # Date type priority (40%)
                + type_confidence * 0.3  # Type detection confidence (30%)
                + ocr_confidence * 0.3  # OCR confidence (30%)
            )

            candidate["composite_score"] = composite_score

        # Sort by composite score and return the best one
        candidate_dates.sort(key=lambda x: x["composite_score"], reverse=True)
        best_candidate = candidate_dates[0]

        # If the best candidate has very low score, try date-based fallback
        if best_candidate["composite_score"] < 0.4:
            # Fallback: return the latest date if no clear type indicators
            latest_date = max(candidate_dates, key=lambda x: x["date"])
            logger.info(
                f"Selected latest date fallback: {latest_date['date']} (low type confidence)"
            )
            return latest_date

        logger.info(
            f"Selected date by type priority: {best_candidate['date']} "
            f"(type: {best_candidate.get('date_type', 'unknown')}, "
            f"lang: {best_candidate.get('detected_language', 'unknown')}, "
            f"score: {best_candidate['composite_score']:.2f})"
        )

        return best_candidate

    def _parse_european_month(self, month_name: str) -> int | None:
        """Parse European month name to month number"""
        if not month_name:
            return None

        month_lower = month_name.lower().strip()

        # Normalize European characters
        month_normalized = (
            month_lower.replace("ä", "a")
            .replace("ö", "o")
            .replace("ü", "u")
            .replace("é", "e")
            .replace("è", "e")
            .replace("à", "a")
            .replace("ç", "c")
            .replace("ê", "e")
            .replace("ô", "o")
            .replace("ß", "ss")
        )

        # Check all European month dictionaries
        for _lang, months in self.EUROPEAN_MONTHS.items():
            if month_normalized in months:
                return months[month_normalized]

        return None

    def get_last_date_metadata(self) -> dict | None:
        """Get metadata for the last selected expiry date"""
        return self._last_selected_date_metadata

    def _construct_product_name(
        self, text_blocks: list[str], raw_ocr: list
    ) -> str | None:
        """Universal product name construction using intelligent text analysis"""

        # Filter and score text blocks
        candidate_blocks = self._filter_and_score_name_blocks(text_blocks)

        if not candidate_blocks:
            return None

        # Try different name construction strategies
        strategies = [
            self._strategy_brand_product_descriptor,
            self._strategy_longest_meaningful_sequence,
            self._strategy_high_confidence_blocks,
            self._strategy_alphabetic_blocks,
        ]

        for strategy in strategies:
            result = strategy(candidate_blocks)
            if result and len(result.strip()) >= 3:
                return self._clean_product_name(result)

        return None

    def _filter_and_score_name_blocks(self, text_blocks: list[str]) -> list[dict]:
        """Filter and score text blocks for product name relevance"""
        candidates = []

        for block in text_blocks:
            if not block or len(block.strip()) < 2:
                continue

            block = block.strip()
            score = self._calculate_name_relevance_score(block)

            if score > 0:  # Only include blocks with positive relevance
                candidates.append(
                    {
                        "text": block,
                        "score": score,
                        "category": self._classify_text_category(block),
                    }
                )

        # Sort by relevance score
        candidates.sort(key=lambda x: float(x["score"]) if isinstance(x["score"], (int, float, str)) else 0.0, reverse=True)
        return candidates

    def _calculate_name_relevance_score(self, block: str) -> float:
        """Calculate how likely a text block is part of a product name"""
        score = 0.0
        block_upper = block.upper()

        # Negative indicators (reduce score)
        if block.isdigit():
            return -1.0  # Pure numbers are rarely product names

        if re.match(r"^\d+[/\-.]\d+[/\-.]\d+$", block):
            return -1.0  # Dates

        if re.match(r"^\d+[ML]?G?L?OZ?$", block_upper):
            return -0.5  # Weights/volumes

        if block_upper in ["EXP", "PRO", "MHD", "BB", "DLC", "BEST", "BY", "USE"]:
            return -1.0  # Date keywords

        if len(block) == 1:
            return -0.5  # Single characters

        # Positive indicators (increase score)
        base_score = 0.3  # Base score for any text

        # Length bonus (optimal length for product names)
        if 3 <= len(block) <= 12:
            score += 0.2
        elif len(block) > 12:
            score -= 0.1  # Very long blocks are less likely to be product names

        # Alphabetic content bonus
        if block.isalpha():
            score += 0.3
        elif any(c.isalpha() for c in block):
            score += 0.1

        # Mixed case suggests brand names
        if block.istitle() or (
            any(c.isupper() for c in block) and any(c.islower() for c in block)
        ):
            score += 0.2

        # All caps suggests brand/product names
        elif block.isupper() and len(block) >= 3:
            score += 0.15

        # Common product-related words (generic approach)
        food_indicators = [
            # Common food categories
            "MILK",
            "CHEESE",
            "BREAD",
            "JUICE",
            "WATER",
            "YOGURT",
            "BUTTER",
            "CREAM",
            "SOUP",
            "SAUCE",
            "OIL",
            "PASTA",
            "RICE",
            "BEANS",
            "MEAT",
            "FISH",
            "CHICKEN",
            "BEEF",
            "PORK",
            "HAM",
            "BACON",
            "EGGS",
            "FLOUR",
            "SUGAR",
            "SALT",
            "PEPPER",
            # Beverages
            "COFFEE",
            "TEA",
            "SODA",
            "COLA",
            "BEER",
            "WINE",
            "JUICE",
            "SMOOTHIE",
            # Snacks/packaged foods
            "CHIPS",
            "COOKIES",
            "CRACKERS",
            "NUTS",
            "CHOCOLATE",
            "CANDY",
            "GUM",
            "CEREAL",
            "BARS",
            "PIZZA",
            "SANDWICH",
            "SALAD",
        ]

        brand_indicators = [
            # Major brands (generic approach - not hardcoded to specific stores)
            "ORGANIC",
            "NATURAL",
            "PREMIUM",
            "SELECT",
            "CHOICE",
            "FRESH",
            "PURE",
            "CLASSIC",
            "ORIGINAL",
            "TRADITIONAL",
            "ARTISAN",
            "GOURMET",
            "DELUXE",
        ]

        descriptive_indicators = [
            "REDUCED",
            "FAT",
            "FREE",
            "LOW",
            "HIGH",
            "EXTRA",
            "LIGHT",
            "DIET",
            "WHOLE",
            "SKIM",
            "SEMI",
            "FULL",
            "THICK",
            "THIN",
            "CREAMY",
            "SMOOTH",
            "CRUNCHY",
            "SOFT",
            "HARD",
            "HOT",
            "MILD",
            "SWEET",
            "SOUR",
            "SPICY",
        ]

        # Check for food/product indicators
        if any(indicator in block_upper for indicator in food_indicators):
            score += 0.4

        if any(indicator in block_upper for indicator in brand_indicators):
            score += 0.35

        if any(indicator in block_upper for indicator in descriptive_indicators):
            score += 0.25

        # Percentage indicators (common in food)
        if re.search(r"\d+%", block):
            score += 0.3

        return max(0.0, base_score + score)

    def _classify_text_category(self, block: str) -> str:
        """Classify text block into category for name construction"""
        block_upper = block.upper()

        # Brand indicators
        brand_words = ["ORGANIC", "NATURAL", "PREMIUM", "SELECT", "SIGNATURE", "CHOICE"]
        if any(word in block_upper for word in brand_words):
            return "brand"

        # Product type indicators
        product_words = [
            "MILK",
            "CHEESE",
            "BREAD",
            "JUICE",
            "WATER",
            "YOGURT",
            "COFFEE",
            "TEA",
        ]
        if any(word in block_upper for word in product_words):
            return "product"

        # Descriptive indicators
        desc_words = ["REDUCED", "FAT", "FREE", "LOW", "LIGHT", "DIET", "WHOLE"]
        if any(word in block_upper for word in desc_words):
            return "descriptor"

        # Size/quantity indicators
        if re.search(r"\d+%|\d+[ML]?G?L?", block_upper):
            return "size"

        return "general"

    def _strategy_brand_product_descriptor(self, candidates: list[dict]) -> str | None:
        """Try to construct name with brand + product + descriptors"""
        brands = [c for c in candidates if c["category"] == "brand"][:2]
        products = [c for c in candidates if c["category"] == "product"][:2]
        descriptors = [c for c in candidates if c["category"] == "descriptor"][:3]

        parts = []
        parts.extend([c["text"] for c in brands])
        parts.extend([c["text"] for c in products])
        parts.extend([c["text"] for c in descriptors])

        if len(parts) >= 2:
            return " ".join(parts[:6])  # Limit to 6 words
        return None

    def _strategy_longest_meaningful_sequence(
        self, candidates: list[dict]
    ) -> str | None:
        """Find the longest sequence of high-scoring adjacent blocks"""
        if len(candidates) < 2:
            return None

        # Take top 8 candidates and try to form a meaningful sequence
        top_candidates = candidates[:8]
        best_sequence: list[str] = []
        current_sequence: list[str] = []

        for candidate in top_candidates:
            if candidate["score"] >= 0.4:  # Only high-confidence blocks
                current_sequence.append(candidate["text"])
                if len(current_sequence) > len(best_sequence):
                    best_sequence = current_sequence[:]
            else:
                current_sequence = []

        if len(best_sequence) >= 2:
            return " ".join(best_sequence[:5])  # Max 5 words
        return None

    def _strategy_high_confidence_blocks(self, candidates: list[dict]) -> str | None:
        """Use highest-scoring individual blocks"""
        high_conf = [c for c in candidates if c["score"] >= 0.5][:4]
        if len(high_conf) >= 2:
            return " ".join([c["text"] for c in high_conf])
        return None

    def _strategy_alphabetic_blocks(self, candidates: list[dict]) -> str | None:
        """Fallback: use any alphabetic blocks with decent scores"""
        alpha_blocks = [
            c for c in candidates if c["text"].isalpha() and c["score"] >= 0.3
        ][:3]
        if len(alpha_blocks) >= 1:
            return " ".join([c["text"] for c in alpha_blocks])
        return None

    def _clean_product_name(self, name: str) -> str:
        """Clean and normalize the final product name"""
        # Remove extra whitespace
        name = " ".join(name.split())

        # Capitalize appropriately
        words = name.split()
        cleaned_words = []

        for word in words:
            # Keep percentage signs and numbers as-is
            if re.search(r"\d+%", word) or word.isdigit():
                cleaned_words.append(word)
            # Title case for regular words
            else:
                cleaned_words.append(word.title())

        return " ".join(cleaned_words)

    def get_last_dual_dates(self) -> dict:
        """Get the last extracted dual dates (expiry and manufacture)"""
        return self._last_dual_dates or {
            "expiry_date": None,
            "manufacture_date": None,
            "metadata": None,
        }

    def _generate_text_suggestions(
        self, vision_result: VisionScanResult
    ) -> dict[str, Any]:
        """Generate product name suggestions from OCR text by combining meaningful text blocks"""
        suggestions: dict[str, Any] = {"name": None}

        if not vision_result.raw_text:
            return suggestions

        # Filter for high-confidence, meaningful text blocks
        text_blocks = [
            ocr.text.strip()
            for ocr in vision_result.raw_text
            if ocr.confidence > 0.5 and len(ocr.text.strip()) > 1
        ]

        if text_blocks:
            # Try to construct product name from meaningful text blocks
            product_name = self._construct_product_name(
                text_blocks, vision_result.raw_text
            )
            if product_name:
                suggestions["name"] = product_name
            else:
                # Fallback: use the most confident meaningful text block
                meaningful_blocks = [
                    ocr
                    for ocr in vision_result.raw_text
                    if ocr.confidence > 0.7
                    and len(ocr.text.strip()) > 2
                    and not ocr.text.strip().isdigit()
                ]
                if meaningful_blocks:
                    best_text = max(meaningful_blocks, key=lambda t: t.confidence)
                    suggestions["name"] = best_text.text.strip()

        return suggestions

    def _calculate_confidence_scores(
        self,
        vision_result: VisionScanResult,
        primary_barcode: str | None,
        suggested_expiry: datetime | None,
    ) -> dict[str, float]:
        """Calculate confidence scores for different aspects"""

        # Barcode confidence
        barcode_confidence = 0.0
        if primary_barcode and vision_result.barcodes:
            best_barcode = max(vision_result.barcodes, key=lambda b: b.confidence)
            barcode_confidence = best_barcode.confidence

        # Expiry confidence
        expiry_confidence = 0.0
        if suggested_expiry and vision_result.expiry_dates:
            best_expiry = max(vision_result.expiry_dates, key=lambda e: e.confidence)
            expiry_confidence = best_expiry.confidence

        # Text confidence (average of OCR confidence)
        text_confidence = 0.0
        if vision_result.raw_text:
            text_confidence = sum(
                ocr.confidence for ocr in vision_result.raw_text
            ) / len(vision_result.raw_text)

        # Overall confidence (weighted average)
        overall_confidence = (
            barcode_confidence * 0.4 + expiry_confidence * 0.3 + text_confidence * 0.3
        )

        return {
            "barcode": barcode_confidence,
            "expiry": expiry_confidence,
            "text": text_confidence,
            "overall": overall_confidence,
        }

    def _requires_user_confirmation(
        self, confidence_score: float, threshold: float
    ) -> bool:
        """Determine if result requires user confirmation"""
        return confidence_score < threshold
