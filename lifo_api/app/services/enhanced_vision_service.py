"""
Enhanced vision service integrating modular OCR extraction services
Orchestrates date extraction, barcode detection, and product name extraction
"""

import asyncio
import time
from datetime import datetime
from typing import Any, Optional
from dataclasses import dataclass, asdict

import structlog
from google.cloud import vision
from google.api_core.client_options import ClientOptions
from concurrent.futures import ThreadPoolExecutor

from app.core.ocr_config import get_ocr_config_manager, OCRConfigurationManager
from app.services.date_extraction_service import get_date_extraction_service, DateExtractionResult
from app.services.barcode_detection_service import get_barcode_detection_service, BarcodeDetectionResult
from app.services.product_name_extraction_service import get_product_name_extraction_service, ProductNameResult
from app.services.image_quality_service import get_image_quality_service, ImageQualityAssessment
from app.utils.circuit_breaker import get_vision_api_breaker, CircuitBreakerError
from app.utils.local_cache import get_cached_ocr_result, cache_ocr_result

logger = structlog.get_logger()


@dataclass
class OCRTextBlock:
    """Enhanced OCR text block with positioning information"""
    text: str
    confidence: float
    bounding_box: dict
    language: Optional[str] = None


@dataclass
class EnhancedVisionResult:
    """Comprehensive vision processing result"""
    # Extracted information
    dates: list[DateExtractionResult]
    barcodes: list[BarcodeDetectionResult]
    product_names: list[ProductNameResult]

    # Raw OCR data
    raw_text_blocks: list[OCRTextBlock]
    combined_text: str

    # Quality metrics
    image_quality_score: float
    overall_confidence: float
    processing_time_ms: float

    # Enhanced quality assessment
    quality_assessment: Optional[ImageQualityAssessment] = None

    # Metadata
    language_detected: Optional[str] = None
    region_detected: Optional[str] = None
    quality_profile_used: str = ""
    cache_hit: bool = False


