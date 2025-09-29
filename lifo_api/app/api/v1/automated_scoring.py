"""
API endpoints for managing automated scoring schedules
Provides cron-like scheduling management for inventory scoring
"""


from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.secure_dependencies import get_current_user
from app.core.automated_scoring import (
    ScoringScheduleConfig,
    get_automated_scoring_scheduler,
)
from app.database.connection import get_db
from app.middleware.rate_limiting import ai_endpoint_rate_limit

router = APIRouter()
logger = structlog.get_logger()


# Request/Response Models
class CreateScheduleRequest(BaseModel):
    """Request model for creating a new scoring schedule"""

    store_id: str = Field(description="Store ID to schedule scoring for")
    schedule_type: str = Field(
        default="cron",
        pattern="^(cron|interval)$",
        description="Schedule type: 'cron' or 'interval'"
    )
    cron_expression: Optional[str] = Field(
        default="0 */4 * * *",
        description="Cron expression (minute hour day month day_of_week)"
    )
    interval_hours: Optional[int] = Field(
        default=4,
        ge=1,
        le=168,  # Max 1 week
        description="Hours between scoring runs (for interval type)"
    )
    force_recalculate: bool = Field(
        default=False,
        description="Force recalculation of all scores"
    )
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    enabled: bool = Field(default=True, description="Whether schedule is active")


class UpdateScheduleRequest(BaseModel):
    """Request model for updating an existing scoring schedule"""

    schedule_type: Optional[str] = Field(
        default=None,
        pattern="^(cron|interval)$",
        description="Schedule type: 'cron' or 'interval'"
    )
    cron_expression: Optional[str] = Field(
        default=None,
        description="Cron expression (minute hour day month day_of_week)"
    )
    interval_hours: Optional[int] = Field(
        default=None,
        ge=1,
        le=168,  # Max 1 week
        description="Hours between scoring runs (for interval type)"
    )
    force_recalculate: Optional[bool] = Field(
        default=None,
        description="Force recalculation of all scores"
    )
    timezone: Optional[str] = Field(default=None, description="Timezone for scheduling")
    enabled: Optional[bool] = Field(default=None, description="Whether schedule is active")


class ScheduleResponse(BaseModel):
    """Response model for schedule operations"""

    schedule_id: str
    store_id: str
    enabled: bool
    schedule_type: str
    cron_expression: Optional[str]
    interval_hours: Optional[int]
    timezone: str
    next_run_time: Optional[str]
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class JobStatusResponse(BaseModel):
    """Response model for job status"""

    job_id: str
    schedule_id: str
    store_id: str
    status: str
    started_at: str
    completed_at: Optional[str]
    processed_items: int
    processing_time_ms: int
    items_per_second: Optional[float]
    error_message: Optional[str]


