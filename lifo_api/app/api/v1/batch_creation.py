"""
Batch Creation API Endpoints
Creates inventory batches from scan session data
"""

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.dependencies import get_current_user, get_store_access
from app.services.batch_creation_service import (
    BatchCreationResponse,
    BatchCreationService,
    BatchFromScanRequest,
)

logger = structlog.get_logger()
router = APIRouter()


@router.post(
    "/create-from-scan/{store_id}",
    response_model=BatchCreationResponse,
    summary="Create batch from scan data",
    description="Create inventory batch from frontend scan session data",
)
# # @limiter.limit("15/minute")  # Reasonable limit for batch creation
async def create_batch_from_scan(
    request: Request,
    store_id: str,
    batch_data: BatchFromScanRequest,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access),
):
    """Create inventory batch from scan data"""

    try:
        # Validate barcode
        barcode = batch_data.barcode.strip()
        if not barcode or len(barcode) < 8:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid barcode: must be at least 8 characters",
            )

        # Validate product name
        if not batch_data.product_name or not batch_data.product_name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Product name is required",
            )

        # Validate expiry date is not too far in the past
        from datetime import date, timedelta

        if batch_data.expiry_date < date.today() - timedelta(days=30):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Expiry date is too far in the past (max 30 days ago)",
            )

        # Validate prices if provided
        if batch_data.cost_price is not None and batch_data.cost_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cost price cannot be negative",
            )

        if batch_data.selling_price is not None and batch_data.selling_price < 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selling price cannot be negative",
            )

        service = BatchCreationService()
        result = await service.create_batch_from_scan(
            store_id=store_id, user_id=current_user.user_id, batch_data=batch_data
        )

        logger.info(
            "Batch created from scan via API",
            batch_id=result.batch_id,
            barcode=batch_data.barcode,
            product_name=batch_data.product_name,
            quantity=batch_data.quantity,
            store_id=store_id,
            user_id=current_user.user_id,
        )

        return result

    except ValueError as e:
        logger.error(
            "Invalid batch creation request",
            error=str(e),
            barcode=batch_data.barcode,
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(
            "Failed to create batch from scan",
            error=str(e),
            barcode=batch_data.barcode,
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create batch from scan",
        ) from e


@router.get(
    "/recent-from-scans/{store_id}",
    summary="Get recent batches from scans",
    description="Get recent inventory batches created from scan sessions",
)
# # @limiter.limit("20/minute")
async def get_recent_batches_from_scans(
    request: Request,
    store_id: str,
    limit: int = 20,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access),
):
    """Get recent batches created from scan sessions"""

    try:
        # Validate limit
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 100",
            )

        service = BatchCreationService()
        batches = await service.get_recent_batches_from_scans(
            store_id=store_id, user_id=current_user.user_id, limit=limit
        )

        return {
            "store_id": store_id,
            "total_batches": len(batches),
            "batches": batches,
            "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
        }

    except ValueError as e:
        logger.error(
            "Invalid request for recent scan batches",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from e
    except Exception as e:
        logger.error(
            "Failed to get recent scan batches",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recent scan batches",
        ) from e


@router.post(
    "/batch-create-from-scans/{store_id}",
    summary="Batch create from multiple scans",
    description="Create multiple inventory batches from scan data in a single request",
)
# # @limiter.limit("3/minute")  # Lower limit for batch operations
async def batch_create_from_scans(
    store_id: str,
    batch_requests: list[BatchFromScanRequest],
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access),
):
    """Create multiple batches from scan data"""

    try:
        # Validate batch size
        if len(batch_requests) > 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Batch size cannot exceed 10 batches",
            )

        if not batch_requests:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one batch creation request is required",
            )

        service = BatchCreationService()
        results = []
        errors = []

        for i, batch_data in enumerate(batch_requests):
            try:
                # Validate each request
                barcode = batch_data.barcode.strip()
                if not barcode or len(barcode) < 8:
                    errors.append(
                        {
                            "index": i,
                            "barcode": barcode,
                            "error": "Invalid barcode: must be at least 8 characters",
                        }
                    )
                    continue

                if not batch_data.product_name or not batch_data.product_name.strip():
                    errors.append(
                        {
                            "index": i,
                            "barcode": barcode,
                            "error": "Product name is required",
                        }
                    )
                    continue

                # Create batch
                result = await service.create_batch_from_scan(
                    store_id=store_id,
                    user_id=current_user.user_id,
                    batch_data=batch_data,
                )

                results.append(
                    {"index": i, "barcode": barcode, "success": True, "result": result}
                )

            except Exception as e:
                errors.append(
                    {"index": i, "barcode": batch_data.barcode, "error": str(e)}
                )

        logger.info(
            "Batch creation from scans completed",
            total_requests=len(batch_requests),
            successful=len(results),
            failed=len(errors),
            store_id=store_id,
            user_id=current_user.user_id,
        )

        return {
            "store_id": store_id,
            "total_requests": len(batch_requests),
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "processed_at": __import__("datetime").datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to batch create from scans",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to batch create from scans",
        ) from e


