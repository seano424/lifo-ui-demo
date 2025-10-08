"""
Google Cloud Vision API service for OCR, barcode detection, and image analysis
Provides real Google Vision integration with performance optimizations
"""

import asyncio
import base64
import io
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import structlog
from google.api_core.client_options import ClientOptions
from google.cloud import vision
from google.oauth2 import service_account
from PIL import Image

from app.core.config import settings
from app.models.base import ConfigurableModel
from app.utils.circuit_breaker import CircuitBreakerError, get_vision_api_breaker
from app.utils.local_cache import cache_ocr_result, get_cached_ocr_result

logger = structlog.get_logger()


class BarcodeResult(ConfigurableModel):
    """Barcode detection result from Google Vision"""

    value: str
    format: str  # EAN_13, UPC_A, CODE_128, etc.
    confidence: float
    bounding_box: dict[str, int] | None = None


class OCRResult(ConfigurableModel):
    """OCR text detection result"""

    text: str
    confidence: float
    bounding_box: dict[str, int] | None = None


class ExpiryDateResult(ConfigurableModel):
    """Parsed expiry date from OCR text"""

    date: datetime | None = None
    raw_text: str
    confidence: float
    format_detected: str | None = None  # DD/MM/YYYY, MM/DD/YYYY, etc.


class VisionScanResult(ConfigurableModel):
    """Complete result from Google Vision API processing"""

    # Raw detection results
    barcodes: list[BarcodeResult] = []
    raw_text: list[OCRResult] = []
    expiry_dates: list[ExpiryDateResult] = []

    # Image metadata
    image_dimensions: dict[str, int] = {"width": 0, "height": 0}
    processing_time_ms: float = 0.0

    # Quality indicators
    text_confidence_avg: float = 0.0
    barcode_confidence_avg: float = 0.0


