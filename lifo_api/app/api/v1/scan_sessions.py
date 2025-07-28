"""
Scan Session API Endpoints
Provides APIs for frontend integration with scan session management
"""

from typing import List

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.dependencies import get_current_user, get_store_access
from app.core.rate_limiting import limiter
from app.services.scan_session_service import (
    ScanSessionCreate,
    ScanSessionResponse,
    ScanSessionService,
    ScanSessionUpdate,
)

logger = structlog.get_logger()
router = APIRouter()

# Add rate limit exceeded handler
# router.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@router.post(
    "/create/{store_id}",
    response_model=ScanSessionResponse,
    summary="Create new scan session",
    description="Create a new scan session for frontend-backend integration"
)
# @limiter.limit("30/minute")  # Allow frequent session creation
async def create_scan_session(
    store_id: str,
    session_data: ScanSessionCreate,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access)
):
    """Create a new scan session"""
    
    try:
        # Validate scan_type
        valid_scan_types = ['barcode', 'expiry', 'complete']
        if session_data.scan_type not in valid_scan_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid scan_type. Must be one of: {valid_scan_types}"
            )
        
        # Validate workflow
        valid_workflows = ['standard', 'quick', 'detailed']
        if session_data.workflow not in valid_workflows:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid workflow. Must be one of: {valid_workflows}"
            )
        
        service = ScanSessionService()
        session = await service.create_session(
            store_id=store_id,
            user_id=current_user.user_id,
            session_data=session_data
        )
        
        logger.info(
            "Scan session created via API",
            session_id=session.session_id,
            store_id=store_id,
            scan_type=session_data.scan_type,
            user_id=current_user.user_id
        )
        
        return session
        
    except ValueError as e:
        logger.error(
            "Invalid scan session creation request",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to create scan session",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create scan session"
        )


@router.put(
    "/{session_id}/update",
    response_model=ScanSessionResponse,
    summary="Update scan session",
    description="Update scan session with results from frontend scanning"
)
# @limiter.limit("60/minute")  # Allow frequent updates during scanning
async def update_scan_session(
    session_id: str,
    update_data: ScanSessionUpdate,
    current_user=Depends(get_current_user)
):
    """Update scan session with scanning results"""
    
    try:
        # Validate scan_status
        valid_statuses = ['completed', 'failed', 'partial']
        if update_data.scan_status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid scan_status. Must be one of: {valid_statuses}"
            )
        
        service = ScanSessionService()
        session = await service.update_session(
            session_id=session_id,
            user_id=current_user.user_id,
            update_data=update_data
        )
        
        logger.info(
            "Scan session updated via API",
            session_id=session_id,
            scan_status=update_data.scan_status,
            user_id=current_user.user_id
        )
        
        return session
        
    except ValueError as e:
        logger.error(
            "Invalid scan session update request",
            error=str(e),
            session_id=session_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to update scan session",
            error=str(e),
            session_id=session_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update scan session"
        )


@router.get(
    "/{session_id}",
    response_model=ScanSessionResponse,
    summary="Get scan session",
    description="Get scan session details by ID"
)
# @limiter.limit("100/minute")
async def get_scan_session(
    session_id: str,
    current_user=Depends(get_current_user)
):
    """Get scan session by ID"""
    
    try:
        service = ScanSessionService()
        session = await service.get_session(
            session_id=session_id,
            user_id=current_user.user_id
        )
        
        return session
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to get scan session",
            error=str(e),
            session_id=session_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get scan session"
        )


@router.get(
    "/store/{store_id}/recent",
    response_model=List[ScanSessionResponse],
    summary="Get recent scan sessions",
    description="Get recent scan sessions for a store"
)
# @limiter.limit("20/minute")
async def get_recent_scan_sessions(
    store_id: str,
    limit: int = 20,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access)
):
    """Get recent scan sessions for a store"""
    
    try:
        # Validate limit
        if limit < 1 or limit > 100:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Limit must be between 1 and 100"
            )
        
        service = ScanSessionService()
        sessions = await service.get_recent_sessions(
            store_id=store_id,
            user_id=current_user.user_id,
            limit=limit
        )
        
        return sessions
        
    except ValueError as e:
        logger.error(
            "Invalid request for recent scan sessions",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(
            "Failed to get recent scan sessions",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recent scan sessions"
        )


@router.get(
    "/store/{store_id}/analytics",
    summary="Get scan session analytics",
    description="Get scanning analytics and performance metrics for a store"
)
# @limiter.limit("10/minute")
async def get_scan_analytics(
    store_id: str,
    current_user=Depends(get_current_user),
    store_access=Depends(get_store_access)
):
    """Get scanning analytics for a store"""
    
    try:
        service = ScanSessionService()
        
        # Use the database view we created in the migration
        from app.core.database import get_database
        from sqlalchemy import text
        
        db = get_database()
        
        query = text("""
            SELECT 
                scan_type,
                scan_status,
                COUNT(*) as total_scans,
                AVG((confidence_scores->>'overall')::DECIMAL) as avg_confidence,
                AVG(processing_time_ms) as avg_processing_time_ms,
                COUNT(DISTINCT detected_barcode) as unique_barcodes,
                COUNT(openfoodfacts_product_id) as openfoodfacts_matches,
                DATE_TRUNC('day', created_at) as scan_date
            FROM inventory.scan_sessions
            WHERE store_id = :store_id
            AND EXISTS (
                SELECT 1 FROM business.store_users su
                WHERE su.store_id = :store_id
                AND su.user_id = :user_id
                AND su.is_active = TRUE
            )
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY scan_type, scan_status, DATE_TRUNC('day', created_at)
            ORDER BY scan_date DESC, scan_type
        """)
        
        async with db.get_session() as session:
            result = await session.execute(query, {
                'store_id': store_id,
                'user_id': current_user.user_id
            })
            
            analytics_data = []
            for row in result.fetchall():
                analytics_data.append({
                    'scan_type': row.scan_type,
                    'scan_status': row.scan_status,
                    'total_scans': row.total_scans,
                    'avg_confidence': float(row.avg_confidence) if row.avg_confidence else None,
                    'avg_processing_time_ms': float(row.avg_processing_time_ms) if row.avg_processing_time_ms else None,
                    'unique_barcodes': row.unique_barcodes,
                    'openfoodfacts_matches': row.openfoodfacts_matches,
                    'scan_date': row.scan_date.isoformat() if row.scan_date else None
                })
        
        return {
            'store_id': store_id,
            'analytics_period_days': 30,
            'data': analytics_data,
            'generated_at': __import__('datetime').datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(
            "Failed to get scan analytics",
            error=str(e),
            store_id=store_id,
            user_id=current_user.user_id
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get scan analytics"
        )