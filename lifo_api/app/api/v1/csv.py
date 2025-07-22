"""
Secure CSV Processing API endpoints for AI features only
Part of hybrid architecture security remediation
"""

from datetime import datetime
from typing import Any, Dict

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from app.auth.secure_dependencies import get_current_user
from app.middleware.rate_limiting import (
    ai_endpoint_rate_limit,
    csv_processing_rate_limit,
)
from app.services.secure_csv_processor import SecureCSVProcessor

router = APIRouter()
logger = structlog.get_logger()


@router.post("/validate/{store_id}")
@csv_processing_rate_limit("5/hour")  # CSV processing is resource intensive
async def validate_csv_secure(
    store_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Securely validate CSV data for AI processing only
    No database writes - returns validated data for frontend to save via Supabase
    """
    try:
        # Initialize secure CSV processor
        csv_processor = SecureCSVProcessor()

        # Process CSV for validation only
        validation_result = await csv_processor.process_csv_for_validation(
            file=file, store_id=store_id
        )

        # Add user info
        validation_result["validated_by"] = current_user["sub"]

        logger.info(
            "CSV validation completed securely",
            store_id=store_id,
            filename=file.filename,
            is_valid=validation_result["validation"]["is_valid"],
            error_count=validation_result["validation"]["error_count"],
            user_id=current_user["sub"],
        )

        return validation_result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Secure CSV validation failed",
            store_id=store_id,
            filename=file.filename if file else "unknown",
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="CSV validation failed")


@router.get("/template")
@ai_endpoint_rate_limit("10/minute")  # Template downloads
async def get_secure_csv_template(
    request: Request, current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get secure CSV template for inventory data
    """
    try:
        # Initialize secure CSV processor
        csv_processor = SecureCSVProcessor()

        # Generate secure template
        csv_content = csv_processor.generate_secure_csv_template()

        template_data = {
            "filename": "inventory_template.csv",
            "description": "Secure template for inventory data - use with Supabase import",
            "csv_content": csv_content,
            "security_notes": [
                "File size limit: 10MB",
                "Row limit: 10,000",
                "Only allowed columns are included",
                "Formula injection protection enabled",
                "Data is validated and sanitized",
            ],
            "usage_instructions": [
                "1. Download this template",
                "2. Fill in your data following the format",
                "3. Upload for validation via /csv/validate",
                "4. Use validated data in frontend to save via Supabase",
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }

        logger.info("Secure CSV template generated", user_id=current_user["sub"])

        return template_data

    except Exception as e:
        logger.error(
            "Failed to generate secure CSV template",
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Template generation failed")


@router.post("/analyze/{store_id}")
@csv_processing_rate_limit("3/hour")  # AI analysis is even more resource intensive
async def analyze_csv_with_ai(
    store_id: str,
    request: Request,
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    """
    Analyze CSV data with AI suggestions
    Provides scoring insights and recommendations without database writes
    """
    try:
        # Initialize secure CSV processor
        csv_processor = SecureCSVProcessor()

        # Process and analyze CSV
        analysis_result = await csv_processor.process_csv_for_validation(
            file=file, store_id=store_id
        )

        # Extract AI insights
        ai_analysis = {
            "filename": file.filename,
            "store_id": store_id,
            "total_items": analysis_result["total_rows"],
            "valid_items": analysis_result["validation"]["valid_count"],
            "ai_suggestions": analysis_result["ai_suggestions"],
            "urgency_alerts": analysis_result["ai_suggestions"]["insights"].get(
                "urgency_alerts", []
            ),
            "category_distribution": analysis_result["ai_suggestions"]["insights"].get(
                "categories", {}
            ),
            "pricing_insights": analysis_result["ai_suggestions"]["insights"].get(
                "pricing_insights", {}
            ),
            "recommendations": [
                {
                    "type": "data_quality",
                    "message": f"Validation completed with {analysis_result['validation']['error_count']} errors",
                    "action": "Review errors before importing",
                },
                {
                    "type": "ai_scoring",
                    "message": "AI scoring available for validated items",
                    "action": "Use /scoring/batch endpoint for detailed analysis",
                },
            ],
            "analyzed_at": datetime.utcnow().isoformat(),
            "analyzed_by": current_user["sub"],
        }

        logger.info(
            "CSV AI analysis completed",
            store_id=store_id,
            filename=file.filename,
            total_items=ai_analysis["total_items"],
            valid_items=ai_analysis["valid_items"],
            urgency_alerts=len(ai_analysis["urgency_alerts"]),
            user_id=current_user["sub"],
        )

        return ai_analysis

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "CSV AI analysis failed",
            store_id=store_id,
            filename=file.filename if file else "unknown",
            error=str(e),
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="AI analysis failed")
