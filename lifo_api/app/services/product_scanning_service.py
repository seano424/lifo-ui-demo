"""
Product scanning service with Google Vision API for OCR and barcode detection
Focused on complex image processing while frontend handles simple product lookups
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any, Optional

import structlog
from pydantic import BaseModel

from app.services.vision_service import GoogleVisionService, VisionScanResult

logger = structlog.get_logger()


class ProductScanResult(BaseModel):
    """OCR and barcode scanning result focused on Google Vision processing"""
    
    # Vision processing results
    vision_result: VisionScanResult
    
    # Extracted data from image processing
    primary_barcode: Optional[str] = None
    suggested_expiry_date: Optional[datetime] = None
    confidence_score: float = 0.0
    
    # OCR extracted text suggestions
    suggested_name: Optional[str] = None
    raw_text_blocks: list[str] = []
    
    # Processing metadata
    processing_time_ms: float = 0.0
    data_sources: list[str] = ["google_vision"]
    requires_user_confirmation: bool = True
    
    # Quality indicators
    barcode_confidence: float = 0.0
    expiry_confidence: float = 0.0


class ScanningWorkflow(BaseModel):
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
    
    def __init__(self, vision_service: Optional[GoogleVisionService] = None):
        """Initialize scanning service with vision API client"""
        self.vision_service = vision_service or GoogleVisionService()
        
        # Default workflow configuration
        self.default_workflow = ScanningWorkflow()

    async def scan_product_image(
        self, 
        image_data: bytes, 
        workflow: Optional[ScanningWorkflow] = None
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
                image_data, 
                timeout_ms=workflow.max_processing_time_ms
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
                vision_result, 
                primary_barcode,
                suggested_expiry
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
                    confidence_scores["overall"], 
                    workflow.confidence_threshold
                )
            )
            
            logger.info(
                "Product scanning completed",
                barcode=primary_barcode,
                has_expiry=suggested_expiry is not None,
                confidence=confidence_scores["overall"],
                processing_time_ms=processing_time_ms
            )
            
            return result
            
        except Exception as e:
            processing_time_ms = (datetime.now() - start_time).total_seconds() * 1000
            logger.error(
                "Product scanning failed", 
                error=str(e),
                processing_time_ms=processing_time_ms
            )
            raise ProductScanningError(f"Image processing failed: {str(e)}")

    async def extract_primary_barcode(self, image_data: bytes) -> Optional[str]:
        """Extract primary barcode from image - simple wrapper for frontend"""
        try:
            vision_result = await self._process_image_with_timeout(image_data, timeout_ms=3000)
            return self._extract_primary_barcode(vision_result)
        except Exception as e:
            logger.warning(f"Barcode extraction failed: {e}")
            return None

    async def extract_expiry_date(self, image_data: bytes) -> Optional[datetime]:
        """Extract expiry date from image - simple wrapper for frontend"""
        try:
            vision_result = await self._process_image_with_timeout(image_data, timeout_ms=4000)
            return self._extract_best_expiry_date(vision_result)
        except Exception as e:
            logger.warning(f"Expiry date extraction failed: {e}")
            return None

    async def _process_image_with_timeout(
        self, 
        image_data: bytes, 
        timeout_ms: float
    ) -> VisionScanResult:
        """Process image with timeout protection"""
        try:
            return await asyncio.wait_for(
                self.vision_service.process_image(image_data),
                timeout=timeout_ms / 1000
            )
        except asyncio.TimeoutError:
            raise ProductScanningError(
                f"Vision processing timed out after {timeout_ms}ms",
                error_type="timeout_error"
            )

    def _extract_primary_barcode(self, vision_result: VisionScanResult) -> Optional[str]:
        """Extract the most confident barcode from vision results"""
        if not vision_result.barcodes:
            return None
        
        # Sort by confidence and return the best one
        best_barcode = max(vision_result.barcodes, key=lambda b: b.confidence)
        
        if best_barcode.confidence >= 0.6:  # Minimum confidence threshold
            return best_barcode.value
        
        return None

    def _extract_best_expiry_date(self, vision_result: VisionScanResult) -> Optional[datetime]:
        """Extract the most confident expiry date from vision results"""
        if not vision_result.expiry_dates:
            return None
        
        # Sort by confidence and return the best one
        best_expiry = max(vision_result.expiry_dates, key=lambda e: e.confidence)
        
        if best_expiry.confidence >= 0.65 and best_expiry.date:
            return best_expiry.date
        
        return None

    def _generate_text_suggestions(self, vision_result: VisionScanResult) -> dict[str, Any]:
        """Generate product name suggestions from OCR text"""
        suggestions: dict[str, Any] = {"name": None}
        
        if not vision_result.raw_text:
            return suggestions
        
        # Extract potential product name from text blocks
        text_blocks = [ocr.text.strip() for ocr in vision_result.raw_text if ocr.confidence > 0.5]
        
        if text_blocks:
            # Use the most confident text block as potential name
            best_text = max(vision_result.raw_text, key=lambda t: t.confidence)
            if best_text.confidence > 0.7:
                suggestions["name"] = best_text.text.strip()
        
        return suggestions

    def _calculate_confidence_scores(
        self,
        vision_result: VisionScanResult,
        primary_barcode: Optional[str],
        suggested_expiry: Optional[datetime]
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
            text_confidence = sum(ocr.confidence for ocr in vision_result.raw_text) / len(vision_result.raw_text)
        
        # Overall confidence (weighted average)
        overall_confidence = (
            barcode_confidence * 0.4 +
            expiry_confidence * 0.3 +
            text_confidence * 0.3
        )
        
        return {
            "barcode": barcode_confidence,
            "expiry": expiry_confidence,
            "text": text_confidence,
            "overall": overall_confidence
        }

    def _requires_user_confirmation(self, confidence_score: float, threshold: float) -> bool:
        """Determine if result requires user confirmation"""
        return confidence_score < threshold