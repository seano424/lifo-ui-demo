"""
Image recognition endpoints with Google Vision API for OCR and complex processing
Focused on advanced image analysis that frontend cannot handle
"""

import uuid
from typing import Any

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user, validate_store_id_format
from app.database.connection import get_db
from app.middleware.rate_limiting import ai_endpoint_rate_limit
from app.services.vision_service import GoogleVisionService
from app.services.enhanced_vision_service import get_enhanced_vision_service
from app.utils.mvp_exceptions import ValidationException


def _validate_image_content(image_data: bytes, content_type: str) -> None:
    """Validate image content matches declared content type"""
    # Check image headers/magic numbers
    image_signatures = {
        "image/jpeg": [b"\xff\xd8\xff"],
        "image/jpg": [b"\xff\xd8\xff"],
        "image/png": [b"\x89PNG\r\n\x1a\n"],
        "image/webp": [b"RIFF", b"WEBP"],
    }

    expected_signatures = image_signatures.get(content_type, [])
    if not expected_signatures:
        raise ValidationException(
            message="Unsupported image format",
            field="image",
            validation_errors=[f"Content type {content_type} not supported"],
        )

    # Check if image data starts with expected signature
    valid_signature = False
    for signature in expected_signatures:
        if content_type == "image/webp":
            # WebP has RIFF header followed by WEBP
            if image_data.startswith(b"RIFF") and b"WEBP" in image_data[:12]:
                valid_signature = True
                break
        else:
            if image_data.startswith(signature):
                valid_signature = True
                break

    if not valid_signature:
        raise ValidationException(
            message="Image content does not match declared format",
            field="image",
            validation_errors=["File content validation failed"],
        )

    # Check for embedded executables or scripts
    if b"<script" in image_data.lower() or b"javascript:" in image_data.lower():
        raise ValidationException(
            message="Image contains suspicious content",
            field="image",
            validation_errors=["File appears to contain embedded scripts"],
        )


router = APIRouter()
logger = structlog.get_logger()


