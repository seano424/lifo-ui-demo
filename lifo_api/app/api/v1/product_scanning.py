"""
Optimized product scanning endpoints focused on Google Vision OCR
Provides only complex image processing capabilities while frontend handles simple tasks
"""

from datetime import datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user, validate_store_id_format
from app.database.connection import get_db
from app.database.supabase_service import get_supabase_service
from app.middleware.rate_limiting import ai_endpoint_rate_limit
from app.services.product_scanning_service import (
    ProductScanningService,
    ScanningWorkflow,
    ProductScanningError
)
from app.utils.mvp_exceptions import ValidationException

router = APIRouter()
logger = structlog.get_logger()

# Initialize product scanning service
scanning_service = ProductScanningService()


def _validate_image_upload(image: UploadFile) -> UploadFile:
    """Validate image upload"""
    # Validate content type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if not image.content_type or image.content_type not in allowed_types:
        raise ValidationException(
            message="Invalid image format",
            field="image",
            validation_errors=[f"Only {', '.join(allowed_types)} are supported"],
        )
    
    return image


@router.post("/scan/ocr-expiry/{store_id}")
@ai_endpoint_rate_limit("12/minute")  # OCR-focused scanning
async def extract_expiry_date_ocr(
    store_id: str,
    request: Request,
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.65, ge=0.1, le=1.0),
    max_processing_time_ms: float = Form(4000, ge=1000, le=10000),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Extract expiry date from product image using Google Vision OCR
    Focused on complex text recognition that frontend cannot handle
    """
    try:
        store_id = validate_store_id_format(store_id)
        
        # Validate and read image
        image = _validate_image_upload(image)
        image_data = await image.read()
        
        if len(image_data) > 10 * 1024 * 1024:  # 10MB limit for expiry extraction
            raise ValidationException(
                message="Image file too large for expiry extraction",
                field="image",
                validation_errors=["Maximum file size is 10MB for expiry date extraction"],
            )
        
        # Extract expiry date using simple method
        expiry_date = await scanning_service.extract_expiry_date(image_data)
        
        logger.info(
            "Expiry date extraction completed",
            store_id=store_id,
            has_expiry=expiry_date is not None,
            user_id=current_user["sub"],
        )
        
        return {
            "success": True,
            "scan_type": "expiry_date_extraction",
            "expiry_date": expiry_date.isoformat() if expiry_date else None,
            "confidence_threshold": confidence_threshold,
            "processing_type": "google_vision_ocr"
        }
        
    except ValidationException:
        raise
    except ProductScanningError as e:
        logger.error(
            "Expiry date extraction failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=422, detail=f"Expiry date extraction failed: {str(e)}")
    except Exception as e:
        logger.error(
            "Expiry date extraction error",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Expiry date extraction failed")


@router.post("/scan/full-ocr/{store_id}")
@ai_endpoint_rate_limit("8/minute")  # Most resource-intensive endpoint
async def full_ocr_analysis(
    store_id: str,
    request: Request,
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.7, ge=0.1, le=1.0),
    max_processing_time_ms: float = Form(5000, ge=1000, le=10000),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Complete OCR analysis with barcode detection and text extraction
    Provides comprehensive Google Vision processing for complex scenarios
    """
    try:
        store_id = validate_store_id_format(store_id)
        
        # Validate and read image
        image = _validate_image_upload(image)
        image_data = await image.read()
        
        if len(image_data) > 15 * 1024 * 1024:  # 15MB limit for full analysis
            raise ValidationException(
                message="Image file too large for full OCR analysis",
                field="image",
                validation_errors=["Maximum file size is 15MB for complete analysis"],
            )
        
        # Configure comprehensive scanning workflow
        workflow = ScanningWorkflow(
            enable_barcode_detection=True,
            enable_expiry_extraction=True,
            enable_text_extraction=True,
            confidence_threshold=confidence_threshold,
            max_processing_time_ms=max_processing_time_ms
        )
        
        # Perform complete OCR analysis
        scan_result = await scanning_service.scan_product_image(image_data, workflow)
        
        # Get dual dates with metadata
        dual_dates = scanning_service.get_last_dual_dates()
        
        # Save OCR result to database using Supabase service
        try:
            supabase_service = get_supabase_service()
            
            ocr_data = {
                'image_data': None,  # Don't store raw image data
                'confidence_score': scan_result.confidence_score,
                'raw_text_blocks': scan_result.raw_text_blocks,
                'barcode': scan_result.primary_barcode,
                'suggested_name': scan_result.suggested_name,
                'expiry_date': dual_dates.get('expiry_date').isoformat() if dual_dates.get('expiry_date') else None,
                'manufacture_date': dual_dates.get('manufacture_date').isoformat() if dual_dates.get('manufacture_date') else None,
                'processing_time_ms': scan_result.processing_time_ms
            }
            
            # Use user token for RLS compliance
            user_token = current_user["token"]
            saved_result = await supabase_service.save_ocr_result(user_token, store_id, ocr_data)
            
            logger.info(
                "OCR result saved to database",
                ocr_batch_id=saved_result.get('id'),
                store_id=store_id
            )
            
        except Exception as save_error:
            # Log error but don't fail the OCR operation
            logger.error(
                "Failed to save OCR result to database",
                error=str(save_error),
                store_id=store_id,
                user_id=current_user["sub"]
            )
        
        logger.info(
            "Full OCR analysis completed",
            store_id=store_id,
            barcode=scan_result.primary_barcode,
            has_expiry=scan_result.suggested_expiry_date is not None,
            has_manufacture=dual_dates.get('manufacture_date') is not None,
            confidence=scan_result.confidence_score,
            processing_time_ms=scan_result.processing_time_ms,
            user_id=current_user["sub"],
        )
        
        return {
            "success": True,
            "scan_type": "full_ocr_analysis",
            "barcode": scan_result.primary_barcode,
            "suggested_name": scan_result.suggested_name,
            # Dual date extraction - both expiry and manufacture dates
            "expiry_date": dual_dates.get('expiry_date').isoformat() if dual_dates.get('expiry_date') else None,
            "manufacture_date": dual_dates.get('manufacture_date').isoformat() if dual_dates.get('manufacture_date') else None,
            "raw_text_blocks": scan_result.raw_text_blocks,
            "confidence_scores": {
                "overall": scan_result.confidence_score,
                "barcode": scan_result.barcode_confidence,
                "expiry": scan_result.expiry_confidence,
            },
            "processing_info": {
                "processing_time_ms": scan_result.processing_time_ms,
                "data_sources": scan_result.data_sources,
                "requires_user_confirmation": scan_result.requires_user_confirmation,
                "image_dimensions": scan_result.vision_result.image_dimensions,
            },
            "vision_details": {
                "detected_barcodes": len(scan_result.vision_result.barcodes),
                "detected_text_blocks": len(scan_result.vision_result.raw_text),
                "expiry_candidates": len(scan_result.vision_result.expiry_dates),
            },
            # Enhanced metadata for dual date extraction
            "date_extraction_metadata": dual_dates.get('metadata', {})
        }
        
    except ValidationException:
        raise
    except ProductScanningError as e:
        logger.error(
            "Full OCR analysis failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=422, detail=f"OCR analysis failed: {str(e)}")
    except Exception as e:
        logger.error(
            "Full OCR analysis error",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="OCR analysis failed")


@router.post("/scan/text-extraction/{store_id}")
@ai_endpoint_rate_limit("15/minute")  # Text-only extraction
async def extract_text_only(
    store_id: str,
    request: Request,
    image: UploadFile = File(...),
    confidence_threshold: float = Form(0.6, ge=0.1, le=1.0),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Extract all text from image using Google Vision OCR
    Useful for manual product entry assistance
    """
    try:
        store_id = validate_store_id_format(store_id)
        
        # Validate and read image
        image = _validate_image_upload(image)
        image_data = await image.read()
        
        if len(image_data) > 8 * 1024 * 1024:  # 8MB limit for text extraction
            raise ValidationException(
                message="Image file too large for text extraction",
                field="image",
                validation_errors=["Maximum file size is 8MB for text extraction"],
            )
        
        # Configure text-only workflow
        workflow = ScanningWorkflow(
            enable_barcode_detection=False,
            enable_expiry_extraction=False,
            enable_text_extraction=True,
            confidence_threshold=confidence_threshold,
            max_processing_time_ms=3000
        )
        
        # Perform text extraction
        scan_result = await scanning_service.scan_product_image(image_data, workflow)
        
        # Filter text blocks by confidence
        high_confidence_text = [
            text for text in scan_result.raw_text_blocks 
            if len(text.strip()) > 2  # Ignore very short text
        ]
        
        logger.info(
            "Text extraction completed",
            store_id=store_id,
            text_blocks_found=len(high_confidence_text),
            processing_time_ms=scan_result.processing_time_ms,
            user_id=current_user["sub"],
        )
        
        return {
            "success": True,
            "scan_type": "text_extraction",
            "text_blocks": high_confidence_text,
            "suggested_name": scan_result.suggested_name,
            "confidence_threshold": confidence_threshold,
            "processing_info": {
                "processing_time_ms": scan_result.processing_time_ms,
                "total_text_blocks": len(scan_result.raw_text_blocks),
                "high_confidence_blocks": len(high_confidence_text)
            }
        }
        
    except ValidationException:
        raise
    except ProductScanningError as e:
        logger.error(
            "Text extraction failed",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=422, detail=f"Text extraction failed: {str(e)}")
    except Exception as e:
        logger.error(
            "Text extraction error",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Text extraction failed")