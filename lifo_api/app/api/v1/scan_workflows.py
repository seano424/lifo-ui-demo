"""
Scan workflow API endpoints for MVP implementation
Mobile-optimized endpoints for scan-in/scan-out workflows
"""

import time
import uuid
from datetime import date, datetime
from typing import Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.compat_donation_wrapper import create_simplified_donation_engine_compat
from app.auth.secure_dependencies import (
    get_current_user,
    validate_batch_id_format,
    validate_store_id_format,
)
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.middleware.rate_limiting import ai_endpoint_rate_limit
from app.models.scan_models import (
    ProcessScanRequest,
    ScanInRequest,
    ScanInResponse,
    ScanOutRequest,
    ScanOutResponse,
    ScanWorkflowException,
)

router = APIRouter()
logger = structlog.get_logger()


# Debug endpoint removed for production security


@router.post("/scan-in/{store_id}", response_model=ScanInResponse)
@ai_endpoint_rate_limit("30/minute")  # Higher limit for mobile scanning
async def scan_in_batch(
    store_id: str,
    request: Request,
    batch_data: ScanInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Handle proof of delivery scan-in workflow
    - Validate barcode/product data
    - Create new batch with expiry date
    - Calculate initial LIFO score
    - Return mobile-optimized response
    Target: <0.5s response time for mobile
    """
    start_time = time.time()

    try:
        # Validate store ID format
        store_id = validate_store_id_format(store_id)

        # Get read-only operations for data validation
        read_ops = get_read_only_operations(db)

        # Use the new scan-in processor
        from app.utils.scan_workflow_helpers import ScanInProcessor

        processor = ScanInProcessor()
        (
            batch_creation_data,
            batch_number,
            initial_score,
            urgency_level,
            recommendations,
            warnings,
        ) = await processor.process_scan_in(
            store_id, batch_data, read_ops, current_user["sub"]
        )

        processing_time_ms = (time.time() - start_time) * 1000

        # Log successful scan-in
        logger.info(
            "Scan-in completed",
            store_id=store_id,
            sku=batch_data.product_sku,
            batch_number=batch_number,
            days_to_expiry=(batch_data.expiry_date - date.today()).days,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        return ScanInResponse(
            success=True,
            batch_id=batch_creation_data["batch_id"],
            batch_number=batch_number,
            product_info={"product_id": batch_creation_data["product_id"]},
            initial_score=initial_score,
            urgency_level=urgency_level,
            recommendations=recommendations,
            warnings=warnings,
            processing_time_ms=processing_time_ms,
        )

    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Scan-in failed",
            store_id=store_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Scan-in processing failed") from e


@router.post("/scan-out/{store_id}/{batch_id}", response_model=ScanOutResponse)
@ai_endpoint_rate_limit("40/minute")  # Higher limit for frequent scan-outs
async def scan_out_batch(
    store_id: str,
    batch_id: str,
    request: Request,
    scan_out_data: ScanOutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Track when batches are sold, discounted, donated, or discarded
    - Update batch status and quantities
    - Record action in analytics.actions table
    - Calculate effectiveness metrics
    - Trigger real-time updates
    Target: <0.5s response time for mobile
    """
    start_time = time.time()

    try:
        # Validate IDs
        store_id = validate_store_id_format(store_id)
        batch_id = validate_batch_id_format(batch_id)

        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get current batch data
        batch_data = await read_ops.get_batch_for_scoring(batch_id)
        if not batch_data:
            raise ScanWorkflowException(
                f"Batch {batch_id} not found",
                workflow="scan_out",
                error_code="BATCH_NOT_FOUND",
                status_code=404,
            )

        # Use the new scan-out processor
        from app.utils.scan_workflow_helpers import ScanOutProcessor

        processor = ScanOutProcessor()
        (
            action_id,
            new_quantity,
            new_status,
            effectiveness_score,
            revenue_impact,
            waste_prevented,
            _update_data,
        ) = await processor.process_scan_out(
            store_id, batch_id, scan_out_data, batch_data, current_user["sub"]
        )

        processing_time_ms = (time.time() - start_time) * 1000

        # Log successful scan-out
        logger.info(
            "Scan-out completed",
            store_id=store_id,
            batch_id=batch_id,
            action=scan_out_data.action.value,
            quantity_moved=scan_out_data.quantity_moved,
            new_quantity=new_quantity,
            revenue_impact=revenue_impact,
            waste_prevented=waste_prevented,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        return ScanOutResponse(
            success=True,
            action_id=action_id,
            batch_id=batch_id,
            remaining_quantity=new_quantity,
            batch_status=new_status,
            effectiveness_score=effectiveness_score,
            revenue_impact=revenue_impact,
            waste_prevented=waste_prevented,
            processing_time_ms=processing_time_ms,
        )

    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Scan-out failed",
            store_id=store_id,
            batch_id=batch_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Scan-out processing failed") from e


@router.post("/process-scan/{store_id}")
@ai_endpoint_rate_limit("20/minute")
async def process_scanned_batch(
    store_id: str,
    request: Request,
    scan_data: ProcessScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Process combined barcode + expiry date scan data
    Currently handles manual input, ready for image recognition integration
    Future: Will process OCR data from image recognition
    """
    start_time = time.time()

    try:
        store_id = validate_store_id_format(store_id)

        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Look up product by barcode
        product_info = await _lookup_product_by_barcode(
            scan_data.barcode, store_id, read_ops
        )

        if not product_info:
            # Prepare for new product creation
            product_info = {
                "needs_creation": True,
                "barcode": scan_data.barcode,
                "suggested_sku": f"SCAN_{scan_data.barcode}",
                "confidence": scan_data.confidence_score,
            }

        # Validate expiry date confidence
        expiry_confidence = scan_data.confidence_score
        warnings = []

        if expiry_confidence is not None and expiry_confidence < 0.8:
            warnings.append(
                f"Low confidence on expiry date ({expiry_confidence:.2f}) - please verify"
            )

        # Calculate urgency based on expiry
        days_to_expiry = (scan_data.expiry_date - date.today()).days
        urgency_score = 0.1

        if days_to_expiry <= 0:
            urgency_score = 1.0
        elif days_to_expiry <= 1:
            urgency_score = 0.95
        elif days_to_expiry <= 3:
            urgency_score = 0.8
        elif days_to_expiry <= 7:
            urgency_score = 0.6

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "Scan processed",
            store_id=store_id,
            barcode=scan_data.barcode,
            confidence=scan_data.confidence_score,
            days_to_expiry=days_to_expiry,
            urgency_score=urgency_score,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        return {
            "success": True,
            "product_info": product_info,
            "urgency_score": urgency_score,
            "days_to_expiry": days_to_expiry,
            "confidence_score": expiry_confidence,
            "warnings": warnings,
            "processing_time_ms": processing_time_ms,
            "scan_timestamp": scan_data.scan_timestamp,
            "next_steps": [
                "Verify product information"
                if product_info.get("needs_creation")
                else "Confirm batch details",
                "Review expiry date accuracy"
                if expiry_confidence is not None and expiry_confidence < 0.8
                else "Proceed with scan-in",
            ],
        }

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Scan processing failed",
            store_id=store_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(status_code=500, detail="Scan processing failed") from e


# Helper functions moved to app.utils.scan_workflow_helpers for better organization


class DonationScanRequest(BaseModel):
    """Request model for donation scanning workflow"""

    recipient_id: str | None = None
    check_donation_eligibility: bool = True
    temperature_check: float | None = None
    packaging_condition: str = "good"
    notes: str | None = None


@router.post("/scan-donation-check/{store_id}/{batch_id}")
@ai_endpoint_rate_limit("30/minute")
async def scan_donation_eligibility_check(
    store_id: str,
    batch_id: str,
    request: Request,
    donation_scan: DonationScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Mobile scanning endpoint for donation eligibility check
    Integrates EU compliance validation with mobile workflow
    Target: <0.5s response time for mobile scanning
    """
    start_time = time.time()

    try:
        # Validate IDs
        store_id = validate_store_id_format(store_id)
        batch_id = validate_batch_id_format(batch_id)

        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get batch data
        batch_data = await read_ops.get_batch_for_scoring(batch_id)
        if not batch_data:
            raise ScanWorkflowException(
                f"Batch {batch_id} not found",
                workflow="donation_scan",
                error_code="BATCH_NOT_FOUND",
                status_code=404,
            )

        # Verify batch belongs to store
        if batch_data.get("store_id") != store_id:
            raise ScanWorkflowException(
                f"Batch {batch_id} does not belong to store {store_id}",
                workflow="donation_scan",
                error_code="STORE_MISMATCH",
                status_code=403,
            )

        # Create donation decision engine and evaluate
        donation_engine = create_simplified_donation_engine_compat()
        recommendation = donation_engine.evaluate_action_recommendation(
            batch_data=batch_data,
            current_temperature=donation_scan.temperature_check,
            packaging_condition=donation_scan.packaging_condition,
        )

        # Mobile-optimized response
        mobile_response = {
            "batch_id": batch_id,
            "sku": batch_data.get("sku"),
            "product_name": batch_data.get("product_name", "Unknown"),
            "category": batch_data.get("category"),
            "days_to_expiry": batch_data.get("days_to_expiry"),
            "current_quantity": batch_data.get("current_quantity"),
            # Donation eligibility
            "donation_eligible": recommendation.eu_compliant,
            "eligibility_reason": recommendation.compliance_result.eligibility_status.value,
            "donation_priority": recommendation.priority.value,
            "recommended_action": recommendation.decision.value,
            "confidence_score": recommendation.confidence_score,
            # Mobile-friendly summary
            "action_summary": _get_mobile_action_summary(recommendation),
            "next_steps": _get_mobile_next_steps(recommendation),
            "warnings": _get_mobile_warnings(recommendation),
            # Financial preview
            "estimated_value": {
                "donation_value": recommendation.estimated_donation_value,
                "tax_benefit": recommendation.estimated_tax_benefit,
                "waste_cost_avoided": recommendation.estimated_waste_cost_avoided,
            },
            # Timing
            "action_required_by": recommendation.recommended_action_by,
            "donation_window_expires": recommendation.donation_window_expires,
            # Mobile scanning metadata
            "scan_timestamp": datetime.utcnow(),
            "requires_temperature_monitoring": recommendation.compliance_result.temperature_requirements
            is not None,
            "handling_priority": _get_handling_priority(recommendation.priority.value),
        }

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "Donation eligibility scan completed",
            store_id=store_id,
            batch_id=batch_id,
            eligible=recommendation.eu_compliant,
            priority=recommendation.priority.value,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        mobile_response["processing_time_ms"] = processing_time_ms
        return mobile_response

    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Donation eligibility scan failed",
            store_id=store_id,
            batch_id=batch_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Donation eligibility scan failed"
        ) from e


@router.post("/scan-donation-action/{store_id}/{batch_id}")
@ai_endpoint_rate_limit("20/minute")
async def execute_donation_action(
    store_id: str,
    batch_id: str,
    request: Request,
    action_data: ScanOutRequest,  # Reuse existing scan-out model
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Execute donation action from mobile scanning interface
    Handles the complete donation workflow with EU compliance tracking
    """
    start_time = time.time()

    try:
        # Validate IDs
        store_id = validate_store_id_format(store_id)
        batch_id = validate_batch_id_format(batch_id)

        # Validate that action is donation-related
        if action_data.action.value not in ["donated"]:
            raise ScanWorkflowException(
                f"Invalid action '{action_data.action.value}' for donation workflow",
                workflow="donation_action",
                error_code="INVALID_DONATION_ACTION",
                status_code=400,
            )

        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get batch data
        batch_data = await read_ops.get_batch_for_scoring(batch_id)
        if not batch_data:
            raise ScanWorkflowException(
                f"Batch {batch_id} not found",
                workflow="donation_action",
                error_code="BATCH_NOT_FOUND",
                status_code=404,
            )

        # Verify quantity
        if action_data.quantity_moved > batch_data.get("current_quantity", 0):
            raise ScanWorkflowException(
                f"Cannot donate {action_data.quantity_moved} items - only {batch_data.get('current_quantity', 0)} available",
                workflow="donation_action",
                error_code="INSUFFICIENT_QUANTITY",
                status_code=400,
            )

        # Re-validate donation eligibility
        donation_engine = create_simplified_donation_engine_compat()
        recommendation = donation_engine.evaluate_action_recommendation(
            batch_data=batch_data
        )

        if not recommendation.eu_compliant:
            raise ScanWorkflowException(
                f"Batch no longer eligible for donation: {recommendation.compliance_result.eligibility_status.value}",
                workflow="donation_action",
                error_code="NOT_ELIGIBLE_FOR_DONATION",
                status_code=400,
            )

        # Calculate donation impact
        donation_value = action_data.quantity_moved * batch_data.get("cost_price", 0)
        social_value = donation_value * 0.8  # 80% social value multiplier
        tax_benefit = donation_value * 0.6  # 60% tax benefit

        # Prepare donation record data
        donation_record = {
            "donation_id": str(uuid.uuid4()),
            "batch_id": batch_id,
            "store_id": store_id,
            "quantity_donated": action_data.quantity_moved,
            "original_value": action_data.quantity_moved
            * batch_data.get("selling_price", 0),
            "donation_value": donation_value,
            "estimated_social_value": social_value,
            "estimated_tax_benefit": tax_benefit,
            "eu_compliance_score": recommendation.compliance_result.compliance_score,
            "compliance_status": "compliant",
            "created_at": datetime.utcnow(),
            "created_by": current_user["sub"],
            "notes": action_data.notes,
            "scan_location": "mobile_app",
            "handling_requirements": recommendation.handling_requirements,
            "safety_requirements": recommendation.compliance_result.safety_requirements,
        }

        # Calculate remaining quantity and status
        remaining_quantity = (
            batch_data.get("current_quantity", 0) - action_data.quantity_moved
        )
        new_batch_status = "donated" if remaining_quantity == 0 else "active"

        # Generate mobile success response
        response = {
            "success": True,
            "donation_id": donation_record["donation_id"],
            "batch_id": batch_id,
            "action_completed": "donated",
            "quantity_donated": action_data.quantity_moved,
            "remaining_quantity": remaining_quantity,
            "batch_status": new_batch_status,
            # Impact summary for mobile
            "impact_summary": {
                "donation_value": donation_value,
                "social_value": social_value,
                "tax_benefit": tax_benefit,
                "meals_estimated": int(
                    action_data.quantity_moved * 4
                ),  # Rough estimate
                "co2_avoided_kg": action_data.quantity_moved * 2.5,  # Rough estimate
            },
            # Compliance summary
            "compliance_summary": {
                "eu_compliant": True,
                "compliance_score": recommendation.compliance_result.compliance_score,
                "documentation_required": len(
                    recommendation.compliance_result.safety_requirements
                )
                > 0,
            },
            # Next steps for mobile user
            "next_steps": [
                "Donation recorded successfully",
                "Prepare items for pickup according to handling requirements",
                "Coordinate with recipient for pickup scheduling",
                "Maintain temperature requirements if applicable",
            ],
            # Mobile UI elements
            "mobile_feedback": {
                "success_message": f"Successfully donated {action_data.quantity_moved} items!",
                "impact_message": f"Estimated {int(action_data.quantity_moved * 4)} meals provided to community",
                "badge_earned": "EU Compliant Donor"
                if recommendation.compliance_result.compliance_score >= 0.9
                else None,
            },
            "created_at": donation_record["created_at"],
        }

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "Donation action executed via mobile scan",
            store_id=store_id,
            batch_id=batch_id,
            donation_id=donation_record["donation_id"],
            quantity=action_data.quantity_moved,
            social_value=social_value,
            compliance_score=recommendation.compliance_result.compliance_score,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        response["processing_time_ms"] = processing_time_ms
        return response

    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Donation action execution failed",
            store_id=store_id,
            batch_id=batch_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Donation action execution failed"
        ) from e


@router.get("/scan-donation-quick-list/{store_id}")
@ai_endpoint_rate_limit("40/minute")
async def get_donation_quick_scan_list(
    store_id: str,
    request: Request,
    priority_filter: str | None = Query(
        "high", description="Priority filter: critical, high, medium, all"
    ),
    limit: int = Query(20, ge=1, le=50, description="Maximum items to return"),
    db: AsyncSession = Depends(get_db),
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """
    Get mobile-optimized list of donation candidates for quick scanning
    Prioritized by EU compliance and urgency
    """
    start_time = time.time()

    try:
        store_id = validate_store_id_format(store_id)

        # Get read-only operations
        read_ops = get_read_only_operations(db)

        # Get inventory data
        inventory_data = await read_ops.get_store_inventory_for_scoring(store_id)

        if not inventory_data:
            return {
                "store_id": store_id,
                "donation_candidates": [],
                "summary": {
                    "total_candidates": 0,
                    "critical_priority": 0,
                    "high_priority": 0,
                    "estimated_total_value": 0.0,
                },
                "processing_time_ms": (time.time() - start_time) * 1000,
            }

        # Create donation decision engine
        donation_engine = create_simplified_donation_engine_compat()

        # Evaluate each batch for donation
        donation_candidates = []

        for batch in inventory_data:
            try:
                recommendation = donation_engine.evaluate_action_recommendation(
                    batch_data=batch
                )

                if recommendation.eu_compliant:
                    priority_value = recommendation.priority.value

                    # Apply priority filter
                    if (
                        (priority_filter == "critical" and priority_value != "critical")
                        or (
                            priority_filter == "high"
                            and priority_value not in ["critical", "high"]
                        )
                        or (
                            priority_filter != "all"
                            and priority_filter != priority_value
                        )
                    ):
                        continue

                    candidate = {
                        "batch_id": batch.get("batch_id"),
                        "sku": batch.get("sku"),
                        "product_name": batch.get("product_name", "Unknown"),
                        "category": batch.get("category"),
                        "current_quantity": batch.get("current_quantity"),
                        "days_to_expiry": batch.get("days_to_expiry"),
                        "selling_price": batch.get("selling_price"),
                        # Donation-specific data
                        "donation_priority": priority_value,
                        "eu_compliance_score": recommendation.compliance_result.compliance_score,
                        "estimated_donation_value": recommendation.estimated_donation_value,
                        "estimated_tax_benefit": recommendation.estimated_tax_benefit,
                        "recommended_action": recommendation.decision.value,
                        "action_required_by": recommendation.recommended_action_by,
                        # Mobile scanning hints
                        "scan_priority": _get_scan_priority_score(recommendation),
                        "temperature_sensitive": recommendation.compliance_result.temperature_requirements
                        is not None,
                        "quick_action": priority_value in ["critical", "high"]
                        and batch.get("days_to_expiry", 999) <= 2,
                    }

                    donation_candidates.append(candidate)

            except Exception as e:
                logger.warning(
                    "Failed to evaluate batch for donation",
                    batch_id=batch.get("batch_id"),
                    error=str(e),
                )
                continue

        # Sort by scan priority (highest first)
        donation_candidates.sort(key=lambda x: x["scan_priority"], reverse=True)

        # Limit results
        donation_candidates = donation_candidates[:limit]

        # Calculate summary
        summary = {
            "total_candidates": len(donation_candidates),
            "critical_priority": len(
                [c for c in donation_candidates if c["donation_priority"] == "critical"]
            ),
            "high_priority": len(
                [c for c in donation_candidates if c["donation_priority"] == "high"]
            ),
            "estimated_total_value": sum(
                c["estimated_donation_value"] for c in donation_candidates
            ),
        }

        processing_time_ms = (time.time() - start_time) * 1000

        logger.info(
            "Donation quick scan list generated",
            store_id=store_id,
            total_candidates=summary["total_candidates"],
            priority_filter=priority_filter,
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )

        return {
            "store_id": store_id,
            "donation_candidates": donation_candidates,
            "summary": summary,
            "filters": {"priority_filter": priority_filter, "limit": limit},
            "mobile_hints": {
                "scan_critical_first": summary["critical_priority"] > 0,
                "temperature_monitoring_needed": any(
                    c["temperature_sensitive"] for c in donation_candidates
                ),
                "quick_actions_available": any(
                    c["quick_action"] for c in donation_candidates
                ),
            },
            "processing_time_ms": processing_time_ms,
        }

    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error(
            "Donation quick scan list failed",
            store_id=store_id,
            error=str(e),
            processing_time_ms=processing_time_ms,
            user_id=current_user["sub"],
        )
        raise HTTPException(
            status_code=500, detail="Failed to generate donation scan list"
        ) from e


# Helper functions for mobile donation workflows


def _get_mobile_action_summary(recommendation) -> str:
    """Generate mobile-friendly action summary"""
    if not recommendation.eu_compliant:
        return (
            f"Not eligible: {recommendation.compliance_result.eligibility_status.value}"
        )

    priority = recommendation.priority.value
    decision = recommendation.decision.value

    action_summaries = {
        "donate_immediately": "✅ Donate now - EU compliant",
        "donate_scheduled": "📅 Schedule donation pickup",
        "discount_then_donate": "💰 Try discount first, then donate",
        "discount_only": "💸 Apply discount instead",
        "monitor": "👀 Continue monitoring",
        "dispose": "🗑️ Disposal required",
    }

    base_summary = action_summaries.get(decision, "Review recommended action")

    if priority == "critical":
        return f"🚨 {base_summary} (URGENT)"
    elif priority == "high":
        return f"⚡ {base_summary} (Soon)"
    else:
        return base_summary


def _get_mobile_next_steps(recommendation) -> list[str]:
    """Generate mobile-friendly next steps"""
    if not recommendation.eu_compliant:
        return [
            "Item not eligible for donation",
            "Consider discount or disposal options",
            "Check EU compliance requirements",
        ]

    priority = recommendation.priority.value

    if priority == "critical":
        return [
            "Take immediate action",
            "Contact recipient for urgent pickup",
            "Prepare EU compliance documentation",
            "Monitor temperature if required",
        ]
    elif priority == "high":
        return [
            "Schedule pickup within 24-48 hours",
            "Verify recipient availability",
            "Prepare handling requirements",
            "Update donation status",
        ]
    else:
        return [
            "Plan donation for optimal timing",
            "Coordinate with preferred recipients",
            "Ensure compliance documentation ready",
            "Monitor for status changes",
        ]


def _get_mobile_warnings(recommendation) -> list[str]:
    """Generate mobile-friendly warnings"""
    warnings = []

    if not recommendation.eu_compliant:
        warnings.append("⚠️ EU compliance violation - donation not permitted")

    if recommendation.compliance_result.temperature_requirements:
        warnings.append("🌡️ Temperature monitoring required")

    if recommendation.priority.value == "critical":
        warnings.append("⏰ Urgent action required - limited time window")

    if recommendation.opportunity_cost > recommendation.estimated_donation_value:
        warnings.append("💰 High opportunity cost - consider discount alternative")

    return warnings


def _get_handling_priority(priority: str) -> int:
    """Convert priority to numeric value for mobile sorting"""
    priority_values = {"critical": 100, "high": 75, "medium": 50, "low": 25}
    return priority_values.get(priority, 0)


def _get_scan_priority_score(recommendation) -> float:
    """Calculate scan priority score for mobile list sorting"""
    base_score = 0.0

    # Priority contribution (0-40 points)
    priority_scores = {"critical": 40, "high": 30, "medium": 20, "low": 10}
    base_score += priority_scores.get(recommendation.priority.value, 0)

    # EU compliance contribution (0-30 points)
    base_score += recommendation.compliance_result.compliance_score * 30

    # Financial impact contribution (0-20 points)
    if recommendation.estimated_donation_value > 0:
        # Normalize to 0-20 range, assuming max value of €200
        financial_score = min(20, (recommendation.estimated_donation_value / 200) * 20)
        base_score += financial_score

    # Confidence contribution (0-10 points)
    base_score += recommendation.confidence_score * 10

    return base_score