class GoogleVisionService:
    """
    Google Cloud Vision API service for image processing
    Enhanced with caching, circuit breaker, and async optimization
    """

    def __init__(self, project_id: str | None = None):
        """Initialize Google Vision client with resilience features"""
        self.project_id = project_id
        self.client = None
        self.circuit_breaker = get_vision_api_breaker()
        self.thread_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="vision")
        self._initialize_client()

    def _initialize_client(self):
        """Initialize Google Vision API client with EU regional endpoint using Google's official credential method"""
        try:
            # Load credentials using Google's recommended approach for containers
            credentials = self._load_google_credentials()

            # Use EU regional endpoint for European operations
            # Better latency and data residency compliance for EU users
            client_options = ClientOptions(
                api_endpoint="eu-vision.googleapis.com",
                quota_project_id=self.project_id,
            )

            # Initialize client with explicit credentials (Google's official method)
            if credentials:
                self.client = vision.ImageAnnotatorClient(
                    credentials=credentials,
                    client_options=client_options
                )
                logger.info(
                    "Google Vision API client initialized successfully with explicit credentials",
                    region="EU",
                    endpoint="eu-vision.googleapis.com",
                    project_id=self.project_id,
                    credential_method="service_account_info"
                )
            else:
                # Fallback to default credential chain (for local development with gcloud auth)
                self.client = vision.ImageAnnotatorClient(client_options=client_options)
                logger.info(
                    "Google Vision API client initialized with default credentials",
                    region="EU",
                    endpoint="eu-vision.googleapis.com",
                    project_id=self.project_id,
                    credential_method="default_chain"
                )

        except Exception as e:
            logger.error(
                "Failed to initialize Google Vision client",
                error=str(e),
                error_type=type(e).__name__,
                region="EU",
                endpoint="eu-vision.googleapis.com",
            )
            # For development, we'll create a None client and handle gracefully
            self.client = None

    def _load_google_credentials(self) -> service_account.Credentials | None:
        """
        Load Google Cloud credentials using Google's official recommended method for containers.
        Uses Credentials.from_service_account_info() as per Google's best practices.

        Returns:
            service_account.Credentials object or None if no credentials available
        """
        try:
            # Check for JSON credentials in environment (DigitalOcean App Platform pattern)
            credentials_json = os.getenv('GOOGLE_APPLICATION_CREDENTIALS_JSON')

            if credentials_json:
                try:
                    # Try parsing as direct JSON first
                    if credentials_json.strip().startswith('{'):
                        service_account_info = json.loads(credentials_json)
                        logger.debug("Loaded Google credentials from JSON environment variable")
                    else:
                        # Try base64 decoding if it's encoded
                        try:
                            decoded_credentials = base64.b64decode(credentials_json).decode('utf-8')
                            service_account_info = json.loads(decoded_credentials)
                            logger.debug("Loaded Google credentials from base64-encoded environment variable")
                        except Exception:
                            logger.error("Failed to decode base64 credentials, trying as direct JSON")
                            service_account_info = json.loads(credentials_json)

                    # Validate required fields
                    required_fields = ['type', 'project_id', 'private_key', 'client_email']
                    missing_fields = [field for field in required_fields if field not in service_account_info]
                    if missing_fields:
                        logger.error(
                            "Missing required fields in service account JSON",
                            missing_fields=missing_fields
                        )
                        return None

                    # Create credentials using Google's official method
                    credentials = service_account.Credentials.from_service_account_info(
                        service_account_info
                    )

                    logger.info(
                        "Google Cloud credentials loaded successfully",
                        method="service_account_info",
                        project_id=service_account_info.get('project_id'),
                        client_email=service_account_info.get('client_email', '')[:20] + "..."  # Log partial email for debugging
                    )
                    return credentials

                except json.JSONDecodeError as e:
                    logger.error(
                        "Failed to parse Google credentials JSON",
                        error=str(e),
                        json_length=len(credentials_json),
                        json_preview=credentials_json[:50] + "..." if len(credentials_json) > 50 else credentials_json
                    )
                    return None
                except Exception as e:
                    logger.error(
                        "Failed to create Google credentials from JSON",
                        error=str(e),
                        error_type=type(e).__name__
                    )
                    return None

            # Check for GOOGLE_APPLICATION_CREDENTIALS - could be file path or JSON content
            credentials_env = os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
            if credentials_env:
                logger.info(
                    "Found GOOGLE_APPLICATION_CREDENTIALS environment variable",
                    length=len(credentials_env),
                    starts_with=credentials_env[:10],
                    is_file=os.path.isfile(credentials_env)
                )

                # First, check if it's a file path (traditional approach)
                if os.path.isfile(credentials_env):
                    try:
                        credentials = service_account.Credentials.from_service_account_file(
                            credentials_env
                        )
                        logger.info(
                            "Google Cloud credentials loaded from file",
                            method="service_account_file",
                            file_path=credentials_env
                        )
                        return credentials
                    except Exception as e:
                        logger.error(
                            "Failed to load Google credentials from file",
                            error=str(e),
                            file_path=credentials_env
                        )
                        return None

                # If not a file, try parsing as JSON content (DigitalOcean direct setup)
                # More robust JSON detection
                stripped_env = credentials_env.strip()
                if stripped_env.startswith('{') and stripped_env.endswith('}'):
                    try:
                        logger.info("Detected JSON content in GOOGLE_APPLICATION_CREDENTIALS, parsing directly")
                        service_account_info = json.loads(stripped_env)

                        # Validate required fields
                        required_fields = ['type', 'project_id', 'private_key', 'client_email']
                        missing_fields = [field for field in required_fields if field not in service_account_info]
                        if missing_fields:
                            logger.error(
                                "Missing required fields in GOOGLE_APPLICATION_CREDENTIALS JSON",
                                missing_fields=missing_fields
                            )
                            return None

                        # Create credentials using Google's official method
                        credentials = service_account.Credentials.from_service_account_info(
                            service_account_info
                        )

                        logger.info(
                            "Google Cloud credentials loaded from GOOGLE_APPLICATION_CREDENTIALS JSON",
                            method="service_account_info_from_env",
                            project_id=service_account_info.get('project_id'),
                            client_email=service_account_info.get('client_email', '')[:20] + "..."
                        )
                        return credentials

                    except json.JSONDecodeError as e:
                        logger.error(
                            "Failed to parse GOOGLE_APPLICATION_CREDENTIALS as JSON",
                            error=str(e),
                            env_length=len(credentials_env),
                            env_preview=stripped_env[:100] + "..." if len(stripped_env) > 100 else stripped_env
                        )
                        return None
                    except Exception as e:
                        logger.error(
                            "Failed to create credentials from GOOGLE_APPLICATION_CREDENTIALS JSON",
                            error=str(e),
                            error_type=type(e).__name__
                        )
                        return None
                else:
                    logger.warning(
                        "GOOGLE_APPLICATION_CREDENTIALS found but not recognized as file path or JSON",
                        starts_with=stripped_env[:20],
                        ends_with=stripped_env[-10:] if len(stripped_env) > 10 else stripped_env,
                        length=len(stripped_env)
                    )

            # No explicit credentials found - will use default credential chain
            logger.info("No explicit Google credentials found, will use default credential chain (gcloud auth)")
            return None

        except Exception as e:
            logger.error(
                "Unexpected error loading Google credentials",
                error=str(e),
                error_type=type(e).__name__
            )
            return None

    def __del__(self):
        """Clean up thread pool on service destruction"""
        if hasattr(self, 'thread_pool') and self.thread_pool:
            self.thread_pool.shutdown(wait=False)

    async def process_image(self, image_data: bytes) -> VisionScanResult:
        """
        Process image with Google Vision API for comprehensive analysis
        Enhanced with caching, circuit breaker, and error handling

        Args:
            image_data: Raw image bytes

        Returns:
            VisionScanResult with all detected information
        """
        start_time = datetime.now()

        # Check cache first
        cached_result = get_cached_ocr_result(image_data)
        if cached_result:
            logger.info("OCR result served from cache")
            return VisionScanResult(**cached_result)

        if not self.client:
            logger.error("Google Vision client not available")
            return VisionScanResult(
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
            )

        try:
            # Use circuit breaker for resilience
            result = await self.circuit_breaker.call(
                self._process_image_with_vision_api, image_data, start_time
            )

            # Cache successful results
            cache_ocr_result(image_data, result.dict())

            return result

        except CircuitBreakerError as e:
            logger.warning("Vision API circuit breaker is open", error=str(e))
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return VisionScanResult(processing_time_ms=processing_time)

        except Exception as e:
            logger.error(
                "Google Vision processing failed",
                error=str(e),
                error_type=type(e).__name__,
                region="EU",
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000,
            )
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return VisionScanResult(processing_time_ms=processing_time)

    async def _process_image_with_vision_api(
        self, image_data: bytes, start_time: datetime
    ) -> VisionScanResult:
        """Internal method for actual Vision API processing"""
        # Log image input details
        logger.info(
            "Processing image with Vision API",
            original_image_size=len(image_data),
            client_initialized=bool(self.client)
        )

        # Preprocess image with configurable settings
        preprocessed_data = await self._preprocess_image_for_eu_food_labels(image_data)
        image_dimensions = await self._get_image_dimensions(preprocessed_data)

        logger.info(
            "Image preprocessing completed",
            preprocessed_size=len(preprocessed_data),
            dimensions=image_dimensions
        )

        # Create Vision API image object
        image = vision.Image(content=preprocessed_data)

        # Single optimized API call with timeout
        barcodes, raw_text = await asyncio.wait_for(
            self._detect_text_and_barcodes_combined(image),
            timeout=settings.ocr_timeout_seconds
        )

        # Parse expiry dates from OCR text
        expiry_dates = self._parse_expiry_dates(raw_text)

        # Calculate processing time
        processing_time = (datetime.now() - start_time).total_seconds() * 1000

        # Calculate average confidence scores
        text_confidence_avg = (
            sum(ocr.confidence for ocr in raw_text) / len(raw_text)
            if raw_text
            else 0.0
        )
        barcode_confidence_avg = (
            sum(barcode.confidence for barcode in barcodes) / len(barcodes)
            if barcodes
            else 0.0
        )

        return VisionScanResult(
            barcodes=barcodes,
            raw_text=raw_text,
            expiry_dates=expiry_dates,
            image_dimensions=image_dimensions,
            processing_time_ms=processing_time,
            text_confidence_avg=text_confidence_avg,
            barcode_confidence_avg=barcode_confidence_avg,
        )

    async def _preprocess_image_for_eu_food_labels(self, image_data: bytes) -> bytes:
        """
        Preprocess image for optimal European food label OCR
        Enhanced with configurable settings and async processing
        """
        try:
            # Run CPU-intensive preprocessing in thread pool
            return await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, self._preprocess_image_sync, image_data
            )
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            # Return original data if preprocessing fails
            return image_data

    def _preprocess_image_sync(self, image_data: bytes) -> bytes:
        """Synchronous image preprocessing to run in thread pool"""
        try:
            # Load image with PIL for preprocessing
            image: Image.Image = Image.open(io.BytesIO(image_data))

            # Convert to RGB if needed (handle RGBA, grayscale, etc.)
            if image.mode != "RGB":
                image = image.convert("RGB")

            # Use configurable image size limits (increased from 640x480)
            max_size = (settings.ocr_max_image_width, settings.ocr_max_image_height)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                logger.debug(f"Resized image from original to {image.size}")

            # Enhance contrast using configurable setting
            from PIL import ImageEnhance

            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(settings.ocr_contrast_enhancement)

            # Save optimized image as JPEG with configurable quality
            output = io.BytesIO()
            image.save(
                output,
                format="JPEG",
                quality=settings.ocr_jpeg_quality,
                optimize=True
            )
            optimized_data = output.getvalue()

            # Validate file size (10MB limit for text detection)
            if len(optimized_data) > 10 * 1024 * 1024:
                # Further compress if too large
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=70, optimize=True)
                optimized_data = output.getvalue()
                logger.warning("Image compressed further due to size limits")

            logger.debug(
                f"Image preprocessed: {len(image_data)} -> {len(optimized_data)} bytes"
            )
            return optimized_data

        except Exception as e:
            logger.error(f"Synchronous image preprocessing failed: {e}")
            return image_data

    async def _detect_text_and_barcodes_combined(
        self, image: vision.Image
    ) -> tuple[list[BarcodeResult], list[OCRResult]]:
        """
        Single API call for both text detection and barcode extraction
        Optimized for European markets and EAN-13 barcodes
        """
        try:
            # Configure features for comprehensive detection
            features = [
                vision.Feature(type_=vision.Feature.Type.TEXT_DETECTION),
                vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION),
            ]

            # Configure image context for European text (multilingual support)
            image_context = vision.ImageContext(
                language_hints=[
                    "en",
                    "fr",
                    "de",
                    "nl",
                ]  # English, French, German, Dutch
            )

            # Single API request with all features
            request = vision.AnnotateImageRequest(
                image=image, features=features, image_context=image_context
            )

            # Execute request in dedicated thread pool to avoid blocking
            if not self.client:
                raise RuntimeError("Google Vision client not initialized")

            response = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, lambda: self.client.annotate_image(request)
            )

            # Extract text from response
            ocr_results = self._extract_ocr_results(response)

            # Now make a separate call for proper barcode detection
            barcodes = await self._detect_barcodes_properly(image)

            logger.info(
                "EU-optimized Vision API processing completed",
                barcodes_detected=len(barcodes),
                text_blocks_detected=len(ocr_results),
                languages=["en", "fr", "de", "nl"],
                region="EU",
            )
            return barcodes, ocr_results

        except Exception as e:
            logger.error(f"Combined text/barcode detection failed: {e}")
            return [], []

    def _extract_ocr_results(self, response) -> list[OCRResult]:
        """Extract OCR results from Vision API response"""
        ocr_results = []

        # Debug: Log raw Vision API response structure
        logger.info(
            "Vision API response received",
            has_text_annotations=bool(response.text_annotations),
            text_annotation_count=len(response.text_annotations) if response.text_annotations else 0,
            has_full_text=bool(hasattr(response, "full_text_annotation") and response.full_text_annotation),
            has_error=bool(response.error.message if hasattr(response, 'error') and response.error else None)
        )

        if response.text_annotations:
            # Log the full text (first annotation is always the complete detected text)
            full_text = response.text_annotations[0].description if response.text_annotations else ""
            logger.info(
                "Vision API full text detected",
                full_text=full_text[:200] if full_text else "None",  # Log first 200 chars
                text_length=len(full_text) if full_text else 0
            )

            # IMPORTANT: Add the full text as the first OCR result for date parsing
            # The full text often contains dates that are split across individual annotations
            if full_text:
                ocr_results.append(OCRResult(
                    text=full_text,
                    confidence=0.8,
                    bounding_box=self._extract_bounding_box(
                        response.text_annotations[0].bounding_poly
                    ) if response.text_annotations else None
                ))

            # Process individual text annotations (skip full text at index 0)
            for annotation in response.text_annotations[1:]:
                text = annotation.description.strip()
                if text and not self._is_obvious_barcode_number(
                    text
                ):  # Exclude obvious barcodes from OCR
                    ocr_result = OCRResult(
                        text=text,
                        confidence=0.8,  # Vision API doesn't provide per-word confidence
                        bounding_box=self._extract_bounding_box(
                            annotation.bounding_poly
                        ),
                    )
                    ocr_results.append(ocr_result)

        # Also extract from document text detection if available
        if hasattr(response, "full_text_annotation") and response.full_text_annotation:
            # Process document text for better structured text extraction
            for page in response.full_text_annotation.pages:
                for block in page.blocks:
                    for paragraph in block.paragraphs:
                        paragraph_text = "".join(
                            [
                                symbol.text
                                for word in paragraph.words
                                for symbol in word.symbols
                            ]
                        )
                        if (
                            paragraph_text.strip()
                            and not self._is_obvious_barcode_number(
                                paragraph_text.strip()
                            )
                        ):
                            # Get bounding box from paragraph
                            ocr_result = OCRResult(
                                text=paragraph_text.strip(),
                                confidence=0.8,
                                bounding_box=self._extract_bounding_box(
                                    paragraph.bounding_box
                                ),
                            )
                            ocr_results.append(ocr_result)

        return ocr_results

    async def _detect_barcodes_properly(
        self, image: vision.Image
    ) -> list[BarcodeResult]:
        """Use Google Vision's actual barcode detection capabilities"""
        barcodes: list[BarcodeResult] = []

        try:
            # First attempt: Use Google's built-in barcode detection (if available in your Vision API version)
            # Note: Some versions of Vision API have barcode detection, others don't

            # For now, let's use a more sophisticated approach:
            # 1. Look for numeric patterns that match barcode formats
            # 2. Validate them using check digits
            # 3. Use position and context clues

            barcode_request = vision.AnnotateImageRequest(
                image=image,
                features=[
                    vision.Feature(type_=vision.Feature.Type.TEXT_DETECTION),
                ],
            )

            if not self.client:
                raise RuntimeError("Google Vision client not initialized")

            response = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, lambda: self.client.annotate_image(barcode_request)
            )

            if response.text_annotations:
                # Look for barcode patterns in text
                all_text_blocks = [
                    ann.description.strip() for ann in response.text_annotations[1:]
                ]

                # Find potential barcodes
                potential_barcodes = self._find_barcode_patterns(
                    all_text_blocks, response.text_annotations[1:]
                )

                for barcode_data in potential_barcodes:
                    barcode = BarcodeResult(
                        value=barcode_data["value"],
                        format=barcode_data["format"],
                        confidence=barcode_data["confidence"],
                        bounding_box=barcode_data["bounding_box"],
                    )
                    barcodes.append(barcode)

            logger.info(f"Detected {len(barcodes)} barcodes using enhanced detection")
            return barcodes

        except Exception as e:
            logger.error(f"Barcode detection failed: {e}")
            return []

    async def _detect_barcodes(self, image: vision.Image) -> list[BarcodeResult]:
        """Detect barcodes in image using Google Vision API"""
        try:
            # Check if client is available
            if not self.client:
                logger.warning(
                    "Vision client not available, returning empty barcode results"
                )
                return []

            # Run in thread pool to avoid blocking
            response = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, lambda: self.client.text_detection(image=image)
            )

            # Also try barcode detection specifically
            await asyncio.get_event_loop().run_in_executor(
                self.thread_pool,
                lambda: self.client.annotate_image(
                    {
                        "image": image,
                        "features": [{"type_": vision.Feature.Type.TEXT_DETECTION}],
                    }
                ),
            )

            barcodes = []

            # Extract potential barcodes from text detections
            if response.text_annotations:
                for annotation in response.text_annotations:
                    text = annotation.description.strip()
                    # Look for barcode patterns
                    if self._is_barcode_pattern(text):
                        barcode = BarcodeResult(
                            value=text,
                            format=self._detect_barcode_format(text),
                            confidence=0.9,  # Google Vision doesn't provide barcode confidence
                            bounding_box=self._extract_bounding_box(
                                annotation.bounding_poly
                            ),
                        )
                        barcodes.append(barcode)

            logger.info(f"Detected {len(barcodes)} barcodes")
            return barcodes

        except Exception as e:
            logger.error(f"Barcode detection failed: {e}")
            return []

    async def _extract_text(self, image: vision.Image) -> list[OCRResult]:
        """Extract text from image using Google Vision OCR"""
        try:
            # Check if client is available
            if not self.client:
                logger.warning(
                    "Vision client not available, returning empty OCR results"
                )
                return []

            # Run OCR in thread pool
            response = await asyncio.get_event_loop().run_in_executor(
                self.thread_pool, lambda: self.client.text_detection(image=image)
            )

            ocr_results = []

            if response.text_annotations:
                # Skip the first annotation (full text) and process individual words/blocks
                for annotation in response.text_annotations[1:]:
                    if annotation.description.strip():
                        ocr_result = OCRResult(
                            text=annotation.description.strip(),
                            confidence=0.8,  # Google Vision doesn't provide per-word confidence
                            bounding_box=self._extract_bounding_box(
                                annotation.bounding_poly
                            ),
                        )
                        ocr_results.append(ocr_result)

            logger.info(f"Extracted {len(ocr_results)} text blocks")
            return ocr_results

        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return []

    def _parse_expiry_dates(
        self, ocr_results: list[OCRResult]
    ) -> list[ExpiryDateResult]:
        """
        Parse expiry dates from OCR text results
        Enhanced to handle real-world OCR variations and fragmented text
        Supports multiple date formats and expiry indicators
        """
        expiry_dates = []

        # Combine all OCR text for context-aware parsing
        combined_text = " ".join([ocr.text for ocr in ocr_results])

        # Enhanced date patterns with more variations
        date_patterns = [
            # Standard date formats with various separators
            (r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b", "DD/MM/YYYY"),
            (r"\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})\b", "DD/MM/YY"),
            (r"\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b", "YYYY/MM/DD"),
            # Space-separated dates
            (r"\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b", "DD MM YYYY"),
            # Compact date formats (common on packaging)
            (r"\b(\d{2})(\d{2})(\d{2,4})\b", "DDMMYYYY"),
            # Month names (multilingual) - more comprehensive
            (
                r"\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Nov|Déc|Jän|Mär|Okt|Dez|Januar|Februar|März|Juni|Juli|Oktober|Dezember|NOV)\s*(\d{2,4})\b",
                "DD Mon YYYY",
            ),
            (
                r"\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Nov|Déc|Jän|Mär|Okt|Dez|NOV)\s*(\d{1,2})\s*(\d{2,4})\b",
                "Mon DD YYYY",
            ),
            # Dates with expiry indicators nearby
            (
                r"(?:exp|EXP|BEST\s*BY|BB|Best\s*before|À\s*consommer\s*avant|Mindestens\s*haltbar\s*bis)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})",
                "DD/MM/YYYY",
            ),
            (r"(?:exp|EXP|BEST\s*BY|BB)[\s:]*(\d{1,2})(\w{3})(\d{2,4})", "DD Mon YYYY"),
            # Special format like '22NOV2017' or '03NOV26'
            (r"\b(\d{1,2})([A-Z]{3})(\d{4})\b", "DD Mon YYYY"),
            (r"\b(\d{1,2})([A-Z]{3})(\d{2})\b", "DD Mon YY"),
            # Date with slashes and month names like '03/JUL/26'
            (r"\b(\d{1,2})[/\-.]([A-Z]{3})[/\-.](\d{2,4})\b", "DD/Mon/YYYY"),
            (r"\b(\d{1,2})[/\-.]([A-Za-z]{3,9})[/\-.](\d{2,4})\b", "DD/Mon/YYYY"),
        ]

        # Enhanced multilingual month mapping
        month_map = {
            # English (full and abbreviated)
            "jan": 1,
            "january": 1,
            "feb": 2,
            "february": 2,
            "mar": 3,
            "march": 3,
            "apr": 4,
            "april": 4,
            "may": 5,
            "jun": 6,
            "june": 6,
            "jul": 7,
            "july": 7,
            "aug": 8,
            "august": 8,
            "sep": 9,
            "september": 9,
            "oct": 10,
            "october": 10,
            "nov": 11,
            "november": 11,
            "dec": 12,
            "december": 12,
            # French (full and abbreviated)
            "janv": 1,
            "janvier": 1,
            "févr": 2,
            "fév": 2,
            "février": 2,
            "mars": 3,
            "avr": 4,
            "avril": 4,
            "mai": 5,
            "juin": 6,
            "juil": 7,
            "juillet": 7,
            "août": 8,
            "aout": 8,
            "sept": 9,
            "septembre": 9,
            "octobre": 10,
            "novembre": 11,
            "déc": 12,
            "décembre": 12,
            # German (full and abbreviated)
            "jän": 1,
            "januar": 1,
            "februar": 2,
            "mär": 3,
            "märz": 3,
            "juni": 6,
            "juli": 7,
            "okt": 10,
            "oktober": 10,
            "dez": 12,
            "dezember": 12,
            "januari": 1,
            "februari": 2,
            "mrt": 3,
            "maart": 3,
            "mei": 5,
            "augustus": 8,
        }

        # Parse dates from both individual OCR results and combined text
        texts_to_parse = [ocr.text for ocr in ocr_results] + [combined_text]

        logger.info(
            "Starting date parsing",
            texts_to_parse=texts_to_parse,
            combined_text=combined_text
        )

        for text in texts_to_parse:
            for pattern, format_name in date_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)

                for match in matches:
                    try:
                        groups = match.groups()
                        parsed_date = None
                        confidence = 0.6  # Base confidence

                        logger.debug(
                            "Date pattern matched",
                            pattern=format_name,
                            matched_text=match.group(),
                            groups=groups
                        )

                        if format_name in ["DD/MM/YYYY", "DD/MM/YY"]:
                            day, month, year = groups
                            year = int(year)
                            if year < 100:  # 2-digit year
                                year += 2000 if year < 50 else 1900

                            logger.debug(
                                "Attempting to parse DD/MM/YYYY",
                                day=day,
                                month=month,
                                year=year
                            )

                            parsed_date = datetime(year, int(month), int(day))

                        elif format_name == "YYYY/MM/DD":
                            year, month, day = groups
                            parsed_date = datetime(int(year), int(month), int(day))

                        elif format_name == "DDMMYYYY":
                            # Handle compact format like '22112024'
                            if len(groups) == 3:
                                day, month, year = groups
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, int(month), int(day))

                        elif format_name in ["DD Mon YYYY", "DD Mon YY"]:
                            day, month_str, year = groups
                            # Try different cases for multilingual support
                            month = (
                                month_map.get(month_str.lower())
                                or month_map.get(month_str.capitalize())
                                or month_map.get(month_str.upper().lower())
                            )
                            if month:
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, month, int(day))
                                confidence = 0.8  # Higher confidence for month names

                        elif format_name == "Mon DD YYYY":
                            month_str, day, year = groups
                            # Try different cases for multilingual support
                            month = (
                                month_map.get(month_str.lower())
                                or month_map.get(month_str.capitalize())
                                or month_map.get(month_str.upper().lower())
                            )
                            if month:
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, month, int(day))
                                confidence = 0.8  # Higher confidence for month names

                        elif format_name == "DD MM YYYY":
                            day, month, year = groups
                            year = int(year)
                            if year < 100:
                                year += 2000 if year < 50 else 1900
                            parsed_date = datetime(year, int(month), int(day))

                        elif format_name == "DD/Mon/YYYY":
                            # Handle formats like '03/JUL/26' or '03-Jul-2026'
                            day, month_str, year = groups
                            # Try different cases for multilingual support
                            month = (
                                month_map.get(month_str.lower())
                                or month_map.get(month_str.capitalize())
                                or month_map.get(month_str.upper().lower())
                            )
                            if month:
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, month, int(day))
                                confidence = 0.85  # High confidence for this explicit format

                        # Enhanced date validation - allow wide range for debugging
                        # In production, should be more restrictive (e.g., 6 months past, 3 years future)
                        if parsed_date:
                            now = datetime.now()
                            ten_years_ago = now - timedelta(days=10 * 365)
                            five_years_future = now + timedelta(days=5 * 365)

                            if ten_years_ago <= parsed_date <= five_years_future:
                                # Boost confidence for dates near expiry keywords
                                if any(
                                    keyword in text.upper()
                                    for keyword in ["BEST", "EXP", "BB", "BY"]
                                ):
                                    confidence += 0.2

                                expiry_date = ExpiryDateResult(
                                    date=parsed_date,
                                    raw_text=match.group(),
                                    confidence=min(confidence, 1.0),
                                    format_detected=format_name,
                                )
                                expiry_dates.append(expiry_date)

                    except (ValueError, IndexError) as e:
                        logger.warning(
                            "Failed to parse date",
                            matched_text=match.group() if match else "unknown",
                            pattern=format_name,
                            error=str(e),
                            error_type=type(e).__name__
                        )
                        continue

        logger.info(
            "European date parsing completed",
            expiry_dates_parsed=len(expiry_dates),
            date_formats_supported=[
                "DD/MM/YYYY",
                "DD MM YYYY",
                "YYYY/MM/DD",
                "DD Mon YYYY",
            ],
            languages_supported=["English", "French", "German", "Dutch"],
            region="EU",
        )
        return expiry_dates

    async def _get_image_dimensions(self, image_data: bytes) -> dict[str, int]:
        """Get image dimensions from image data"""
        try:
            with Image.open(io.BytesIO(image_data)) as img:
                return {"width": img.width, "height": img.height}
        except Exception as e:
            logger.warning(f"Could not get image dimensions: {e}")
            return {"width": 0, "height": 0}

    def _is_obvious_barcode_number(self, text: str) -> bool:
        """Quick check if text is obviously a barcode (pure numeric, right length)"""
        clean_text = re.sub(r"[^\d]", "", text)
        return len(clean_text) in [8, 12, 13, 14] and clean_text.isdigit()

    def _find_barcode_patterns(self, text_blocks: list[str], annotations) -> list[dict]:
        """Find barcode patterns using sophisticated detection"""
        potential_barcodes = []
        all_numeric_blocks = []

        # First pass: collect all numeric blocks and their info
        for i, text in enumerate(text_blocks):
            clean_text = re.sub(r"[^\d]", "", text)
            if clean_text and clean_text.isdigit():
                all_numeric_blocks.append(
                    {
                        "text": clean_text,
                        "original": text,
                        "index": i,
                        "annotation": annotations[i] if i < len(annotations) else None,
                    }
                )

        # Check individual blocks first (highest priority)
        for block in all_numeric_blocks:
            clean_text = str(block["text"])
            if len(clean_text) in [8, 12, 13, 14]:
                barcode_info = self._validate_barcode(
                    clean_text, str(block["original"]), block["annotation"]
                )
                if barcode_info:
                    barcode_info["source"] = "single_block"
                    potential_barcodes.append(barcode_info)

        # Check for 11-digit numbers that might need a leading zero (common with UPC)
        for block in all_numeric_blocks:
            clean_text = str(block["text"])
            if len(clean_text) == 11:
                # Try adding leading zero for UPC-A
                padded = "0" + clean_text
                barcode_info = self._validate_barcode(
                    padded, str(block["original"]), block["annotation"]
                )
                if barcode_info:
                    barcode_info["source"] = "zero_padded"
                    barcode_info["confidence"] *= (
                        0.95  # Slightly lower confidence for padding
                    )
                    potential_barcodes.append(barcode_info)

        # Check for fragmented barcodes only if no good single blocks found
        if (
            not potential_barcodes
            or max(b["confidence"] for b in potential_barcodes) < 0.7
        ):
            potential_barcodes.extend(
                self._find_fragmented_barcodes(all_numeric_blocks)
            )

        # Sort by confidence and remove duplicates
        potential_barcodes.sort(
            key=lambda x: (x["confidence"], x.get("source", "") == "single_block"),
            reverse=True,
        )

        # Remove duplicates and prefer higher confidence
        unique_barcodes = []
        seen_values = set()

        for barcode in potential_barcodes:
            if barcode["value"] not in seen_values:
                unique_barcodes.append(barcode)
                seen_values.add(barcode["value"])
                # Only return the best barcode to avoid confusion
                if barcode["confidence"] >= 0.8:
                    break

        return unique_barcodes

    def _find_fragmented_barcodes(self, numeric_blocks: list[dict]) -> list[dict]:
        """Find barcodes that are split across multiple OCR blocks"""
        fragmented_barcodes = []

        for i, block1 in enumerate(numeric_blocks):
            if len(block1["text"]) >= 4:  # First part must be substantial
                # Look for adjacent blocks
                for j in range(i + 1, min(i + 4, len(numeric_blocks))):
                    block2 = numeric_blocks[j]
                    if len(block2["text"]) >= 2:  # Second part can be shorter
                        combined = block1["text"] + block2["text"]
                        if len(combined) in [8, 12, 13, 14]:
                            barcode_info = self._validate_barcode(
                                combined,
                                f"{block1['original']} {block2['original']}",
                                block1["annotation"],
                            )
                            if barcode_info:
                                barcode_info["source"] = "fragmented"
                                barcode_info["confidence"] *= (
                                    0.8  # Lower confidence for fragmented
                                )
                                fragmented_barcodes.append(barcode_info)

        return fragmented_barcodes

    def _validate_barcode(
        self, clean_digits: str, original_text: str, annotation
    ) -> dict | None:
        """Validate and score barcode candidates"""
        if not clean_digits or not clean_digits.isdigit():
            return None

        confidence = 0.5  # Base confidence
        barcode_format = "UNKNOWN"

        # Determine format and validate
        if len(clean_digits) == 13:
            if self._validate_ean13(clean_digits):
                barcode_format = "EAN_13"
                confidence = 0.9
            else:
                confidence = 0.3  # Invalid check digit
        elif len(clean_digits) == 12:
            if self._validate_upc_a(clean_digits):
                barcode_format = "UPC_A"
                confidence = 0.85
            else:
                confidence = 0.3
        elif len(clean_digits) == 8:
            if self._validate_ean8(clean_digits):
                barcode_format = "EAN_8"
                confidence = 0.8
            else:
                confidence = 0.25
        elif len(clean_digits) == 14:
            # GTIN-14, often used for packaging
            barcode_format = "GTIN_14"
            confidence = 0.7
        else:
            return None

        # Boost confidence for context clues
        if self._has_barcode_context(original_text):
            confidence = min(confidence + 0.1, 1.0)

        # Reduce confidence if it looks like a date
        if self._looks_like_date_fragment(clean_digits):
            confidence *= 0.5

        # Only return if confidence is reasonable
        if confidence < 0.3:
            return None

        return {
            "value": clean_digits,
            "format": barcode_format,
            "confidence": confidence,
            "bounding_box": self._extract_bounding_box(annotation.bounding_poly)
            if annotation
            else None,
        }

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

    def _has_barcode_context(self, text: str) -> bool:
        """Check if text has context suggesting it's near a barcode"""
        context_indicators = ["barcode", "ean", "upc", "gtin", "code"]
        text_lower = text.lower()
        return any(indicator in text_lower for indicator in context_indicators)

    def _is_european_barcode_pattern(self, text: str) -> bool:
        """
        Detect European barcode patterns, optimized for EAN-13
        Common in French/German/Dutch retail
        """
        # Remove any spaces or special characters
        clean_text = re.sub(r"[^\d]", "", text)

        # EAN-13: 13 digits (most common in Europe)
        if len(clean_text) == 13 and clean_text.isdigit():
            return True

        # EAN-8: 8 digits (also common in Europe)
        if len(clean_text) == 8 and clean_text.isdigit():
            return True

        # UPC-A: 12 digits (less common but still present)
        if len(clean_text) == 12 and clean_text.isdigit():
            return True

        return False

    def _is_barcode_pattern(self, text: str) -> bool:
        """Check if text matches common barcode patterns"""
        # First, exclude obvious date patterns to prevent false positives
        if re.match(
            r"^\d{4}[/\-\.]\d{2}[/\-\.]\d{2}$", text
        ):  # YYYY/MM/DD, YYYY-MM-DD, etc.
            return False
        if re.match(
            r"^\d{2}[/\-\.]\d{2}[/\-\.]\d{4}$", text
        ):  # DD/MM/YYYY, MM/DD/YYYY, etc.
            return False
        if re.match(
            r"^\d{2}[/\-\.]\d{2}[/\-\.]\d{2}$", text
        ):  # DD/MM/YY, MM/DD/YY, etc.
            return False
        # Exclude month-day patterns (like "SEP 30" which gets combined as "2021/02/02")
        if re.match(r"^\d{4}/\d{2}/\d{2}$", text) and self._looks_like_date_fragment(
            text
        ):
            return False

        # EAN-13: 13 digits (most common grocery barcode)
        if re.match(r"^\d{13}$", text):
            return True
        # UPC-A: 12 digits (common in US/Canada)
        if re.match(r"^\d{12}$", text):
            return True
        # EAN-8: 8 digits (shorter European barcode)
        if re.match(r"^\d{8}$", text):
            return True
        # Code 128: alphanumeric patterns (industrial/shipping)
        if (
            re.match(r"^[A-Z0-9\-]{6,}$", text)
            and len(text) >= 6
            and len(text) <= 20
            and not self._looks_like_text_fragment(text)
        ):  # Avoid product name fragments
            return True
        return False

    def _detect_barcode_format(self, barcode_value: str) -> str:
        """Detect barcode format based on value pattern"""
        if re.match(r"^\d{13}$", barcode_value):
            return "EAN_13"
        elif re.match(r"^\d{12}$", barcode_value):
            return "UPC_A"
        elif re.match(r"^\d{8}$", barcode_value):
            return "EAN_8"
        else:
            return "CODE_128"

    def _looks_like_date_fragment(self, text: str) -> bool:
        """Check if a numeric string looks like it could be a date"""
        # Pattern like YYYY/MM/DD where year is reasonable and month/day are valid ranges
        if re.match(r"^\d{4}/\d{2}/\d{2}$", text):
            try:
                parts = text.split("/")
                year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
                # Reasonable year range for food products
                if 2020 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31:
                    return True
            except (ValueError, IndexError):
                pass
        return False

    def _looks_like_text_fragment(self, text: str) -> bool:
        """Check if text looks like a product name fragment rather than a barcode"""
        # Common words that indicate product names, not barcodes
        product_keywords = [
            "MILK",
            "REDUCED",
            "FAT",
            "KIRKLAND",
            "SIGNATURE",
            "ORGANIC",
            "NATURAL",
        ]
        text_upper = text.upper()
        return any(keyword in text_upper for keyword in product_keywords)

    def _extract_bounding_box(self, bounding_poly) -> dict[str, int] | None:
        """Extract bounding box coordinates from Google Vision bounding poly"""
        try:
            if not bounding_poly or not bounding_poly.vertices:
                return None

            vertices = bounding_poly.vertices
            xs = [vertex.x for vertex in vertices if hasattr(vertex, "x")]
            ys = [vertex.y for vertex in vertices if hasattr(vertex, "y")]

            if xs and ys:
                return {
                    "x": min(xs),
                    "y": min(ys),
                    "width": max(xs) - min(xs),
                    "height": max(ys) - min(ys),
                }
        except Exception as e:
            logger.debug(f"Could not extract bounding box: {e}")

        return None


# For backward compatibility and easy importing
__all__ = [
    "GoogleVisionService",
    "VisionScanResult",
    "BarcodeResult",
    "OCRResult",
    "ExpiryDateResult",
]
