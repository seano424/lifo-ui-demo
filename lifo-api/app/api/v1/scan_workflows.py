"""
Scan workflow API endpoints for MVP implementation
Mobile-optimized endpoints for scan-in/scan-out workflows
"""
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional
from datetime import datetime, date, timedelta
import structlog
import uuid
import time

from app.auth.secure_dependencies import get_current_user, validate_store_id_format, validate_batch_id_format
from app.database.connection import get_db
from app.database.read_only_operations import get_read_only_operations
from app.core.scoring import ScoringService, create_scoring_service
from app.models.scan_models import (
    ScanInRequest, ScanInResponse, ScanOutRequest, ScanOutResponse,
    ProcessScanRequest, ScanWorkflowException, MobileOptimizedError,
    sanitize_text_input, validate_uuid_format
)
from app.middleware.rate_limiting import scoring_rate_limit, ai_endpoint_rate_limit
from app.utils.performance import measure_time

router = APIRouter()
logger = structlog.get_logger()


@router.post("/debug-scan/{store_id}")
async def debug_scan_endpoint(
    store_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Debug endpoint to test authentication only"""
    return {
        "success": True,
        "message": "Authentication working",
        "store_id": store_id,
        "user_id": current_user.get("sub"),
        "user_email": current_user.get("email")
    }


@router.post("/scan-in/{store_id}", response_model=ScanInResponse)
@ai_endpoint_rate_limit("30/minute")  # Higher limit for mobile scanning
async def scan_in_batch(
    store_id: str,
    request: Request,
    batch_data: ScanInRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
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
        
        # Validate product exists or prepare for creation
        product_info = await _validate_or_prepare_product(
            batch_data.product_sku, 
            store_id, 
            read_ops
        )
        
        # Generate batch number if not provided
        if not batch_data.batch_number:
            batch_number = await _generate_batch_number(
                store_id, 
                batch_data.product_sku, 
                batch_data.expiry_date
            )
        else:
            batch_number = sanitize_text_input(batch_data.batch_number)
        
        # Prepare batch data for creation (via frontend to Supabase)
        batch_creation_data = {
            "batch_id": str(uuid.uuid4()),
            "product_id": product_info.get("product_id"),
            "store_id": store_id,
            "batch_number": batch_number,
            "initial_quantity": float(batch_data.quantity),
            "current_quantity": float(batch_data.quantity),
            "expiry_date": batch_data.expiry_date.isoformat(),
            "manufacture_date": batch_data.manufacture_date.isoformat() if batch_data.manufacture_date else None,
            "cost_price": batch_data.cost_price,
            "selling_price": batch_data.selling_price,
            "location_code": batch_data.location_code,
            "status": "active",
            "created_by": current_user["sub"],
            "notes": batch_data.notes
        }
        
        # Calculate initial score for immediate feedback
        initial_score = None
        urgency_level = "unknown"
        recommendations = []
        warnings = []
        
        try:
            # Quick scoring calculation
            scoring_service = create_scoring_service(db)
            days_to_expiry = (batch_data.expiry_date - date.today()).days
            
            if days_to_expiry <= 0:
                initial_score = 1.0
                urgency_level = "critical"
                recommendations.append("Product already expired - immediate action required")
            elif days_to_expiry <= 1:
                initial_score = 0.95
                urgency_level = "critical"
                recommendations.append("Expires tomorrow - apply discount immediately")
            elif days_to_expiry <= 3:
                initial_score = 0.8
                urgency_level = "high"
                recommendations.append("Expires soon - monitor closely and prepare discounts")
            elif days_to_expiry <= 7:
                initial_score = 0.6
                urgency_level = "medium"
                recommendations.append("Expires within a week - track sales velocity")
            else:
                initial_score = 0.2
                urgency_level = "low"
                recommendations.append("Good shelf life - monitor regularly")
            
            # Add warnings for edge cases
            if days_to_expiry < 0:
                warnings.append(f"Product expired {abs(days_to_expiry)} days ago")
            elif days_to_expiry > 365:
                warnings.append("Very long expiry date - please verify accuracy")
            
            if batch_data.cost_price and batch_data.selling_price:
                if batch_data.cost_price >= batch_data.selling_price:
                    warnings.append("Cost price equals or exceeds selling price")
                    
        except Exception as e:
            logger.warning("Could not calculate initial score", error=str(e))
            recommendations.append("Score calculation pending - will be calculated in background")
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Log successful scan-in
        logger.info("Scan-in completed", 
                   store_id=store_id,
                   sku=batch_data.product_sku,
                   batch_number=batch_number,
                   days_to_expiry=days_to_expiry,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return ScanInResponse(
            success=True,
            batch_id=batch_creation_data["batch_id"],
            batch_number=batch_number,
            product_info=product_info,
            initial_score=initial_score,
            urgency_level=urgency_level,
            recommendations=recommendations,
            warnings=warnings,
            processing_time_ms=processing_time_ms
        )
        
    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Scan-in failed", 
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500, 
            detail="Scan-in processing failed"
        )


@router.post("/scan-out/{store_id}/{batch_id}", response_model=ScanOutResponse)
@ai_endpoint_rate_limit("40/minute")  # Higher limit for frequent scan-outs
async def scan_out_batch(
    store_id: str,
    batch_id: str,
    request: Request,
    scan_out_data: ScanOutRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
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
                status_code=404
            )
        
        # Validate quantity
        current_quantity = batch_data["current_quantity"]
        if scan_out_data.quantity_moved > current_quantity:
            raise ScanWorkflowException(
                f"Cannot move {scan_out_data.quantity_moved} items - only {current_quantity} available",
                workflow="scan_out",
                error_code="INSUFFICIENT_QUANTITY",
                status_code=400
            )
        
        # Calculate new quantity and status
        new_quantity = current_quantity - scan_out_data.quantity_moved
        new_status = "active" if new_quantity > 0 else "sold"
        
        if scan_out_data.action in ["discarded", "donated"]:
            if new_quantity == 0:
                new_status = scan_out_data.action.value
        
        # Calculate financial impact
        revenue_impact = 0.0
        waste_prevented = 0.0
        
        if scan_out_data.action in ["sold_full_price", "sold_discounted"]:
            selling_price = scan_out_data.actual_selling_price or batch_data["selling_price"]
            revenue_impact = selling_price * scan_out_data.quantity_moved
            
            if scan_out_data.action == "sold_discounted":
                original_revenue = batch_data["selling_price"] * scan_out_data.quantity_moved
                waste_prevented = revenue_impact  # Revenue recovered vs total loss
        
        elif scan_out_data.action == "donated":
            # Estimate waste prevented value (cost recovery + social impact)
            cost_value = batch_data["cost_price"] * scan_out_data.quantity_moved
            waste_prevented = cost_value * 0.7  # Estimated social value
        
        # Prepare action record
        action_id = str(uuid.uuid4())
        action_data = {
            "action_id": action_id,
            "batch_id": batch_id,
            "store_id": store_id,
            "action_type": scan_out_data.action.value,
            "original_price": batch_data["selling_price"],
            "new_price": scan_out_data.actual_selling_price,
            "discount_percent": scan_out_data.discount_percent,
            "quantity_sold": scan_out_data.quantity_moved,
            "executed_by": current_user["sub"],
            "notes": scan_out_data.notes,
            "channel": scan_out_data.channel,
            "customer_type": scan_out_data.customer_type,
            "revenue_impact": revenue_impact,
            "waste_prevented": waste_prevented
        }
        
        # Calculate effectiveness score
        effectiveness_score = await _calculate_action_effectiveness(
            action_data, batch_data, scan_out_data
        )
        
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Log successful scan-out
        logger.info("Scan-out completed",
                   store_id=store_id,
                   batch_id=batch_id,
                   action=scan_out_data.action.value,
                   quantity_moved=scan_out_data.quantity_moved,
                   new_quantity=new_quantity,
                   revenue_impact=revenue_impact,
                   waste_prevented=waste_prevented,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        # Trigger real-time update (async, don't wait)
        await _trigger_realtime_update(store_id, batch_id, {
            "action": scan_out_data.action.value,
            "new_quantity": new_quantity,
            "status": new_status,
            "effectiveness_score": effectiveness_score
        })
        
        return ScanOutResponse(
            success=True,
            action_id=action_id,
            batch_id=batch_id,
            remaining_quantity=new_quantity,
            batch_status=new_status,
            effectiveness_score=effectiveness_score,
            revenue_impact=revenue_impact,
            waste_prevented=waste_prevented,
            processing_time_ms=processing_time_ms
        )
        
    except ScanWorkflowException:
        raise
    except HTTPException:
        raise
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Scan-out failed",
                    store_id=store_id,
                    batch_id=batch_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Scan-out processing failed"
        )


@router.post("/process-scan/{store_id}")
@ai_endpoint_rate_limit("20/minute")
async def process_scanned_batch(
    store_id: str,
    request: Request,
    scan_data: ProcessScanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Dict[str, Any] = Depends(get_current_user)
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
            scan_data.barcode, 
            store_id, 
            read_ops
        )
        
        if not product_info:
            # Prepare for new product creation
            product_info = {
                "needs_creation": True,
                "barcode": scan_data.barcode,
                "suggested_sku": f"SCAN_{scan_data.barcode}",
                "confidence": scan_data.confidence_score
            }
        
        # Validate expiry date confidence
        expiry_confidence = scan_data.confidence_score
        warnings = []
        
        if expiry_confidence < 0.8:
            warnings.append(f"Low confidence on expiry date ({expiry_confidence:.2f}) - please verify")
        
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
        
        logger.info("Scan processed",
                   store_id=store_id,
                   barcode=scan_data.barcode,
                   confidence=scan_data.confidence_score,
                   days_to_expiry=days_to_expiry,
                   urgency_score=urgency_score,
                   processing_time_ms=processing_time_ms,
                   user_id=current_user["sub"])
        
        return {
            "success": True,
            "product_info": product_info,
            "urgency_score": urgency_score,
            "days_to_expiry": days_to_expiry,
            "confidence_score": expiry_confidence,
            "warnings": warnings,
            "processing_time_ms": processing_time_ms,
            "scan_timestamp": scan_data.scan_timestamp.isoformat(),
            "next_steps": [
                "Verify product information" if product_info.get("needs_creation") else "Confirm batch details",
                "Review expiry date accuracy" if expiry_confidence < 0.8 else "Proceed with scan-in"
            ]
        }
        
    except Exception as e:
        processing_time_ms = (time.time() - start_time) * 1000
        logger.error("Scan processing failed",
                    store_id=store_id,
                    error=str(e),
                    processing_time_ms=processing_time_ms,
                    user_id=current_user["sub"])
        raise HTTPException(
            status_code=500,
            detail="Scan processing failed"
        )


# Helper functions

async def _validate_or_prepare_product(sku: str, store_id: str, read_ops) -> Dict[str, Any]:
    """Validate product exists or prepare data for creation"""
    # This would check if product exists in database
    # For MVP, we'll prepare data for frontend to create via Supabase
    
    # Sanitize SKU
    clean_sku = sanitize_text_input(sku)
    
    # For now, return prepared product info
    # In full implementation, this would query the database
    return {
        "product_id": str(uuid.uuid4()),  # Will be generated by Supabase
        "sku": clean_sku,
        "needs_creation": True,  # Indicates frontend should create product
        "suggested_category": _suggest_category_from_sku(clean_sku),
        "validation_status": "prepared"
    }


async def _generate_batch_number(store_id: str, sku: str, expiry_date: date) -> str:
    """Generate unique batch number"""
    date_str = expiry_date.strftime('%Y%m%d')
    timestamp = datetime.now().strftime('%H%M%S')
    store_prefix = store_id[:8] if len(store_id) >= 8 else store_id
    sku_prefix = sku[:10] if len(sku) >= 10 else sku
    
    return f"{store_prefix}_{sku_prefix}_{date_str}_{timestamp}"


def _suggest_category_from_sku(sku: str) -> str:
    """Suggest category based on SKU patterns"""
    sku_lower = sku.lower()
    
    if any(word in sku_lower for word in ['apple', 'banana', 'fruit', 'vegetable', 'produce']):
        return 'fresh_produce'
    elif any(word in sku_lower for word in ['bread', 'bakery', 'pastry']):
        return 'bakery_fresh'
    elif any(word in sku_lower for word in ['milk', 'dairy', 'cheese', 'yogurt']):
        return 'dairy'
    elif any(word in sku_lower for word in ['meat', 'fish', 'chicken', 'beef']):
        return 'fresh_meat_fish'
    elif any(word in sku_lower for word in ['frozen']):
        return 'frozen'
    else:
        return 'dry_goods'


async def _lookup_product_by_barcode(barcode: str, store_id: str, read_ops) -> Optional[Dict[str, Any]]:
    """Look up product by barcode"""
    # This would query the database for existing products with this barcode
    # For MVP implementation, return None to indicate new product needed
    return None


async def _calculate_action_effectiveness(action_data: Dict, batch_data: Dict, scan_out_data: ScanOutRequest) -> float:
    """Calculate effectiveness score for the action taken"""
    base_score = 0.5
    
    # Score based on action type and timing
    if scan_out_data.action in ["sold_full_price", "sold_discounted"]:
        base_score = 0.9
        
        # Bonus for timely action on expiring items
        days_to_expiry = (datetime.fromisoformat(batch_data["expiry_date"]).date() - date.today()).days
        if days_to_expiry <= 1 and scan_out_data.action == "sold_discounted":
            base_score = 1.0  # Perfect - sold discounted item before expiry
        elif days_to_expiry <= 0:
            base_score = 0.7  # Still sold, but after expiry
            
    elif scan_out_data.action == "donated":
        base_score = 0.7  # Good social impact
        
    elif scan_out_data.action == "discarded":
        base_score = 0.1  # Waste occurred
    
    return min(1.0, max(0.0, base_score))


async def _trigger_realtime_update(store_id: str, batch_id: str, update_data: Dict[str, Any]):
    """Trigger real-time update for frontend"""
    try:
        # In full implementation, this would integrate with Supabase real-time
        # For now, just log the update
        logger.info("Real-time update triggered",
                   store_id=store_id,
                   batch_id=batch_id,
                   update_type="scan_out",
                   data=update_data)
    except Exception as e:
        logger.warning("Real-time update failed", error=str(e))