class EnhancedVisionService:
    """
    Enhanced vision service with modular extraction capabilities

    Features:
    - Orchestrates specialized extraction services
    - Configurable quality profiles and regional preferences
    - Advanced image quality assessment
    - Intelligent caching and circuit breaker integration
    - Performance optimization for mobile and batch processing
    """

    def __init__(self, project_id: Optional[str] = None):
        """Initialize enhanced vision service"""
        self.project_id = project_id
        self.client = None
        self.config_manager = get_ocr_config_manager()
        self.circuit_breaker = get_vision_api_breaker()
        self.thread_pool = ThreadPoolExecutor(
            max_workers=self.config_manager.get_performance_config().thread_pool_workers,
            thread_name_prefix="enhanced_vision"
        )

        # Get specialized extraction services
        self.date_service = get_date_extraction_service()
        self.barcode_service = get_barcode_detection_service()
        self.product_name_service = get_product_name_extraction_service()
        self.quality_service = get_image_quality_service()

        self._initialize_client()

        logger.info(
            "EnhancedVisionService initialized",
            project_id=self.project_id,
            quality_profile=self.config_manager.current_profile.value,
            region_preference=self.config_manager.region_preference.value
        )

    def _initialize_client(self):
        """Initialize Google Vision API client with regional optimization"""
        try:
            engine_config = self.config_manager.get_engine_config(
                self.config_manager.get_current_config()['engines']['primary']
            )

            client_options = ClientOptions(
                api_endpoint=engine_config.get('api_endpoint', 'vision.googleapis.com'),
                quota_project_id=self.project_id,
            )

            self.client = vision.ImageAnnotatorClient(client_options=client_options)

            logger.info(
                "Enhanced Google Vision API client initialized",
                endpoint=engine_config.get('api_endpoint'),
                project_id=self.project_id
            )

        except Exception as e:
            logger.error(
                "Failed to initialize Enhanced Vision client",
                error=str(e),
                error_type=type(e).__name__
            )
            self.client = None

    def __del__(self):
        """Clean up thread pool on service destruction"""
        if hasattr(self, 'thread_pool') and self.thread_pool:
            self.thread_pool.shutdown(wait=False)

    async def process_image_comprehensive(
        self,
        image_data: bytes,
        extraction_types: Optional[list[str]] = None,
        quality_override: Optional[str] = None,
        region_override: Optional[str] = None
    ) -> EnhancedVisionResult:
        """
        Process image with comprehensive extraction capabilities

        Args:
            image_data: Raw image bytes
            extraction_types: List of extractions to perform ['dates', 'barcodes', 'product_names']
            quality_override: Override quality profile for this request
            region_override: Override region preference for this request

        Returns:
            EnhancedVisionResult with all requested extractions
        """
        start_time = time.time()

        # Default to all extraction types if not specified
        if extraction_types is None:
            extraction_types = ['dates', 'barcodes', 'product_names']

        # Apply overrides if specified
        original_profile = None
        original_region = None

        if quality_override:
            original_profile = self.config_manager.current_profile
            from app.core.ocr_config import QualityProfile
            profile_map = {p.value: p for p in QualityProfile}
            if quality_override in profile_map:
                self.config_manager.set_quality_profile(profile_map[quality_override])

        if region_override:
            original_region = self.config_manager.region_preference
            from app.core.ocr_config import RegionPreference
            region_map = {r.value: r for r in RegionPreference}
            if region_override in region_map:
                self.config_manager.set_region_preference(region_map[region_override])

        try:
            # Check cache first
            cache_key = f"enhanced_{hash(image_data)}_{'-'.join(sorted(extraction_types))}"
            cached_result = get_cached_ocr_result(cache_key.encode())

            if cached_result:
                logger.info("Enhanced OCR result served from cache")
                result = EnhancedVisionResult(**cached_result)
                result.cache_hit = True
                result.processing_time_ms = (time.time() - start_time) * 1000
                return result

            # Perform image quality assessment first
            quality_assessment = await self.quality_service.assess_image_quality(image_data)

            # Check if image quality is sufficient for OCR processing
            if quality_assessment.ocr_readiness_score < 0.3:
                logger.warning(
                    "Image quality too poor for reliable OCR processing",
                    ocr_readiness_score=quality_assessment.ocr_readiness_score,
                    quality_level=quality_assessment.overall_quality.value
                )
                # Still attempt OCR but with lower confidence

            # Perform OCR extraction
            ocr_result = await self._perform_ocr_extraction(image_data)

            if not ocr_result.raw_text_blocks:
                logger.warning("No text detected in image")
                empty_result = self._create_empty_result(start_time)
                empty_result.quality_assessment = quality_assessment
                return empty_result

            # Perform specialized extractions
            extraction_results = await self._perform_specialized_extractions(
                ocr_result, extraction_types
            )

            # Calculate quality metrics
            quality_metrics = self._calculate_quality_metrics(
                ocr_result, extraction_results, quality_assessment
            )

            # Create comprehensive result
            result = EnhancedVisionResult(
                dates=extraction_results.get('dates', []),
                barcodes=extraction_results.get('barcodes', []),
                product_names=extraction_results.get('product_names', []),
                raw_text_blocks=ocr_result.raw_text_blocks,
                combined_text=ocr_result.combined_text,
                image_quality_score=quality_metrics['image_quality'],
                overall_confidence=quality_metrics['overall_confidence'],
                processing_time_ms=(time.time() - start_time) * 1000,
                quality_assessment=quality_assessment,
                language_detected=quality_metrics['language_detected'],
                region_detected=quality_metrics['region_detected'],
                quality_profile_used=self.config_manager.current_profile.value,
                cache_hit=False
            )

            # Cache successful results
            if result.overall_confidence >= 0.5:
                cache_ocr_result(cache_key.encode(), asdict(result))

            logger.info(
                "Enhanced vision processing completed",
                extraction_types=extraction_types,
                dates_found=len(result.dates),
                barcodes_found=len(result.barcodes),
                product_names_found=len(result.product_names),
                processing_time_ms=result.processing_time_ms,
                overall_confidence=result.overall_confidence
            )

            return result

        except CircuitBreakerError as e:
            logger.warning("Vision API circuit breaker is open", error=str(e))
            return self._create_empty_result(start_time)

        except Exception as e:
            logger.error(
                "Enhanced vision processing failed",
                error=str(e),
                error_type=type(e).__name__,
                extraction_types=extraction_types
            )
            return self._create_empty_result(start_time)

        finally:
            # Restore original settings
            if original_profile:
                self.config_manager.set_quality_profile(original_profile)
            if original_region:
                self.config_manager.set_region_preference(original_region)

    async def _perform_ocr_extraction(self, image_data: bytes) -> 'OCRExtractionResult':
        """Perform base OCR text extraction using Google Vision API"""
        if not self.client:
            raise RuntimeError("Google Vision client not initialized")

        # Preprocess image based on current configuration
        processed_image_data = await self._preprocess_image(image_data)

        # Create vision image object
        image = vision.Image(content=processed_image_data)

        # Use circuit breaker for API call
        response = await self.circuit_breaker.call(
            self._call_vision_api_in_thread, image
        )

        # Process OCR response
        text_blocks = []
        combined_text_parts = []

        if response.text_annotations:
            # Skip the first annotation (full text) and process individual blocks
            for annotation in response.text_annotations[1:]:
                if annotation.description.strip():
                    bounding_box = self._extract_bounding_box(annotation.bounding_poly)

                    text_block = OCRTextBlock(
                        text=annotation.description.strip(),
                        confidence=0.8,  # Google Vision doesn't provide per-word confidence
                        bounding_box=bounding_box,
                        language=None  # Could be enhanced with language detection
                    )

                    text_blocks.append(text_block)
                    combined_text_parts.append(annotation.description.strip())

        combined_text = " ".join(combined_text_parts)

        return OCRExtractionResult(
            raw_text_blocks=text_blocks,
            combined_text=combined_text
        )

    async def _call_vision_api_in_thread(self, image: vision.Image) -> Any:
        """Call Vision API in thread pool to avoid blocking"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.thread_pool,
            lambda: self.client.text_detection(image=image)
        )

    async def _preprocess_image(self, image_data: bytes) -> bytes:
        """Preprocess image based on current configuration"""
        img_config = self.config_manager.get_image_processing_config()

        # For now, return original image data
        # TODO: Implement image preprocessing based on configuration
        # - Resize to max_width/max_height
        # - Adjust JPEG quality
        # - Apply contrast/brightness enhancement
        # - Noise reduction, edge enhancement, etc.

        return image_data

    async def _perform_specialized_extractions(
        self,
        ocr_result: 'OCRExtractionResult',
        extraction_types: list[str]
    ) -> dict[str, list]:
        """Perform specialized extractions using modular services"""
        results = {}

        # Extract text and bounding boxes for service calls
        text_blocks = [block.text for block in ocr_result.raw_text_blocks]
        bounding_boxes = [block.bounding_box for block in ocr_result.raw_text_blocks]

        # Get regional configuration
        regional_config = self.config_manager.get_regional_config()

        # Perform extractions concurrently
        extraction_tasks = []

        if 'dates' in extraction_types:
            extraction_tasks.append(
                self._extract_dates_task(text_blocks, bounding_boxes, regional_config)
            )

        if 'barcodes' in extraction_types:
            extraction_tasks.append(
                self._extract_barcodes_task(text_blocks, bounding_boxes, regional_config)
            )

        if 'product_names' in extraction_types:
            extraction_tasks.append(
                self._extract_product_names_task(text_blocks, bounding_boxes, regional_config)
            )

        # Execute all extractions concurrently
        extraction_results = await asyncio.gather(*extraction_tasks, return_exceptions=True)

        # Process results
        for i, result in enumerate(extraction_results):
            if isinstance(result, Exception):
                logger.error(f"Extraction {i} failed: {result}")
                continue

            if i == 0 and 'dates' in extraction_types:
                results['dates'] = result
            elif (i == 1 and 'barcodes' in extraction_types) or (i == 0 and 'dates' not in extraction_types and 'barcodes' in extraction_types):
                results['barcodes'] = result
            elif 'product_names' in extraction_types:
                results['product_names'] = result

        return results

    async def _extract_dates_task(self, text_blocks, bounding_boxes, regional_config):
        """Task for date extraction"""
        return await self.date_service.extract_dates_from_text_blocks(
            text_blocks, bounding_boxes, regional_config.region.value
        )

    async def _extract_barcodes_task(self, text_blocks, bounding_boxes, regional_config):
        """Task for barcode extraction"""
        return await self.barcode_service.detect_barcodes_from_text_blocks(
            text_blocks, bounding_boxes, regional_config.region.value
        )

    async def _extract_product_names_task(self, text_blocks, bounding_boxes, regional_config):
        """Task for product name extraction"""
        return await self.product_name_service.extract_product_names_from_text_blocks(
            text_blocks, bounding_boxes, 'auto'
        )

    def _calculate_quality_metrics(
        self,
        ocr_result: 'OCRExtractionResult',
        extraction_results: dict,
        quality_assessment: Optional[ImageQualityAssessment] = None
    ) -> dict[str, Any]:
        """Calculate quality metrics for the overall extraction"""

        # Image quality assessment (prefer quality assessment service if available)
        if quality_assessment:
            image_quality = quality_assessment.ocr_readiness_score
        else:
            image_quality = self._assess_image_quality(ocr_result)

        # Overall confidence calculation
        all_confidences = []

        # Add extraction confidences
        for extraction_type, results in extraction_results.items():
            for result in results:
                if hasattr(result, 'confidence'):
                    all_confidences.append(result.confidence)

        # Add OCR confidences
        for block in ocr_result.raw_text_blocks:
            all_confidences.append(block.confidence)

        overall_confidence = sum(all_confidences) / len(all_confidences) if all_confidences else 0.0

        # Language detection (simple heuristic)
        language_detected = self._detect_primary_language(ocr_result.combined_text)

        # Region detection (based on formats found)
        region_detected = self._detect_region_from_extractions(extraction_results)

        return {
            'image_quality': image_quality,
            'overall_confidence': overall_confidence,
            'language_detected': language_detected,
            'region_detected': region_detected
        }

    def _assess_image_quality(self, ocr_result: 'OCRExtractionResult') -> float:
        """Assess image quality based on OCR results"""
        base_score = 0.5

        # Text density (more text generally indicates better quality)
        if len(ocr_result.raw_text_blocks) > 5:
            base_score += 0.2
        elif len(ocr_result.raw_text_blocks) > 10:
            base_score += 0.3

        # Average text length (longer blocks indicate cleaner OCR)
        avg_text_length = sum(len(block.text) for block in ocr_result.raw_text_blocks) / max(len(ocr_result.raw_text_blocks), 1)
        if avg_text_length > 5:
            base_score += 0.1
        if avg_text_length > 10:
            base_score += 0.1

        # Average confidence
        avg_confidence = sum(block.confidence for block in ocr_result.raw_text_blocks) / max(len(ocr_result.raw_text_blocks), 1)
        base_score += (avg_confidence - 0.5) * 0.4  # Scale confidence impact

        return min(max(base_score, 0.0), 1.0)

    def _detect_primary_language(self, text: str) -> Optional[str]:
        """Detect primary language from text content"""
        # Simple keyword-based detection
        text_lower = text.lower()

        language_indicators = {
            'french': ['le', 'la', 'du', 'de', 'à', 'consommer', 'avant'],
            'german': ['der', 'die', 'das', 'bis', 'mindestens', 'haltbar'],
            'spanish': ['el', 'la', 'del', 'de', 'antes', 'fecha'],
            'italian': ['il', 'la', 'del', 'di', 'entro', 'scade'],
            'english': ['the', 'and', 'of', 'to', 'best', 'before', 'use', 'by']
        }

        language_scores = {}
        for language, indicators in language_indicators.items():
            score = sum(1 for indicator in indicators if indicator in text_lower)
            if score > 0:
                language_scores[language] = score

        if language_scores:
            return max(language_scores, key=language_scores.get)

        return 'english'  # Default

    def _detect_region_from_extractions(self, extraction_results: dict) -> Optional[str]:
        """Detect region preference from extraction patterns"""
        # Check date formats
        dates = extraction_results.get('dates', [])
        if dates:
            eu_formats = sum(1 for d in dates if d.regulatory_format == 'EU')
            us_formats = sum(1 for d in dates if d.regulatory_format == 'US')

            if eu_formats > us_formats:
                return 'EU'
            elif us_formats > eu_formats:
                return 'US'

        # Check barcode formats
        barcodes = extraction_results.get('barcodes', [])
        if barcodes:
            ean_count = sum(1 for b in barcodes if b.format.startswith('EAN'))
            upc_count = sum(1 for b in barcodes if b.format.startswith('UPC'))

            if ean_count > upc_count:
                return 'EU'
            elif upc_count > ean_count:
                return 'US'

        return None

    def _extract_bounding_box(self, bounding_poly) -> dict:
        """Extract bounding box from Google Vision bounding poly"""
        if not bounding_poly or not bounding_poly.vertices:
            return {"x": 0, "y": 0, "width": 0, "height": 0}

        vertices = bounding_poly.vertices
        xs = [vertex.x for vertex in vertices]
        ys = [vertex.y for vertex in vertices]

        x_min, x_max = min(xs), max(xs)
        y_min, y_max = min(ys), max(ys)

        return {
            "x": x_min,
            "y": y_min,
            "width": x_max - x_min,
            "height": y_max - y_min,
        }

    def _create_empty_result(self, start_time: float) -> EnhancedVisionResult:
        """Create empty result for failed processing"""
        return EnhancedVisionResult(
            dates=[],
            barcodes=[],
            product_names=[],
            raw_text_blocks=[],
            combined_text="",
            image_quality_score=0.0,
            overall_confidence=0.0,
            processing_time_ms=(time.time() - start_time) * 1000,
            quality_profile_used=self.config_manager.current_profile.value
        )


@dataclass
class OCRExtractionResult:
    """Intermediate OCR extraction result"""
    raw_text_blocks: list[OCRTextBlock]
    combined_text: str


def get_enhanced_vision_service() -> EnhancedVisionService:
    """Get singleton instance of enhanced vision service"""
    global _enhanced_vision_service
    if '_enhanced_vision_service' not in globals():
        _enhanced_vision_service = EnhancedVisionService()
    return _enhanced_vision_service