@router.get(
    "/scan-batch-stats/{store_id}",
    summary="Get scan batch statistics",
    description="Get statistics about batches created from scan sessions",
)
# # @limiter.limit("20/minute")
async def get_scan_batch_stats(
    store_id: str,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access),
):
    """Get statistics about batches created from scans"""

    try:
        from sqlalchemy import text

        from app.core.database import get_database

        db = get_database()

        query = text("""
            SELECT
                COUNT(*) as total_scan_batches,
                COUNT(CASE WHEN b.batch_source = 'barcode' THEN 1 END) as barcode_batches,
                COUNT(CASE WHEN b.expiry_source = 'ocr' THEN 1 END) as ocr_expiry_batches,
                COUNT(CASE WHEN b.expiry_source = 'manual' THEN 1 END) as manual_expiry_batches,
                COUNT(CASE WHEN b.scan_session_id IS NOT NULL THEN 1 END) as linked_to_sessions,
                AVG(b.expiry_confidence) as avg_expiry_confidence,
                COUNT(CASE WHEN p.openfoodfacts_id IS NOT NULL THEN 1 END) as enriched_products,
                COUNT(DISTINCT p.product_id) as unique_products,
                SUM(b.current_quantity) as total_quantity,
                MIN(b.created_at) as first_scan_batch,
                MAX(b.created_at) as latest_scan_batch
            FROM inventory.batches b
            JOIN inventory.products p ON b.product_id = p.product_id
            WHERE b.store_id = :store_id
            AND b.batch_source IN ('barcode', 'api')
            AND EXISTS (
                SELECT 1 FROM business.store_users su
                WHERE su.store_id = :store_id
                AND su.user_id = :user_id
                AND su.is_active = TRUE
            )
            AND b.created_at >= NOW() - INTERVAL '30 days'
        """)

        async with db.get_session() as session:
            result = await session.execute(
                query, {"store_id": store_id, "user_id": current_user.user_id}
            )

            row = result.fetchone()
            if not row:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Store not found or access denied",
                )

            # Calculate percentages
            ocr_percentage = 0.0
            enrichment_percentage = 0.0
            session_linking_percentage = 0.0

            if row.total_scan_batches > 0:
                ocr_percentage = (row.ocr_expiry_batches / row.total_scan_batches) * 100
                enrichment_percentage = (
                    row.enriched_products / row.total_scan_batches
                ) * 100
                session_linking_percentage = (
                    row.linked_to_sessions / row.total_scan_batches
                ) * 100

            return {
                "store_id": store_id,
                "period_days": 30,
                "total_scan_batches": row.total_scan_batches,
                "barcode_batches": row.barcode_batches,
                "ocr_expiry_batches": row.ocr_expiry_batches,
                "manual_expiry_batches": row.manual_expiry_batches,
                "linked_to_sessions": row.linked_to_sessions,
                "avg_expiry_confidence": float(row.avg_expiry_confidence)
                if row.avg_expiry_confidence
                else None,
                "enriched_products": row.enriched_products,
                "unique_products": row.unique_products,
                "total_quantity": float(row.total_quantity)
                if row.total_quantity
                else 0,
                "ocr_usage_percentage": round(ocr_percentage, 2),
                "enrichment_percentage": round(enrichment_percentage, 2),
                "session_linking_percentage": round(session_linking_percentage, 2),
                "first_scan_batch": row.first_scan_batch.isoformat()
                if row.first_scan_batch
                else None,
                "latest_scan_batch": row.latest_scan_batch.isoformat()
                if row.latest_scan_batch
                else None,
                "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get scan batch stats",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get scan batch statistics",
        ) from e