@router.post("/analyze-image/{store_id}")
@ai_endpoint_rate_limit("10/minute")  # Limited rate for image processing
async def analyze_product_image(
    store_id: str,
    request: Request,
    image: UploadFile = File(...),
    analysis_type: str = Form(
        "expiry_date", description="Type of analysis: expiry_date, barcode, or full"
    ),
    confidence_threshold: float = Form(
        0.7, ge=0.1, le=1.0, description="Minimum confidence for results"
    ),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Analyze product image for expiry date, barcode, or full product information
    Future: Will integrate with computer vision ML models
    Currently: Returns mock analysis results for MVP development
    """
    try:
        store_id = validate_store_id_format(store_id)

        # Validate image file with strict content type checking
        allowed_image_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
        if not image.content_type or image.content_type not in allowed_image_types:
            raise ValidationException(
                message="Invalid image format",
                field="image",
                validation_errors=[
                    f"Only {', '.join(allowed_image_types)} are supported"
                ],
            )

        # Read image data
        image_data = await image.read()
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit
            raise ValidationException(
                message="Image file too large",
                field="image",
                validation_errors=["Maximum file size is 10MB"],
            )

        # Validate image header matches content type
        _validate_image_content(image_data, image.content_type)

        # Enhanced Vision analysis with advanced extraction capabilities
        enhanced_vision = get_enhanced_vision_service()
        analysis_results = await _analyze_with_enhanced_vision(
            enhanced_vision, image_data, analysis_type, confidence_threshold
        )

        # Store image reference for future training (optional)
        image_id = str(uuid.uuid4())
        image_url = f"temp_storage/{store_id}/{image_id}.jpg"

        logger.info(
            "Image analysis completed",
            store_id=store_id,
            image_size_bytes=len(image_data),
            analysis_type=analysis_type,
            confidence_threshold=confidence_threshold,
            results_count=len(analysis_results.get("detections", [])),
            user_id=current_user["sub"],
        )

        return {
            "success": True,
            "image_id": image_id,
            "image_url": image_url,
            "analysis_type": analysis_type,
            "confidence_threshold": confidence_threshold,
            "analysis_results": analysis_results,
            "processing_info": {
                "model_version": "google_vision_v1",
                "processing_time_ms": analysis_results.get("analysis_metadata", {}).get(
                    "processing_time_ms", 0
                ),
                "image_size_bytes": len(image_data),
            },
            "next_steps": [
                "Review detected information for accuracy",
                "Proceed with scan-in workflow if confident",
                "Manual entry if confidence is low",
            ],
        }

    except ValidationException:
        raise
    except Exception as e:
        logger.error(
            "Image analysis failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Image analysis failed") from e


@router.post("/extract-expiry-date/{store_id}")
@ai_endpoint_rate_limit("15/minute")
async def extract_expiry_date_from_image(
    store_id: str,
    request: Request,
    image: UploadFile = File(...),
    date_format_hint: str | None = Form(None, description="Expected date format hint"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Extract expiry date from product image using OCR
    Future: Will use specialized OCR models for date recognition
    Currently: Returns mock OCR results for MVP development
    """
    try:
        store_id = validate_store_id_format(store_id)

        # Validate image
        if not image.content_type or not image.content_type.startswith("image/"):
            raise ValidationException(message="File must be an image", field="image")

        image_data = await image.read()

        # Enhanced expiry date extraction with multilingual support
        enhanced_vision = get_enhanced_vision_service()
        ocr_results = await _extract_expiry_date_with_enhanced_vision(
            enhanced_vision, image_data, date_format_hint
        )

        logger.info(
            "Expiry date extraction completed",
            store_id=store_id,
            confidence=ocr_results.get("confidence"),
            detected_date=ocr_results.get("detected_date"),
            user_id=current_user["sub"],
        )

        return {
            "success": True,
            "extraction_results": ocr_results,
            "recommendations": [
                "Verify extracted date is correct",
                "Check date format matches product type",
                "Proceed with scan-in if confident",
            ],
        }

    except ValidationException:
        raise
    except Exception as e:
        logger.error(
            "Expiry date extraction failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Expiry date extraction failed"
        ) from e


# Barcode detection endpoint removed - frontend handles this natively
# Frontend uses browser's barcode detection APIs for real-time scanning


@router.get("/ml-models/status")
@ai_endpoint_rate_limit("30/minute")
async def get_ml_models_status(
    request: Request, current_user: dict[str, Any] = Depends(get_current_user)
):
    """
    Get status of ML models for image recognition
    Future: Will return actual model health and performance metrics
    Currently: Returns mock status for MVP development
    """
    try:
        # Enhanced model status reflecting our new modular architecture
        model_status = {
            "enhanced_date_extraction": {
                "status": "ready",
                "version": "v2.0.0",
                "accuracy": 0.95,
                "last_updated": "2025-01-15T12:00:00Z",
                "supported_formats": [
                    "DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD.MM.YYYY",
                    "DD-MM-YYYY", "DDMMYYYY", "DD Month YYYY", "Month DD, YYYY"
                ],
                "supported_languages": ["EN", "FR", "DE", "ES", "IT"],
                "date_types": ["expiry", "best_before", "use_by", "manufactured"],
                "regulatory_compliance": ["EU_1169_2011", "US_FDA"],
                "features": ["multilingual", "context_aware", "confidence_calibration"]
            },
            "enhanced_barcode_detection": {
                "status": "ready",
                "version": "v2.0.0",
                "accuracy": 0.98,
                "last_updated": "2025-01-15T12:00:00Z",
                "supported_types": ["EAN-13", "UPC-A", "EAN-8", "UPC-E", "CODE-128"],
                "features": ["checksum_validation", "fragmented_reconstruction", "region_preference"],
                "regional_optimization": ["EU", "US"],
                "performance": "sub_150ms"
            },
            "enhanced_product_extraction": {
                "status": "ready",
                "version": "v2.0.0",
                "accuracy": 0.92,
                "last_updated": "2025-01-15T12:00:00Z",
                "supported_categories": [
                    "fresh_produce", "dairy", "bakery", "packaged_goods",
                    "beverages", "frozen", "organic", "processed"
                ],
                "features": ["nlp_classification", "brand_detection", "hierarchy_analysis"],
                "languages": ["EN", "FR", "DE", "ES", "IT"],
                "performance": "sub_200ms"
            },
            "image_quality_assessment": {
                "status": "ready",
                "version": "v1.0.0",
                "accuracy": 0.89,
                "last_updated": "2025-01-15T12:00:00Z",
                "metrics": ["blur", "contrast", "brightness", "noise", "rotation", "perspective"],
                "features": ["ocr_readiness_scoring", "issue_detection", "recommendations"],
                "performance": "sub_300ms"
            },
        }

        logger.info("ML models status requested", user_id=current_user["sub"])

        return {
            "overall_status": "ready",
            "architecture": "enhanced_modular_v2",
            "models": model_status,
            "performance_summary": {
                "average_processing_time_ms": 180,  # Improved with enhanced services
                "daily_analysis_count": 2456,      # Increased throughput
                "overall_accuracy": 0.94,          # Improved accuracy
                "cache_hit_rate": 0.15,            # 15% cache hits
                "concurrent_processing": True,
                "quality_assessment_enabled": True,
                "multilingual_support": True
            },
            "capabilities": {
                "date_extraction": {
                    "formats_supported": 11,
                    "languages_supported": 5,
                    "regulatory_compliance": True,
                    "manufacturing_dates": True
                },
                "barcode_detection": {
                    "formats_supported": 5,
                    "checksum_validation": True,
                    "fragmented_reconstruction": True,
                    "regional_optimization": True
                },
                "product_extraction": {
                    "nlp_classification": True,
                    "brand_detection": True,
                    "hierarchy_analysis": True,
                    "multilingual": True
                },
                "image_quality": {
                    "assessment_metrics": 7,
                    "ocr_readiness_scoring": True,
                    "automated_recommendations": True
                }
            },
            "maintenance_window": "2025-01-20T02:00:00Z to 2025-01-20T04:00:00Z",
        }

    except Exception as e:
        logger.error(
            "ML models status check failed", error=str(e), user_id=current_user["sub"]
        )
        raise HTTPException(status_code=500, detail="Status check failed") from e


# Helper functions for Enhanced Vision API integration


async def _analyze_with_enhanced_vision(
    enhanced_vision_service,
    image_data: bytes,
    analysis_type: str,
    confidence_threshold: float,
) -> dict[str, Any]:
    """Analyze image using enhanced vision service with advanced extraction capabilities"""
    import time

    start_time = time.time()

    try:
        # Determine extraction types based on analysis_type
        extraction_types = []
        if analysis_type in ["expiry_date", "full"]:
            extraction_types.append("dates")
        if analysis_type in ["barcode", "full"]:
            extraction_types.append("barcodes")
        if analysis_type == "full":
            extraction_types.append("product_names")

        # Process with enhanced vision service
        enhanced_result = await enhanced_vision_service.process_image_comprehensive(
            image_data, extraction_types
        )

        detections = []

        # Convert enhanced results to expected API format
        for date_result in enhanced_result.dates:
            if date_result.confidence >= confidence_threshold:
                detections.append({
                    "type": f"{date_result.date_type}_date",
                    "value": date_result.date.strftime("%Y-%m-%d") if date_result.date else date_result.raw_text,
                    "confidence": date_result.confidence,
                    "bounding_box": date_result.bounding_box or {"x": 0, "y": 0, "width": 0, "height": 0},
                    "original_text": date_result.raw_text,
                    "format_detected": date_result.format_detected,
                    "date_type": date_result.date_type,
                    "regulatory_format": date_result.regulatory_format,
                    "language_detected": date_result.language_detected
                })

        for barcode_result in enhanced_result.barcodes:
            if barcode_result.confidence >= confidence_threshold:
                detections.append({
                    "type": f"barcode_{barcode_result.format.lower().replace('-', '_')}",
                    "value": barcode_result.value,
                    "confidence": barcode_result.confidence,
                    "bounding_box": barcode_result.bounding_box or {"x": 0, "y": 0, "width": 0, "height": 0},
                    "barcode_type": barcode_result.format,
                    "checksum_valid": barcode_result.checksum_valid,
                    "region_preference": barcode_result.region_preference
                })

        for product_result in enhanced_result.product_names:
            if product_result.confidence >= confidence_threshold:
                detections.append({
                    "type": "product_name",
                    "value": product_result.name,
                    "confidence": product_result.confidence,
                    "bounding_box": product_result.bounding_box or {"x": 0, "y": 0, "width": 0, "height": 0},
                    "classification": product_result.classification,
                    "brand_detected": product_result.brand_detected,
                    "hierarchy_level": product_result.hierarchy_level
                })

        processing_time_ms = (time.time() - start_time) * 1000

        return {
            "detections": detections,
            "analysis_metadata": {
                "image_quality": enhanced_result.quality_assessment.overall_quality.value if enhanced_result.quality_assessment else "unknown",
                "ocr_readiness_score": enhanced_result.quality_assessment.ocr_readiness_score if enhanced_result.quality_assessment else 0.0,
                "total_regions_found": len(enhanced_result.raw_text_blocks),
                "processing_confidence": enhanced_result.overall_confidence,
                "processing_time_ms": processing_time_ms,
                "language_detected": enhanced_result.language_detected,
                "region_detected": enhanced_result.region_detected,
                "quality_profile_used": enhanced_result.quality_profile_used,
                "cache_hit": enhanced_result.cache_hit,
                "quality_issues": [
                    {
                        "type": issue.issue_type.value,
                        "severity": issue.severity,
                        "description": issue.description,
                        "suggestion": issue.suggestion
                    }
                    for issue in (enhanced_result.quality_assessment.issues if enhanced_result.quality_assessment else [])
                ],
                "quality_recommendations": enhanced_result.quality_assessment.recommendations if enhanced_result.quality_assessment else []
            },
        }

    except Exception as e:
        logger.error("Enhanced vision analysis failed", error=str(e))
        # Fallback to original vision service for backward compatibility
        logger.warning("Falling back to legacy vision service")
        vision_service = GoogleVisionService()
        return await _analyze_with_vision_api(
            vision_service, image_data, analysis_type, confidence_threshold
        )


async def _extract_expiry_date_with_enhanced_vision(
    enhanced_vision_service,
    image_data: bytes,
    date_format_hint: str | None,
) -> dict[str, Any]:
    """Extract expiry date using enhanced vision service with multilingual support"""
    import time

    start_time = time.time()

    try:
        # Process with enhanced vision service focusing on dates
        enhanced_result = await enhanced_vision_service.process_image_comprehensive(
            image_data, extraction_types=["dates"]
        )

        # Find best expiry/use by date (prioritize over manufacturing dates)
        expiry_dates = [
            d for d in enhanced_result.dates
            if d.date_type in ['expiry', 'use_by', 'best_before']
        ]

        if expiry_dates:
            # Sort by confidence and date type priority
            best_expiry = max(expiry_dates, key=lambda x: (x.confidence,
                {'use_by': 3, 'expiry': 2, 'best_before': 1}.get(x.date_type, 0)))

            processing_time_ms = (time.time() - start_time) * 1000

            # Prepare alternative interpretations
            alternatives = []
            for date_result in enhanced_result.dates[:5]:  # Top 5 alternatives
                alternatives.append({
                    "date": date_result.date.strftime("%Y-%m-%d") if date_result.date else date_result.raw_text,
                    "format": date_result.format_detected,
                    "confidence": date_result.confidence,
                    "date_type": date_result.date_type,
                    "regulatory_format": date_result.regulatory_format
                })

            return {
                "detected_date": best_expiry.date.strftime("%Y-%m-%d") if best_expiry.date else best_expiry.raw_text,
                "original_text": best_expiry.raw_text,
                "confidence": best_expiry.confidence,
                "date_format_detected": best_expiry.format_detected,
                "date_type": best_expiry.date_type,
                "regulatory_format": best_expiry.regulatory_format,
                "language_detected": best_expiry.language_detected,
                "date_format_hint_used": date_format_hint,
                "alternative_interpretations": alternatives,
                "extraction_metadata": {
                    "text_regions_analyzed": len(enhanced_result.raw_text_blocks),
                    "date_patterns_found": len(enhanced_result.dates),
                    "image_quality": enhanced_result.quality_assessment.overall_quality.value if enhanced_result.quality_assessment else "unknown",
                    "ocr_readiness_score": enhanced_result.quality_assessment.ocr_readiness_score if enhanced_result.quality_assessment else 0.0,
                    "processing_time_ms": processing_time_ms,
                    "quality_profile_used": enhanced_result.quality_profile_used,
                    "cache_hit": enhanced_result.cache_hit
                },
            }
        else:
            # No expiry dates found
            return {
                "detected_date": None,
                "original_text": "",
                "confidence": 0.0,
                "date_format_detected": None,
                "date_type": None,
                "regulatory_format": None,
                "language_detected": enhanced_result.language_detected,
                "date_format_hint_used": date_format_hint,
                "alternative_interpretations": [],
                "extraction_metadata": {
                    "text_regions_analyzed": len(enhanced_result.raw_text_blocks),
                    "date_patterns_found": len(enhanced_result.dates),
                    "image_quality": enhanced_result.quality_assessment.overall_quality.value if enhanced_result.quality_assessment else "unknown",
                    "ocr_readiness_score": enhanced_result.quality_assessment.ocr_readiness_score if enhanced_result.quality_assessment else 0.0,
                    "processing_time_ms": (time.time() - start_time) * 1000,
                    "quality_profile_used": enhanced_result.quality_profile_used,
                    "cache_hit": enhanced_result.cache_hit
                },
            }

    except Exception as e:
        logger.error("Enhanced expiry date extraction failed", error=str(e))
        # Fallback to original vision service
        logger.warning("Falling back to legacy vision service for expiry date extraction")
        vision_service = GoogleVisionService()
        return await _extract_expiry_date_with_vision(
            vision_service, image_data, date_format_hint
        )


async def _analyze_with_vision_api(
    vision_service: GoogleVisionService,
    image_data: bytes,
    analysis_type: str,
    confidence_threshold: float,
) -> dict[str, Any]:
    """Analyze image using real Google Vision API"""
    import time

    start_time = time.time()

    try:
        # Run the Google Vision analysis
        vision_result = await vision_service.process_image(image_data)

        detections = []

        # Convert Vision API results to expected format
        if analysis_type in ["expiry_date", "full"]:
            for expiry_result in vision_result.expiry_dates:
                if expiry_result.confidence >= confidence_threshold:
                    detections.append(
                        {
                            "type": "expiry_date",
                            "value": expiry_result.date.strftime("%Y-%m-%d")
                            if expiry_result.date
                            else expiry_result.raw_text,
                            "confidence": expiry_result.confidence,
                            "bounding_box": {"x": 0, "y": 0, "width": 0, "height": 0},
                            "original_text": expiry_result.raw_text,
                            "format_detected": expiry_result.format_detected,
                        }
                    )

        if analysis_type in ["barcode", "full"]:
            for barcode_result in vision_result.barcodes:
                if barcode_result.confidence >= confidence_threshold:
                    detections.append(
                        {
                            "type": f"barcode_{barcode_result.format.lower()}",
                            "value": barcode_result.value,
                            "confidence": barcode_result.confidence,
                            "bounding_box": barcode_result.bounding_box
                            or {"x": 0, "y": 0, "width": 0, "height": 0},
                            "barcode_type": barcode_result.format,
                        }
                    )

        # Extract product names from OCR text if doing full analysis
        if analysis_type == "full":
            product_names = _extract_product_names_from_ocr(
                vision_result.raw_text, confidence_threshold
            )
            detections.extend(product_names)

        processing_time_ms = (time.time() - start_time) * 1000

        return {
            "detections": detections,
            "analysis_metadata": {
                "image_quality": _assess_image_quality(vision_result),
                "total_regions_found": len(vision_result.raw_text),
                "processing_confidence": 0.95,  # Default confidence since overall_confidence doesn't exist
                "processing_time_ms": processing_time_ms,
            },
        }

    except Exception as e:
        logger.error("Google Vision analysis failed", error=str(e))
        # Only fallback to mock data if explicitly enabled (never in production)
        from app.core.config import settings
        if settings.ocr_enable_fallback_mock:
            logger.warning(
                "Using mock fallback - this should NEVER happen in production",
                analysis_type=analysis_type
            )
            return await _mock_image_analysis(
                image_data, analysis_type, confidence_threshold
            )
        else:
            # Fail properly instead of masking issues with mock data
            raise HTTPException(
                status_code=503,
                detail="Image analysis service temporarily unavailable. Please try again later."
            ) from e


def _extract_product_names_from_ocr(
    ocr_results: list, confidence_threshold: float
) -> list[dict]:
    """Extract likely product names from OCR text results"""
    product_detections = []

    for ocr_result in ocr_results:
        if ocr_result.confidence >= confidence_threshold:
            text = ocr_result.text.strip()

            # Simple heuristics for product name detection
            if (
                len(text) > 5
                and any(
                    keyword in text.upper()
                    for keyword in [
                        "SIGNATURE",
                        "BRAND",
                        "ORGANIC",
                        "REDUCED",
                        "FAT",
                        "MILK",
                    ]
                )
                and not any(char in text for char in ["/", "%", "$"])
            ):  # Likely not date/price
                product_detections.append(
                    {
                        "type": "product_name",
                        "value": text,
                        "confidence": ocr_result.confidence,
                        "bounding_box": ocr_result.bounding_box
                        or {"x": 0, "y": 0, "width": 0, "height": 0},
                    }
                )

    return product_detections


def _assess_image_quality(vision_result) -> str:
    """Assess overall image quality based on Vision API results"""
    if vision_result.overall_confidence > 0.9:
        return "excellent"
    elif vision_result.overall_confidence > 0.7:
        return "good"
    elif vision_result.overall_confidence > 0.5:
        return "fair"
    else:
        return "poor"


async def _extract_expiry_date_with_vision(
    vision_service: GoogleVisionService,
    image_data: bytes,
    date_format_hint: str | None,
) -> dict[str, Any]:
    """Extract expiry date using Google Vision API with proper error handling"""
    import time

    start_time = time.time()

    try:
        # Run Google Vision analysis
        vision_result = await vision_service.process_image(image_data)

        # Process expiry date results
        if vision_result.expiry_dates:
            best_expiry = max(vision_result.expiry_dates, key=lambda x: x.confidence)

            processing_time_ms = (time.time() - start_time) * 1000

            return {
                "detected_date": best_expiry.date.strftime("%Y-%m-%d") if best_expiry.date else best_expiry.raw_text,
                "original_text": best_expiry.raw_text,
                "confidence": best_expiry.confidence,
                "date_format_detected": best_expiry.format_detected,
                "date_format_hint_used": date_format_hint,
                "alternative_interpretations": [
                    {
                        "date": exp.date.strftime("%Y-%m-%d") if exp.date else exp.raw_text,
                        "format": exp.format_detected,
                        "confidence": exp.confidence
                    }
                    for exp in vision_result.expiry_dates[:3]  # Top 3 alternatives
                ],
                "extraction_metadata": {
                    "text_regions_analyzed": len(vision_result.raw_text),
                    "date_patterns_found": len(vision_result.expiry_dates),
                    "ocr_quality": _assess_image_quality(vision_result),
                    "processing_time_ms": processing_time_ms,
                },
            }
        else:
            # No expiry dates found
            return {
                "detected_date": None,
                "original_text": "",
                "confidence": 0.0,
                "date_format_detected": None,
                "date_format_hint_used": date_format_hint,
                "alternative_interpretations": [],
                "extraction_metadata": {
                    "text_regions_analyzed": len(vision_result.raw_text),
                    "date_patterns_found": 0,
                    "ocr_quality": _assess_image_quality(vision_result),
                    "processing_time_ms": (time.time() - start_time) * 1000,
                },
            }

    except Exception as e:
        logger.error("Vision-based expiry date extraction failed", error=str(e))
        # Only fallback to mock if explicitly enabled
        from app.core.config import settings
        if settings.ocr_enable_fallback_mock:
            logger.warning(
                "Using mock fallback for expiry date extraction - this should NEVER happen in production"
            )
            return await _mock_expiry_date_extraction(image_data, date_format_hint)
        else:
            # Fail properly instead of masking issues
            raise HTTPException(
                status_code=503,
                detail="Expiry date extraction service temporarily unavailable. Please try again later."
            ) from e


# Helper functions for mock implementations (kept as fallback)


async def _mock_image_analysis(
    image_data: bytes, analysis_type: str, confidence_threshold: float
) -> dict[str, Any]:
    """Mock image analysis results"""

    if analysis_type == "expiry_date":
        return {
            "detections": [
                {
                    "type": "expiry_date",
                    "value": "2024-01-25",
                    "confidence": 0.89,
                    "bounding_box": {"x": 120, "y": 340, "width": 80, "height": 20},
                    "original_text": "25/01/24",
                }
            ],
            "analysis_metadata": {
                "image_quality": "good",
                "text_regions_found": 3,
                "processing_confidence": 0.89,
            },
        }

    elif analysis_type == "barcode":
        return {
            "detections": [
                {
                    "type": "barcode_ean13",
                    "value": "1234567890123",
                    "confidence": 0.95,
                    "bounding_box": {"x": 50, "y": 200, "width": 150, "height": 40},
                    "barcode_type": "EAN13",
                }
            ],
            "analysis_metadata": {
                "image_quality": "excellent",
                "barcode_regions_found": 1,
                "processing_confidence": 0.95,
            },
        }

    else:  # full analysis
        return {
            "detections": [
                {
                    "type": "expiry_date",
                    "value": "2024-01-25",
                    "confidence": 0.89,
                    "bounding_box": {"x": 120, "y": 340, "width": 80, "height": 20},
                },
                {
                    "type": "barcode_ean13",
                    "value": "1234567890123",
                    "confidence": 0.95,
                    "bounding_box": {"x": 50, "y": 200, "width": 150, "height": 40},
                },
                {
                    "type": "product_name",
                    "value": "Organic Bananas",
                    "confidence": 0.87,
                    "bounding_box": {"x": 30, "y": 50, "width": 200, "height": 30},
                },
            ],
            "analysis_metadata": {
                "image_quality": "good",
                "total_regions_found": 5,
                "processing_confidence": 0.90,
            },
        }


async def _mock_expiry_date_extraction(
    image_data: bytes, date_format_hint: str | None
) -> dict[str, Any]:
    """Mock expiry date extraction results"""

    return {
        "detected_date": "2024-01-25",
        "original_text": "25/01/24",
        "confidence": 0.89,
        "date_format_detected": "DD/MM/YY",
        "date_format_hint_used": date_format_hint,
        "alternative_interpretations": [
            {"date": "2024-01-25", "format": "DD/MM/YY", "confidence": 0.89},
            {"date": "2024-25-01", "format": "YY/DD/MM", "confidence": 0.23},
        ],
        "extraction_metadata": {
            "text_regions_analyzed": 3,
            "date_patterns_found": 2,
            "ocr_quality": "good",
        },
    }


async def _mock_barcode_detection(
    image_data: bytes, barcode_types: list[str]
) -> dict[str, Any]:
    """Mock barcode detection results"""

    return {
        "barcodes": [
            {
                "value": "1234567890123",
                "type": "EAN13",
                "confidence": 0.95,
                "bounding_box": {"x": 50, "y": 200, "width": 150, "height": 40},
                "checksum_valid": True,
            }
        ],
        "detection_metadata": {
            "barcode_regions_scanned": 4,
            "successful_decodes": 1,
            "average_confidence": 0.95,
            "scan_quality": "excellent",
        },
    }
