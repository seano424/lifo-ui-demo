"""
Google Cloud Vision API service for OCR, barcode detection, and image analysis
Provides real Google Vision integration for complex image processing tasks
"""

import asyncio
import io
import re
from datetime import datetime, timedelta
from typing import Any, Optional

import structlog
from google.cloud import vision
from google.api_core.client_options import ClientOptions
from pydantic import BaseModel
from PIL import Image

logger = structlog.get_logger()


class BarcodeResult(BaseModel):
    """Barcode detection result from Google Vision"""
    value: str
    format: str  # EAN_13, UPC_A, CODE_128, etc.
    confidence: float
    bounding_box: Optional[dict[str, int]] = None


class OCRResult(BaseModel):
    """OCR text detection result"""
    text: str
    confidence: float
    bounding_box: Optional[dict[str, int]] = None


class ExpiryDateResult(BaseModel):
    """Parsed expiry date from OCR text"""
    date: Optional[datetime] = None
    raw_text: str
    confidence: float
    format_detected: Optional[str] = None  # DD/MM/YYYY, MM/DD/YYYY, etc.


class VisionScanResult(BaseModel):
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
    Handles OCR, barcode detection, and text analysis
    """
    
    def __init__(self, project_id: Optional[str] = None):
        """Initialize Google Vision client"""
        self.project_id = project_id
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Google Vision API client with EU regional endpoint"""
        try:
            # Use EU regional endpoint for European operations
            # Better latency and data residency compliance for EU users
            client_options = ClientOptions(
                api_endpoint="eu-vision.googleapis.com",
                quota_project_id=self.project_id
            )
            
            self.client = vision.ImageAnnotatorClient(client_options=client_options)
            logger.info(
                "Google Vision API client initialized successfully", 
                region="EU",
                endpoint="eu-vision.googleapis.com",
                project_id=self.project_id
            )
            
        except Exception as e:
            logger.error(
                "Failed to initialize Google Vision client", 
                error=str(e),
                error_type=type(e).__name__,
                region="EU",
                endpoint="eu-vision.googleapis.com"
            )
            # For development, we'll create a None client and handle gracefully
            self.client = None
    
    async def process_image(self, image_data: bytes) -> VisionScanResult:
        """
        Process image with Google Vision API for comprehensive analysis
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            VisionScanResult with all detected information
        """
        start_time = datetime.now()
        
        if not self.client:
            logger.warning("Google Vision client not available, returning empty result")
            return VisionScanResult()
        
        try:
            # Preprocess image for optimal European food label OCR
            preprocessed_data = await self._preprocess_image_for_eu_food_labels(image_data)
            image_dimensions = await self._get_image_dimensions(preprocessed_data)
            
            # Create Vision API image object
            image = vision.Image(content=preprocessed_data)
            
            # Single optimized API call for both text and barcode detection
            barcodes, raw_text = await self._detect_text_and_barcodes_combined(image)
            
            # Parse expiry dates from OCR text
            expiry_dates = self._parse_expiry_dates(raw_text)
            
            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Calculate average confidence scores
            text_confidence_avg = (
                sum(ocr.confidence for ocr in raw_text) / len(raw_text)
                if raw_text else 0.0
            )
            barcode_confidence_avg = (
                sum(barcode.confidence for barcode in barcodes) / len(barcodes)
                if barcodes else 0.0
            )
            
            return VisionScanResult(
                barcodes=barcodes,
                raw_text=raw_text,
                expiry_dates=expiry_dates,
                image_dimensions=image_dimensions,
                processing_time_ms=processing_time,
                text_confidence_avg=text_confidence_avg,
                barcode_confidence_avg=barcode_confidence_avg
            )
            
        except Exception as e:
            logger.error(
                "Google Vision processing failed", 
                error=str(e), 
                error_type=type(e).__name__,
                region="EU",
                processing_time_ms=(datetime.now() - start_time).total_seconds() * 1000
            )
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            return VisionScanResult(processing_time_ms=processing_time)
    
    async def _preprocess_image_for_eu_food_labels(self, image_data: bytes) -> bytes:
        """
        Preprocess image for optimal European food label OCR
        Optimized for French/German/Dutch packaging standards
        """
        try:
            # Load image with PIL for preprocessing
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed (handle RGBA, grayscale, etc.)
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Optimize image size for Google Vision (640x480 recommended)
            max_size = (640, 480)
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                logger.debug(f"Resized image from original to {image.size}")
            
            # Enhance contrast for European packaging (often darker backgrounds)
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.2)  # Slightly increase contrast
            
            # Save optimized image as JPEG (best for Vision API)
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            optimized_data = output.getvalue()
            
            # Validate file size (10MB limit for text detection)
            if len(optimized_data) > 10 * 1024 * 1024:
                # Further compress if too large
                output = io.BytesIO()
                image.save(output, format='JPEG', quality=70, optimize=True)
                optimized_data = output.getvalue()
                logger.warning("Image compressed further due to size limits")
            
            logger.debug(f"Image preprocessed: {len(image_data)} -> {len(optimized_data)} bytes")
            return optimized_data
            
        except Exception as e:
            logger.error(f"Image preprocessing failed: {e}")
            # Return original data if preprocessing fails
            return image_data
    
    async def _detect_text_and_barcodes_combined(self, image: vision.Image) -> tuple[list[BarcodeResult], list[OCRResult]]:
        """
        Single API call for both text detection and barcode extraction
        Optimized for European markets and EAN-13 barcodes
        """
        try:
            # Configure features for European food labels
            features = [
                vision.Feature(type_=vision.Feature.Type.TEXT_DETECTION),
            ]
            
            # Configure image context for European text (multilingual support)
            image_context = vision.ImageContext(
                language_hints=['en', 'fr', 'de', 'nl']  # English, French, German, Dutch
            )
            
            # Single API request with all features
            request = vision.AnnotateImageRequest(
                image=image,
                features=features,
                image_context=image_context
            )
            
            # Execute request in thread pool to avoid blocking
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.annotate_image(request)
            )
            
            # Extract both text and barcodes from single response
            barcodes = []
            ocr_results = []
            
            if response.text_annotations:
                # First annotation contains full text
                full_text = response.text_annotations[0].description if response.text_annotations else ""
                
                # Process individual text annotations
                for annotation in response.text_annotations[1:]:  # Skip full text annotation
                    text = annotation.description.strip()
                    
                    # Check if text looks like a barcode (EAN-13 common in EU)
                    if self._is_european_barcode_pattern(text):
                        barcode = BarcodeResult(
                            value=text,
                            format=self._detect_barcode_format(text),
                            confidence=0.9,  # High confidence for clear barcode patterns
                            bounding_box=self._extract_bounding_box(annotation.bounding_poly)
                        )
                        barcodes.append(barcode)
                    else:
                        # Regular OCR text
                        ocr_result = OCRResult(
                            text=text,
                            confidence=0.8,  # Default confidence for text
                            bounding_box=self._extract_bounding_box(annotation.bounding_poly)
                        )
                        ocr_results.append(ocr_result)
            
            logger.info(
                "EU-optimized Vision API processing completed",
                barcodes_detected=len(barcodes),
                text_blocks_detected=len(ocr_results),
                languages=['en', 'fr', 'de', 'nl'],
                region="EU"
            )
            return barcodes, ocr_results
            
        except Exception as e:
            logger.error(f"Combined text/barcode detection failed: {e}")
            return [], []
    
    async def _detect_barcodes(self, image: vision.Image) -> list[BarcodeResult]:
        """Detect barcodes in image using Google Vision API"""
        try:
            # Run in thread pool to avoid blocking
            response = await asyncio.get_event_loop().run_in_executor(
                None, 
                lambda: self.client.text_detection(image=image)
            )
            
            # Also try barcode detection specifically
            barcode_response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.annotate_image({
                    'image': image,
                    'features': [{'type_': vision.Feature.Type.TEXT_DETECTION}]
                })
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
                            bounding_box=self._extract_bounding_box(annotation.bounding_poly)
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
            # Run OCR in thread pool
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.client.text_detection(image=image)
            )
            
            ocr_results = []
            
            if response.text_annotations:
                # Skip the first annotation (full text) and process individual words/blocks
                for annotation in response.text_annotations[1:]:
                    if annotation.description.strip():
                        ocr_result = OCRResult(
                            text=annotation.description.strip(),
                            confidence=0.8,  # Google Vision doesn't provide per-word confidence
                            bounding_box=self._extract_bounding_box(annotation.bounding_poly)
                        )
                        ocr_results.append(ocr_result)
            
            logger.info(f"Extracted {len(ocr_results)} text blocks")
            return ocr_results
            
        except Exception as e:
            logger.error(f"Text extraction failed: {e}")
            return []
    
    def _parse_expiry_dates(self, ocr_results: list[OCRResult]) -> list[ExpiryDateResult]:
        """
        Parse expiry dates from OCR text results
        Enhanced to handle real-world OCR variations and fragmented text
        Supports multiple date formats and expiry indicators
        """
        expiry_dates = []
        
        # Combine all OCR text for context-aware parsing
        combined_text = ' '.join([ocr.text for ocr in ocr_results])
        
        # Enhanced date patterns with more variations
        date_patterns = [
            # Standard date formats with various separators
            (r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b', 'DD/MM/YYYY'),
            (r'\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})\b', 'DD/MM/YY'),
            (r'\b(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\b', 'YYYY/MM/DD'),
            
            # Space-separated dates
            (r'\b(\d{1,2})\s+(\d{1,2})\s+(\d{2,4})\b', 'DD MM YYYY'),
            
            # Compact date formats (common on packaging)
            (r'\b(\d{2})(\d{2})(\d{2,4})\b', 'DDMMYYYY'),
            
            # Month names (multilingual) - more comprehensive
            (r'\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Nov|Déc|Jän|Mär|Okt|Dez|Januar|Februar|März|Juni|Juli|Oktober|Dezember|NOV)\s*(\d{2,4})\b', 'DD Mon YYYY'),
            (r'\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Janv|Févr|Mars|Avr|Mai|Juin|Juil|Août|Sept|Nov|Déc|Jän|Mär|Okt|Dez|NOV)\s*(\d{1,2})\s*(\d{2,4})\b', 'Mon DD YYYY'),
            
            # Dates with expiry indicators nearby
            (r'(?:exp|EXP|BEST\s*BY|BB|Best\s*before|À\s*consommer\s*avant|Mindestens\s*haltbar\s*bis)[\s:]*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})', 'DD/MM/YYYY'),
            (r'(?:exp|EXP|BEST\s*BY|BB)[\s:]*(\d{1,2})(\w{3})(\d{2,4})', 'DD Mon YYYY'),
            
            # Special format like '22NOV2017'
            (r'\b(\d{1,2})([A-Z]{3})(\d{4})\b', 'DD Mon YYYY'),
            (r'\b(\d{1,2})([A-Z]{3})(\d{2})\b', 'DD Mon YY'),
        ]
        
        # Enhanced multilingual month mapping
        month_map = {
            # English (full and abbreviated)
            'jan': 1, 'january': 1, 'feb': 2, 'february': 2, 'mar': 3, 'march': 3,
            'apr': 4, 'april': 4, 'may': 5, 'jun': 6, 'june': 6,
            'jul': 7, 'july': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
            'oct': 10, 'october': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
            
            # French (full and abbreviated)
            'janv': 1, 'janvier': 1, 'févr': 2, 'fév': 2, 'février': 2,
            'mars': 3, 'avr': 4, 'avril': 4, 'mai': 5, 'juin': 6,
            'juil': 7, 'juillet': 7, 'août': 8, 'aout': 8, 'sept': 9, 'septembre': 9,
            'oct': 10, 'octobre': 10, 'nov': 11, 'novembre': 11, 'déc': 12, 'décembre': 12,
            
            # German (full and abbreviated)
            'jän': 1, 'januar': 1, 'feb': 2, 'februar': 2, 'mär': 3, 'märz': 3,
            'apr': 4, 'april': 4, 'mai': 5, 'jun': 6, 'juni': 6,
            'jul': 7, 'juli': 7, 'aug': 8, 'august': 8, 'sep': 9, 'september': 9,
            'okt': 10, 'oktober': 10, 'nov': 11, 'november': 11, 'dez': 12, 'dezember': 12,
            
            # Dutch (full and abbreviated)
            'jan': 1, 'januari': 1, 'feb': 2, 'februari': 2, 'mrt': 3, 'maart': 3,
            'apr': 4, 'april': 4, 'mei': 5, 'jun': 6, 'juni': 6,
            'jul': 7, 'juli': 7, 'aug': 8, 'augustus': 8, 'sep': 9, 'september': 9,
            'okt': 10, 'oktober': 10, 'nov': 11, 'november': 11, 'dec': 12, 'december': 12,
        }
        
        # Parse dates from both individual OCR results and combined text
        texts_to_parse = [ocr.text for ocr in ocr_results] + [combined_text]
        
        for text in texts_to_parse:
            for pattern, format_name in date_patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE)
                
                for match in matches:
                    try:
                        groups = match.groups()
                        parsed_date = None
                        confidence = 0.6  # Base confidence
                        
                        if format_name in ['DD/MM/YYYY', 'DD/MM/YY']:
                            day, month, year = groups
                            year = int(year)
                            if year < 100:  # 2-digit year
                                year += 2000 if year < 50 else 1900
                            parsed_date = datetime(year, int(month), int(day))
                            
                        elif format_name == 'YYYY/MM/DD':
                            year, month, day = groups
                            parsed_date = datetime(int(year), int(month), int(day))
                            
                        elif format_name == 'DDMMYYYY':
                            # Handle compact format like '22112024'
                            if len(groups) == 3:
                                day, month, year = groups
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, int(month), int(day))
                            
                        elif format_name in ['DD Mon YYYY', 'DD Mon YY']:
                            day, month_str, year = groups
                            # Try different cases for multilingual support
                            month = (month_map.get(month_str.lower()) or 
                                   month_map.get(month_str.capitalize()) or
                                   month_map.get(month_str.upper().lower()))
                            if month:
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, month, int(day))
                                confidence = 0.8  # Higher confidence for month names
                                
                        elif format_name == 'Mon DD YYYY':
                            month_str, day, year = groups
                            # Try different cases for multilingual support
                            month = (month_map.get(month_str.lower()) or 
                                   month_map.get(month_str.capitalize()) or
                                   month_map.get(month_str.upper().lower()))
                            if month:
                                year = int(year)
                                if year < 100:
                                    year += 2000 if year < 50 else 1900
                                parsed_date = datetime(year, month, int(day))
                                confidence = 0.8  # Higher confidence for month names
                        
                        elif format_name == 'DD MM YYYY':
                            day, month, year = groups
                            year = int(year)
                            if year < 100:
                                year += 2000 if year < 50 else 1900
                            parsed_date = datetime(year, int(month), int(day))
                        
                        # Enhanced date validation - allow wide range for debugging
                        # In production, should be more restrictive (e.g., 6 months past, 3 years future)
                        if parsed_date:
                            now = datetime.now()
                            ten_years_ago = now - timedelta(days=10*365)
                            five_years_future = now + timedelta(days=5*365)
                            
                            if ten_years_ago <= parsed_date <= five_years_future:
                                # Boost confidence for dates near expiry keywords
                                if any(keyword in text.upper() for keyword in ['BEST', 'EXP', 'BB', 'BY']):
                                    confidence += 0.2
                                
                                expiry_date = ExpiryDateResult(
                                    date=parsed_date,
                                    raw_text=match.group(),
                                    confidence=min(confidence, 1.0),
                                    format_detected=format_name
                                )
                                expiry_dates.append(expiry_date)
                            
                    except (ValueError, IndexError) as e:
                        logger.debug(f"Failed to parse date from '{match.group()}': {e}")
                        continue
        
        logger.info(
            "European date parsing completed",
            expiry_dates_parsed=len(expiry_dates),
            date_formats_supported=['DD/MM/YYYY', 'DD MM YYYY', 'YYYY/MM/DD', 'DD Mon YYYY'],
            languages_supported=['English', 'French', 'German', 'Dutch'],
            region="EU"
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
    
    def _is_european_barcode_pattern(self, text: str) -> bool:
        """
        Detect European barcode patterns, optimized for EAN-13
        Common in French/German/Dutch retail
        """
        # Remove any spaces or special characters
        clean_text = re.sub(r'[^\d]', '', text)
        
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
        if re.match(r'^\d{4}[/\-\.]\d{2}[/\-\.]\d{2}$', text):  # YYYY/MM/DD, YYYY-MM-DD, etc.
            return False
        if re.match(r'^\d{2}[/\-\.]\d{2}[/\-\.]\d{4}$', text):  # DD/MM/YYYY, MM/DD/YYYY, etc.
            return False
        if re.match(r'^\d{2}[/\-\.]\d{2}[/\-\.]\d{2}$', text):   # DD/MM/YY, MM/DD/YY, etc.
            return False
            
        # EAN-13: 13 digits
        if re.match(r'^\d{13}$', text):
            return True
        # UPC-A: 12 digits
        if re.match(r'^\d{12}$', text):
            return True
        # EAN-8: 8 digits
        if re.match(r'^\d{8}$', text):
            return True
        # Code 128: alphanumeric patterns (common in retail)
        if (re.match(r'^[A-Z0-9\-]{6,}$', text) and 
            len(text) >= 6 and 
            len(text) <= 20):  # Reasonable barcode length
            return True
        return False
    
    def _detect_barcode_format(self, barcode_value: str) -> str:
        """Detect barcode format based on value pattern"""
        if re.match(r'^\d{13}$', barcode_value):
            return 'EAN_13'
        elif re.match(r'^\d{12}$', barcode_value):
            return 'UPC_A'
        elif re.match(r'^\d{8}$', barcode_value):
            return 'EAN_8'
        else:
            return 'CODE_128'
    
    def _extract_bounding_box(self, bounding_poly) -> Optional[dict[str, int]]:
        """Extract bounding box coordinates from Google Vision bounding poly"""
        try:
            if not bounding_poly or not bounding_poly.vertices:
                return None
            
            vertices = bounding_poly.vertices
            xs = [vertex.x for vertex in vertices if hasattr(vertex, 'x')]
            ys = [vertex.y for vertex in vertices if hasattr(vertex, 'y')]
            
            if xs and ys:
                return {
                    "x": min(xs),
                    "y": min(ys),
                    "width": max(xs) - min(xs),
                    "height": max(ys) - min(ys)
                }
        except Exception as e:
            logger.debug(f"Could not extract bounding box: {e}")
        
        return None


# For backward compatibility and easy importing
__all__ = [
    'GoogleVisionService',
    'VisionScanResult', 
    'BarcodeResult',
    'OCRResult',
    'ExpiryDateResult'
]