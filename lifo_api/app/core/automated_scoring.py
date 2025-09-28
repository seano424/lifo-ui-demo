"""
Automated Scoring System with Cron-like Scheduling
Provides background task scheduling for automatic inventory scoring updates
"""

import asyncio
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.scoring import create_scoring_service
from app.database.connection import get_async_session

logger = structlog.get_logger()


class ScoringScheduleConfig(BaseModel):
    """Configuration for automated scoring schedules"""

    schedule_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    store_id: str
    schedule_type: str = Field(default="cron", description="'cron' or 'interval'")

    # Cron configuration (for cron schedule_type)
    cron_expression: Optional[str] = Field(
        default="0 */4 * * *",  # Every 4 hours by default
        description="Cron expression (minute hour day month day_of_week)"
    )

    # Interval configuration (for interval schedule_type)
    interval_hours: Optional[int] = Field(
        default=4,
        description="Hours between scoring runs (for interval type)"
    )

    # Scoring options
    force_recalculate: bool = Field(
        default=False,
        description="Force recalculation of all scores"
    )
    enabled: bool = Field(default=True, description="Whether schedule is active")

    # Advanced options
    timezone: str = Field(default="UTC", description="Timezone for scheduling")
    max_retries: int = Field(default=3, description="Maximum retry attempts")
    retry_delay_minutes: int = Field(default=5, description="Delay between retries")

    # Performance settings
    batch_size: int = Field(default=500, description="Batch size for scoring")
    timeout_minutes: int = Field(default=15, description="Timeout for scoring operation")


class ScoringJobResult(BaseModel):
    """Result of a scoring job execution"""

    job_id: str
    schedule_id: str
    store_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str = "running"  # running, completed, failed, timeout

    # Results
    total_items: int = 0
    processed_items: int = 0
    high_priority_count: int = 0
    processing_time_ms: int = 0

    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0

    # Performance metrics
    items_per_second: Optional[float] = None
    database_operations: Optional[Dict[str, int]] = None