# API Endpoints
@router.post("/schedules", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("10/minute")
async def create_scoring_schedule(
    request_data: CreateScheduleRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new automated scoring schedule

    Creates a cron-like schedule for automatic inventory scoring.
    Supports both cron expressions and simple interval scheduling.

    Args:
        request_data: Schedule configuration
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        Created schedule information

    Raises:
        HTTPException: If schedule creation fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Create schedule configuration
        config = ScoringScheduleConfig(
            store_id=request_data.store_id,
            schedule_type=request_data.schedule_type,
            cron_expression=request_data.cron_expression,
            interval_hours=request_data.interval_hours,
            force_recalculate=request_data.force_recalculate,
            timezone=request_data.timezone,
            enabled=request_data.enabled,
        )

        # Add schedule to scheduler
        schedule_id = await scheduler.add_scoring_schedule(config)

        logger.info(
            "Automated scoring schedule created",
            schedule_id=schedule_id,
            store_id=request_data.store_id,
            schedule_type=request_data.schedule_type,
            user_id=current_user["sub"]
        )

        # Get schedule status for response
        status = await scheduler.get_schedule_status(schedule_id)

        return {
            "success": True,
            "message": f"Scoring schedule created for store {request_data.store_id}",
            "schedule": status
        }

    except ValueError as ve:
        logger.warning(
            "Invalid schedule configuration",
            store_id=request_data.store_id,
            error=str(ve),
            user_id=current_user["sub"]
        )
        raise HTTPException(status_code=400, detail=str(ve)) from ve

    except Exception as e:
        logger.error(
            "Failed to create scoring schedule",
            store_id=request_data.store_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to create scoring schedule"
        ) from e


@router.get("/schedules", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("30/minute")
async def list_scoring_schedules(
    request: Request,
    store_id: Optional[str] = Query(None, description="Filter by store ID"),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all active scoring schedules

    Returns information about all configured automated scoring schedules,
    optionally filtered by store ID.

    Args:
        request: FastAPI request object
        store_id: Optional store ID filter
        current_user: Authenticated user information
        db: Database session

    Returns:
        List of active schedules

    Raises:
        HTTPException: If operation fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get all active schedules
        schedules = await scheduler.list_active_schedules()

        # Filter by store_id if provided
        if store_id:
            schedules = [s for s in schedules if s.get("store_id") == store_id]

        logger.info(
            "Listed automated scoring schedules",
            total_schedules=len(schedules),
            store_filter=store_id,
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "total_count": len(schedules),
            "schedules": schedules,
            "filters": {"store_id": store_id}
        }

    except Exception as e:
        logger.error(
            "Failed to list scoring schedules",
            store_filter=store_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to list scoring schedules"
        ) from e


@router.get("/schedules/{schedule_id}", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("50/minute")
async def get_scoring_schedule(
    schedule_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get details of a specific scoring schedule

    Returns detailed information about a scoring schedule including
    recent execution history and next run time.

    Args:
        schedule_id: Schedule ID to retrieve
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        Schedule details and execution history

    Raises:
        HTTPException: If schedule not found or operation fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get schedule status
        status = await scheduler.get_schedule_status(schedule_id)

        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Schedule {schedule_id} not found"
            )

        logger.info(
            "Retrieved scoring schedule details",
            schedule_id=schedule_id,
            store_id=status.get("store_id"),
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "schedule": status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get scoring schedule",
            schedule_id=schedule_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to get scoring schedule"
        ) from e


@router.put("/schedules/{schedule_id}", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("20/minute")
async def update_scoring_schedule(
    schedule_id: str,
    request_data: UpdateScheduleRequest,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update an existing scoring schedule

    Updates the configuration of an existing automated scoring schedule.
    Only provided fields will be updated.

    Args:
        schedule_id: Schedule ID to update
        request_data: Updated schedule configuration
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        Updated schedule information

    Raises:
        HTTPException: If schedule not found or update fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get existing schedule
        current_status = await scheduler.get_schedule_status(schedule_id)
        if not current_status:
            raise HTTPException(
                status_code=404,
                detail=f"Schedule {schedule_id} not found"
            )

        # Create updated configuration
        config = ScoringScheduleConfig(
            schedule_id=schedule_id,
            store_id=current_status["store_id"],
            schedule_type=request_data.schedule_type or current_status["schedule_type"],
            cron_expression=request_data.cron_expression or current_status["cron_expression"],
            interval_hours=request_data.interval_hours or current_status["interval_hours"],
            force_recalculate=request_data.force_recalculate if request_data.force_recalculate is not None else False,
            timezone=request_data.timezone or current_status["timezone"],
            enabled=request_data.enabled if request_data.enabled is not None else current_status["enabled"],
        )

        # Update schedule
        success = await scheduler.update_scoring_schedule(schedule_id, config)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to update schedule"
            )

        # Get updated status
        updated_status = await scheduler.get_schedule_status(schedule_id)

        logger.info(
            "Automated scoring schedule updated",
            schedule_id=schedule_id,
            store_id=current_status["store_id"],
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "message": f"Schedule {schedule_id} updated successfully",
            "schedule": updated_status
        }

    except HTTPException:
        raise
    except ValueError as ve:
        logger.warning(
            "Invalid schedule update configuration",
            schedule_id=schedule_id,
            error=str(ve),
            user_id=current_user["sub"]
        )
        raise HTTPException(status_code=400, detail=str(ve)) from ve

    except Exception as e:
        logger.error(
            "Failed to update scoring schedule",
            schedule_id=schedule_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to update scoring schedule"
        ) from e


@router.delete("/schedules/{schedule_id}", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("10/minute")
async def delete_scoring_schedule(
    schedule_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a scoring schedule

    Removes an automated scoring schedule. This will stop all future
    executions for this schedule.

    Args:
        schedule_id: Schedule ID to delete
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        Deletion confirmation

    Raises:
        HTTPException: If schedule not found or deletion fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get schedule info before deletion
        status = await scheduler.get_schedule_status(schedule_id)
        if not status:
            raise HTTPException(
                status_code=404,
                detail=f"Schedule {schedule_id} not found"
            )

        # Remove schedule
        success = await scheduler.remove_scoring_schedule(schedule_id)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete schedule"
            )

        logger.info(
            "Automated scoring schedule deleted",
            schedule_id=schedule_id,
            store_id=status["store_id"],
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "message": f"Schedule {schedule_id} deleted successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to delete scoring schedule",
            schedule_id=schedule_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to delete scoring schedule"
        ) from e


@router.post("/trigger/{store_id}", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("5/minute")
async def trigger_immediate_scoring(
    store_id: str,
    request: Request,
    force_recalculate: bool = Query(
        False, description="Force recalculation of all scores"
    ),
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Trigger immediate scoring for a store

    Executes scoring immediately for a store, outside of any scheduled runs.
    This is useful for testing or when immediate updates are needed.

    Args:
        store_id: Store ID to score
        request: FastAPI request object
        force_recalculate: Whether to force recalculation of all scores
        current_user: Authenticated user information
        db: Database session

    Returns:
        Job information for tracking

    Raises:
        HTTPException: If trigger fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Trigger immediate scoring
        job_id = await scheduler.trigger_immediate_scoring(
            store_id, force_recalculate
        )

        logger.info(
            "Immediate scoring triggered",
            store_id=store_id,
            job_id=job_id,
            force_recalculate=force_recalculate,
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "message": f"Immediate scoring triggered for store {store_id}",
            "job_id": job_id,
            "store_id": store_id,
            "force_recalculate": force_recalculate
        }

    except Exception as e:
        logger.error(
            "Failed to trigger immediate scoring",
            store_id=store_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to trigger immediate scoring"
        ) from e


@router.get("/jobs/{job_id}", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("100/minute")
async def get_job_status(
    job_id: str,
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get status of a scoring job

    Returns the current status and results of a scoring job.
    Useful for monitoring immediate triggers or checking job progress.

    Args:
        job_id: Job ID to check
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        Job status and results

    Raises:
        HTTPException: If job not found
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get job result
        result = await scheduler.get_job_result(job_id)

        if not result:
            raise HTTPException(
                status_code=404,
                detail=f"Job {job_id} not found"
            )

        # Convert to dict for JSON serialization
        job_status = {
            "job_id": result.job_id,
            "schedule_id": result.schedule_id,
            "store_id": result.store_id,
            "status": result.status,
            "started_at": result.started_at.isoformat(),
            "completed_at": result.completed_at.isoformat() if result.completed_at else None,
            "total_items": result.total_items,
            "processed_items": result.processed_items,
            "high_priority_count": result.high_priority_count,
            "processing_time_ms": result.processing_time_ms,
            "items_per_second": result.items_per_second,
            "error_message": result.error_message,
            "retry_count": result.retry_count,
            "database_operations": result.database_operations
        }

        logger.debug(
            "Retrieved job status",
            job_id=job_id,
            status=result.status,
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "job": job_status
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get job status",
            job_id=job_id,
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to get job status"
        ) from e


@router.get("/system/status", response_model=Dict[str, Any])
@ai_endpoint_rate_limit("10/minute")
async def get_system_status(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get automated scoring system status

    Returns overall system health and statistics for the automated
    scoring scheduler.

    Args:
        request: FastAPI request object
        current_user: Authenticated user information
        db: Database session

    Returns:
        System status and statistics

    Raises:
        HTTPException: If operation fails
    """
    try:
        scheduler = get_automated_scoring_scheduler()

        # Get all schedules
        schedules = await scheduler.list_active_schedules()

        # Calculate statistics
        enabled_schedules = len([s for s in schedules if s.get("enabled", False)])
        total_recent_jobs = sum(
            len(s.get("recent_executions", [])) for s in schedules
        )

        # Calculate success rate from recent jobs
        successful_jobs = 0
        failed_jobs = 0
        for schedule in schedules:
            for execution in schedule.get("recent_executions", []):
                if execution.get("status") == "completed":
                    successful_jobs += 1
                elif execution.get("status") in ["failed", "timeout"]:
                    failed_jobs += 1

        success_rate = (
            (successful_jobs / (successful_jobs + failed_jobs) * 100)
            if (successful_jobs + failed_jobs) > 0
            else 100.0
        )

        system_status = {
            "scheduler_running": scheduler._is_running,
            "total_schedules": len(schedules),
            "enabled_schedules": enabled_schedules,
            "disabled_schedules": len(schedules) - enabled_schedules,
            "total_recent_jobs": total_recent_jobs,
            "successful_jobs": successful_jobs,
            "failed_jobs": failed_jobs,
            "success_rate_percent": round(success_rate, 2),
            "system_health": "healthy" if scheduler._is_running and success_rate >= 80 else "degraded"
        }

        logger.info(
            "Retrieved automated scoring system status",
            **system_status,
            user_id=current_user["sub"]
        )

        return {
            "success": True,
            "system_status": system_status,
            "schedules_summary": [
                {
                    "schedule_id": s["schedule_id"],
                    "store_id": s["store_id"],
                    "enabled": s["enabled"],
                    "next_run_time": s["next_run_time"],
                    "recent_execution_count": len(s.get("recent_executions", []))
                }
                for s in schedules
            ]
        }

    except Exception as e:
        logger.error(
            "Failed to get system status",
            error=str(e),
            user_id=current_user["sub"]
        )
        raise HTTPException(
            status_code=500,
            detail="Failed to get system status"
        ) from e