class AutomatedScoringScheduler:
    """
    Advanced automated scoring scheduler with cron-like functionality
    Provides reliable background task execution for inventory scoring
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.active_schedules: Dict[str, ScoringScheduleConfig] = {}
        self.job_results: Dict[str, ScoringJobResult] = {}
        self.logger = structlog.get_logger().bind(component="automated_scoring_scheduler")
        self._is_running = False

    async def start_scheduler(self):
        """Start the automated scoring scheduler"""
        if self._is_running:
            self.logger.warning("Scheduler already running")
            return

        try:
            self.scheduler.start()
            self._is_running = True

            self.logger.info("Automated scoring scheduler started successfully")

            # Load existing schedules from configuration or database
            await self._load_default_schedules()

        except Exception as e:
            self.logger.error("Failed to start scheduler", error=str(e))
            raise

    async def stop_scheduler(self):
        """Stop the automated scoring scheduler"""
        if not self._is_running:
            return

        try:
            self.scheduler.shutdown(wait=True)
            self._is_running = False

            self.logger.info("Automated scoring scheduler stopped")

        except Exception as e:
            self.logger.error("Failed to stop scheduler", error=str(e))
            raise

    async def add_scoring_schedule(self, config: ScoringScheduleConfig) -> str:
        """
        Add a new automated scoring schedule

        Args:
            config: Schedule configuration

        Returns:
            Schedule ID
        """
        try:
            schedule_id = config.schedule_id

            # Remove existing schedule if it exists
            if schedule_id in self.active_schedules:
                await self.remove_scoring_schedule(schedule_id)

            # Create trigger based on schedule type
            if config.schedule_type == "cron":
                trigger = self._create_cron_trigger(config.cron_expression, config.timezone)
            elif config.schedule_type == "interval":
                trigger = IntervalTrigger(
                    hours=config.interval_hours,
                    timezone=config.timezone
                )
            else:
                raise ValueError(f"Invalid schedule_type: {config.schedule_type}")

            # Add job to scheduler
            job_id = f"scoring_{schedule_id}"
            self.scheduler.add_job(
                func=self._execute_scoring_job,
                trigger=trigger,
                args=[config],
                id=job_id,
                name=f"Automated scoring for store {config.store_id}",
                misfire_grace_time=300,  # 5 minutes grace time
                coalesce=True,  # Combine missed executions
                replace_existing=True
            )

            # Store configuration
            self.active_schedules[schedule_id] = config

            self.logger.info(
                "Scoring schedule added successfully",
                schedule_id=schedule_id,
                store_id=config.store_id,
                schedule_type=config.schedule_type,
                cron_expression=config.cron_expression if config.schedule_type == "cron" else None,
                interval_hours=config.interval_hours if config.schedule_type == "interval" else None
            )

            return schedule_id

        except Exception as e:
            self.logger.error(
                "Failed to add scoring schedule",
                schedule_id=config.schedule_id,
                store_id=config.store_id,
                error=str(e)
            )
            raise

    async def remove_scoring_schedule(self, schedule_id: str) -> bool:
        """
        Remove an automated scoring schedule

        Args:
            schedule_id: Schedule ID to remove

        Returns:
            True if removed successfully
        """
        try:
            job_id = f"scoring_{schedule_id}"

            # Remove from scheduler
            if self.scheduler.get_job(job_id):
                self.scheduler.remove_job(job_id)

            # Remove from active schedules
            if schedule_id in self.active_schedules:
                config = self.active_schedules.pop(schedule_id)

                self.logger.info(
                    "Scoring schedule removed successfully",
                    schedule_id=schedule_id,
                    store_id=config.store_id
                )
                return True

            return False

        except Exception as e:
            self.logger.error(
                "Failed to remove scoring schedule",
                schedule_id=schedule_id,
                error=str(e)
            )
            return False

    async def update_scoring_schedule(self, schedule_id: str, config: ScoringScheduleConfig) -> bool:
        """
        Update an existing scoring schedule

        Args:
            schedule_id: Schedule ID to update
            config: New configuration

        Returns:
            True if updated successfully
        """
        try:
            # Ensure schedule ID matches
            config.schedule_id = schedule_id

            # Remove and re-add with new configuration
            await self.remove_scoring_schedule(schedule_id)
            await self.add_scoring_schedule(config)

            self.logger.info(
                "Scoring schedule updated successfully",
                schedule_id=schedule_id,
                store_id=config.store_id
            )

            return True

        except Exception as e:
            self.logger.error(
                "Failed to update scoring schedule",
                schedule_id=schedule_id,
                error=str(e)
            )
            return False

    async def get_schedule_status(self, schedule_id: str) -> Optional[Dict[str, Any]]:
        """
        Get status of a scoring schedule

        Args:
            schedule_id: Schedule ID

        Returns:
            Status information or None if not found
        """
        try:
            if schedule_id not in self.active_schedules:
                return None

            config = self.active_schedules[schedule_id]
            job_id = f"scoring_{schedule_id}"
            job = self.scheduler.get_job(job_id)

            # Get recent job results
            recent_results = [
                result for result in self.job_results.values()
                if result.schedule_id == schedule_id
            ]
            recent_results.sort(key=lambda x: x.started_at, reverse=True)
            recent_results = recent_results[:5]  # Last 5 executions

            status = {
                "schedule_id": schedule_id,
                "store_id": config.store_id,
                "enabled": config.enabled,
                "schedule_type": config.schedule_type,
                "cron_expression": config.cron_expression,
                "interval_hours": config.interval_hours,
                "timezone": config.timezone,
                "next_run_time": job.next_run_time.isoformat() if job and job.next_run_time else None,
                "recent_executions": [
                    {
                        "job_id": result.job_id,
                        "started_at": result.started_at.isoformat(),
                        "completed_at": result.completed_at.isoformat() if result.completed_at else None,
                        "status": result.status,
                        "processed_items": result.processed_items,
                        "processing_time_ms": result.processing_time_ms,
                        "items_per_second": result.items_per_second,
                        "error_message": result.error_message
                    }
                    for result in recent_results
                ]
            }

            return status

        except Exception as e:
            self.logger.error(
                "Failed to get schedule status",
                schedule_id=schedule_id,
                error=str(e)
            )
            return None

    async def list_active_schedules(self) -> List[Dict[str, Any]]:
        """
        List all active scoring schedules

        Returns:
            List of schedule status information
        """
        schedules = []

        for schedule_id in self.active_schedules.keys():
            status = await self.get_schedule_status(schedule_id)
            if status:
                schedules.append(status)

        return schedules

    async def trigger_immediate_scoring(self, store_id: str, force_recalculate: bool = False) -> str:
        """
        Trigger immediate scoring for a store (outside of schedule)

        Args:
            store_id: Store ID to score
            force_recalculate: Whether to force recalculation

        Returns:
            Job ID for tracking
        """
        try:
            # Create temporary configuration
            config = ScoringScheduleConfig(
                store_id=store_id,
                force_recalculate=force_recalculate,
                schedule_type="immediate"
            )

            # Execute immediately
            job_id = f"immediate_{uuid.uuid4()}"

            # Run in background task
            asyncio.create_task(self._execute_scoring_job_with_id(config, job_id))

            self.logger.info(
                "Immediate scoring triggered",
                store_id=store_id,
                job_id=job_id,
                force_recalculate=force_recalculate
            )

            return job_id

        except Exception as e:
            self.logger.error(
                "Failed to trigger immediate scoring",
                store_id=store_id,
                error=str(e)
            )
            raise

    async def get_job_result(self, job_id: str) -> Optional[ScoringJobResult]:
        """
        Get result of a scoring job

        Args:
            job_id: Job ID

        Returns:
            Job result or None if not found
        """
        return self.job_results.get(job_id)

    def _create_cron_trigger(self, cron_expression: str, timezone: str = "UTC") -> CronTrigger:
        """Create cron trigger from expression"""
        try:
            parts = cron_expression.strip().split()
            if len(parts) != 5:
                raise ValueError("Cron expression must have 5 parts: minute hour day month day_of_week")

            minute, hour, day, month, day_of_week = parts

            return CronTrigger(
                minute=minute,
                hour=hour,
                day=day,
                month=month,
                day_of_week=day_of_week,
                timezone=timezone
            )

        except Exception as e:
            self.logger.error(
                "Failed to create cron trigger",
                cron_expression=cron_expression,
                error=str(e)
            )
            raise ValueError(f"Invalid cron expression: {cron_expression}")

    async def _execute_scoring_job(self, config: ScoringScheduleConfig):
        """Execute a scoring job"""
        job_id = f"job_{uuid.uuid4()}"
        await self._execute_scoring_job_with_id(config, job_id)

    async def _execute_scoring_job_with_id(self, config: ScoringScheduleConfig, job_id: str):
        """Execute a scoring job with specific ID"""
        result = ScoringJobResult(
            job_id=job_id,
            schedule_id=config.schedule_id,
            store_id=config.store_id,
            started_at=datetime.utcnow()
        )

        # Store initial result
        self.job_results[job_id] = result

        self.logger.info(
            "Starting automated scoring job",
            job_id=job_id,
            schedule_id=config.schedule_id,
            store_id=config.store_id
        )

        try:
            # Create database session for this job
            async with get_async_session() as db:
                scoring_service = create_scoring_service(db)

                # Execute scoring with timeout
                scoring_result = await asyncio.wait_for(
                    scoring_service.score_store_inventory_bulk(
                        config.store_id,
                        recalculate_all=config.force_recalculate
                    ),
                    timeout=config.timeout_minutes * 60
                )

                # Update result with success data
                result.completed_at = datetime.utcnow()
                result.status = "completed"
                result.total_items = scoring_result.get("total_items", 0)
                result.processed_items = scoring_result.get("processed", 0)
                result.high_priority_count = scoring_result.get("high_priority_count", 0)
                result.processing_time_ms = scoring_result.get("processing_time_ms", 0)
                result.database_operations = scoring_result.get("database_operations", {})

                # Calculate performance metrics
                if result.processing_time_ms > 0:
                    result.items_per_second = (result.processed_items * 1000) / result.processing_time_ms

                self.logger.info(
                    "Automated scoring job completed successfully",
                    job_id=job_id,
                    schedule_id=config.schedule_id,
                    store_id=config.store_id,
                    processed_items=result.processed_items,
                    processing_time_ms=result.processing_time_ms,
                    items_per_second=result.items_per_second,
                    high_priority_count=result.high_priority_count
                )

        except asyncio.TimeoutError:
            result.completed_at = datetime.utcnow()
            result.status = "timeout"
            result.error_message = f"Scoring timed out after {config.timeout_minutes} minutes"

            self.logger.error(
                "Automated scoring job timed out",
                job_id=job_id,
                schedule_id=config.schedule_id,
                store_id=config.store_id,
                timeout_minutes=config.timeout_minutes
            )

        except Exception as e:
            result.completed_at = datetime.utcnow()
            result.status = "failed"
            result.error_message = str(e)

            self.logger.error(
                "Automated scoring job failed",
                job_id=job_id,
                schedule_id=config.schedule_id,
                store_id=config.store_id,
                error=str(e)
            )

            # Implement retry logic if configured
            if result.retry_count < config.max_retries:
                self.logger.info(
                    "Scheduling retry for failed scoring job",
                    job_id=job_id,
                    retry_count=result.retry_count + 1,
                    max_retries=config.max_retries
                )

                # Schedule retry after delay
                asyncio.create_task(
                    self._schedule_retry(config, job_id, result.retry_count + 1)
                )

        finally:
            # Update final result
            self.job_results[job_id] = result

            # Clean up old results (keep last 100 per schedule)
            await self._cleanup_old_results(config.schedule_id)

    async def _schedule_retry(self, config: ScoringScheduleConfig, original_job_id: str, retry_count: int):
        """Schedule a retry for a failed job"""
        try:
            # Wait for retry delay
            await asyncio.sleep(config.retry_delay_minutes * 60)

            # Create new job ID for retry
            retry_job_id = f"retry_{retry_count}_{original_job_id}"

            # Update retry count in result
            if original_job_id in self.job_results:
                self.job_results[original_job_id].retry_count = retry_count

            # Execute retry
            await self._execute_scoring_job_with_id(config, retry_job_id)

        except Exception as e:
            self.logger.error(
                "Failed to execute retry",
                original_job_id=original_job_id,
                retry_count=retry_count,
                error=str(e)
            )

    async def _cleanup_old_results(self, schedule_id: str):
        """Clean up old job results to prevent memory growth"""
        try:
            # Get results for this schedule
            schedule_results = [
                (job_id, result) for job_id, result in self.job_results.items()
                if result.schedule_id == schedule_id
            ]

            # Sort by start time (newest first)
            schedule_results.sort(key=lambda x: x[1].started_at, reverse=True)

            # Keep only the last 100 results
            if len(schedule_results) > 100:
                to_remove = schedule_results[100:]
                for job_id, _ in to_remove:
                    self.job_results.pop(job_id, None)

                self.logger.debug(
                    "Cleaned up old job results",
                    schedule_id=schedule_id,
                    removed_count=len(to_remove),
                    remaining_count=100
                )

        except Exception as e:
            self.logger.warning(
                "Failed to cleanup old results",
                schedule_id=schedule_id,
                error=str(e)
            )

    async def _load_default_schedules(self):
        """Load default scoring schedules for active stores"""
        try:
            # Check if automated scoring is enabled
            if not settings.enable_automated_scoring:
                self.logger.info("Automated scoring disabled in settings")
                return

            # Get default schedule configuration
            default_cron = settings.default_scoring_cron
            default_timezone = settings.default_scoring_timezone

            self.logger.info(
                "Default schedules loaded (implement store discovery as needed)",
                default_cron=default_cron,
                default_timezone=default_timezone
            )

            # TODO: Implement automatic discovery of active stores
            # and creation of default schedules if needed

        except Exception as e:
            self.logger.error("Failed to load default schedules", error=str(e))


# Global scheduler instance
_scheduler_instance: Optional[AutomatedScoringScheduler] = None


def get_automated_scoring_scheduler() -> AutomatedScoringScheduler:
    """Get the global automated scoring scheduler instance"""
    global _scheduler_instance

    if _scheduler_instance is None:
        _scheduler_instance = AutomatedScoringScheduler()

    return _scheduler_instance


async def initialize_automated_scoring():
    """Initialize the automated scoring system"""
    scheduler = get_automated_scoring_scheduler()
    await scheduler.start_scheduler()

    logger.info("Automated scoring system initialized successfully")


async def shutdown_automated_scoring():
    """Shutdown the automated scoring system"""
    global _scheduler_instance

    if _scheduler_instance:
        await _scheduler_instance.stop_scheduler()
        _scheduler_instance = None

    logger.info("Automated scoring system shutdown completed")