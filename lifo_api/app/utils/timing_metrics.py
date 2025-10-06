"""
Comprehensive timing and performance metrics for CSV upload and processing
Provides detailed, production-ready performance monitoring
"""

import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

import structlog

logger = structlog.get_logger()


@dataclass
class TimingMetrics:
    """Detailed timing metrics for CSV processing stages"""
    
    # Core timing metrics (in milliseconds)
    file_upload_ms: float = 0.0
    security_validation_ms: float = 0.0
    csv_parsing_ms: float = 0.0
    data_validation_ms: float = 0.0
    duplicate_detection_ms: float = 0.0
    product_resolution_ms: float = 0.0
    batch_creation_ms: float = 0.0
    batch_insertion_ms: float = 0.0
    database_operations_ms: float = 0.0
    total_processing_ms: float = 0.0
    
    # Chunk processing metrics
    chunk_timings: list[float] = field(default_factory=list)
    
    # Performance indicators
    items_processed: int = 0
    items_per_second: float = 0.0
    memory_usage_mb: float | None = None
    
    # Detailed sub-metrics
    sub_timings: dict[str, float] = field(default_factory=dict)
    
    # Threshold warnings
    slow_operations: list[dict[str, Any]] = field(default_factory=list)
    
    def calculate_throughput(self):
        """Calculate items per second throughput"""
        if self.total_processing_ms > 0:
            self.items_per_second = (self.items_processed / self.total_processing_ms) * 1000
        return self.items_per_second
    
    def add_slow_operation(self, operation: str, duration_ms: float, threshold_ms: float = 100):
        """Track operations that exceed performance thresholds"""
        if duration_ms > threshold_ms:
            self.slow_operations.append({
                "operation": operation,
                "duration_ms": duration_ms,
                "threshold_ms": threshold_ms,
                "exceeded_by_ms": duration_ms - threshold_ms,
                "timestamp": datetime.utcnow().isoformat()
            })
    
    def to_dict(self) -> dict[str, Any]:
        """Convert metrics to dictionary for API response"""
        return {
            "file_upload_ms": round(self.file_upload_ms, 2),
            "security_validation_ms": round(self.security_validation_ms, 2),
            "csv_parsing_ms": round(self.csv_parsing_ms, 2),
            "data_validation_ms": round(self.data_validation_ms, 2),
            "duplicate_detection_ms": round(self.duplicate_detection_ms, 2),
            "product_resolution_ms": round(self.product_resolution_ms, 2),
            "batch_creation_ms": round(self.batch_creation_ms, 2),
            "batch_insertion_ms": round(self.batch_insertion_ms, 2),
            "database_operations_ms": round(self.database_operations_ms, 2),
            "total_processing_ms": round(self.total_processing_ms, 2),
            "items_processed": self.items_processed,
            "items_per_second": round(self.items_per_second, 2),
            "memory_usage_mb": round(self.memory_usage_mb, 2) if self.memory_usage_mb else None,
            "chunk_count": len(self.chunk_timings),
            "avg_chunk_time_ms": round(sum(self.chunk_timings) / len(self.chunk_timings), 2) if self.chunk_timings else 0,
            "slow_operations_count": len(self.slow_operations),
            "sub_timings": {k: round(v, 2) for k, v in self.sub_timings.items()}
        }
    
    def log_summary(self, operation: str = "CSV Processing"):
        """Log comprehensive timing summary"""
        logger.info(
            f"{operation} Performance Summary",
            total_ms=round(self.total_processing_ms, 2),
            items_processed=self.items_processed,
            items_per_second=round(self.items_per_second, 2),
            file_upload_ms=round(self.file_upload_ms, 2),
            csv_parsing_ms=round(self.csv_parsing_ms, 2),
            product_resolution_ms=round(self.product_resolution_ms, 2),
            batch_creation_ms=round(self.batch_creation_ms, 2),
            database_ms=round(self.database_operations_ms, 2),
            slow_operations=len(self.slow_operations)
        )
        
        # Log slow operations if any
        if self.slow_operations:
            for slow_op in self.slow_operations[:5]:  # Log first 5 slow operations
                logger.warning(
                    "Slow operation detected",
                    operation=slow_op["operation"],
                    duration_ms=slow_op["duration_ms"],
                    threshold_ms=slow_op["threshold_ms"]
                )


class PerformanceTimer:
    """High-precision performance timer with context manager support"""
    
    def __init__(self, metrics: TimingMetrics | None = None):
        self.metrics = metrics or TimingMetrics()
        self.timers: dict[str, float] = {}
        self.active_timers: dict[str, float] = {}
    
    @contextmanager
    def measure(self, operation: str, threshold_ms: float = 100):
        """Context manager for measuring operation duration"""
        start_time = time.perf_counter()
        
        try:
            yield self
        finally:
            end_time = time.perf_counter()
            duration_ms = (end_time - start_time) * 1000
            
            # Store timing
            self.timers[operation] = duration_ms
            
            # Update metrics object if specific fields exist
            metric_field = f"{operation.replace(' ', '_').lower()}_ms"
            if hasattr(self.metrics, metric_field):
                setattr(self.metrics, metric_field, duration_ms)
            else:
                # Store in sub_timings for custom operations
                self.metrics.sub_timings[operation] = duration_ms
            
            # Track slow operations
            self.metrics.add_slow_operation(operation, duration_ms, threshold_ms)
            
            # Log if significant duration
            if duration_ms > 50:  # Log operations over 50ms
                logger.debug(
                    f"Operation timing: {operation}",
                    duration_ms=round(duration_ms, 2)
                )
    
    def start_timer(self, operation: str):
        """Start a named timer"""
        self.active_timers[operation] = time.perf_counter()
    
    def stop_timer(self, operation: str) -> float:
        """Stop a named timer and return duration in milliseconds"""
        if operation not in self.active_timers:
            logger.warning(f"Timer '{operation}' was not started")
            return 0.0
        
        start_time = self.active_timers.pop(operation)
        duration_ms = (time.perf_counter() - start_time) * 1000
        
        # Store timing
        self.timers[operation] = duration_ms
        
        # Update metrics
        metric_field = f"{operation.replace(' ', '_').lower()}_ms"
        if hasattr(self.metrics, metric_field):
            setattr(self.metrics, metric_field, duration_ms)
        else:
            self.metrics.sub_timings[operation] = duration_ms
        
        return duration_ms
    
    def get_timing(self, operation: str) -> float | None:
        """Get timing for a specific operation"""
        return self.timers.get(operation)
    
    def calculate_total(self):
        """Calculate total processing time from all operations"""
        self.metrics.total_processing_ms = sum(self.timers.values())
        return self.metrics.total_processing_ms


class CSVProcessingTimer(PerformanceTimer):
    """Specialized timer for CSV processing with stage tracking"""
    
    def __init__(self):
        super().__init__(TimingMetrics())
        self.stage_start_times: dict[str, float] = {}
        self.stage_order: list[str] = []
    
    def start_stage(self, stage: str):
        """Start timing a processing stage"""
        self.stage_start_times[stage] = time.perf_counter()
        self.stage_order.append(stage)
        logger.debug(f"Started stage: {stage}")
    
    def end_stage(self, stage: str) -> float:
        """End timing a processing stage and return duration"""
        if stage not in self.stage_start_times:
            logger.warning(f"Stage '{stage}' was not started")
            return 0.0
        
        duration_ms = (time.perf_counter() - self.stage_start_times[stage]) * 1000
        del self.stage_start_times[stage]
        
        # Map common stage names to metric fields
        stage_mapping = {
            "file_upload": "file_upload_ms",
            "security_validation": "security_validation_ms",
            "csv_parsing": "csv_parsing_ms",
            "data_validation": "data_validation_ms",
            "duplicate_detection": "duplicate_detection_ms",
            "product_resolution": "product_resolution_ms",
            "batch_creation": "batch_creation_ms",
            "batch_insertion": "batch_insertion_ms",
            "database_operations": "database_operations_ms"
        }
        
        metric_field = stage_mapping.get(stage, None)
        if metric_field and hasattr(self.metrics, metric_field):
            setattr(self.metrics, metric_field, duration_ms)
        else:
            self.metrics.sub_timings[stage] = duration_ms
        
        # Track slow stages
        self.metrics.add_slow_operation(stage, duration_ms, threshold_ms=200)
        
        logger.info(
            f"Completed stage: {stage}",
            duration_ms=round(duration_ms, 2)
        )
        
        return duration_ms
    
    def record_chunk_timing(self, chunk_index: int, duration_ms: float):
        """Record timing for a processing chunk"""
        self.metrics.chunk_timings.append(duration_ms)
        
        if duration_ms > 500:  # Warn if chunk takes over 500ms
            logger.warning(
                "Slow chunk processing",
                chunk_index=chunk_index,
                duration_ms=round(duration_ms, 2)
            )
    
    def get_stage_summary(self) -> dict[str, Any]:
        """Get summary of all stages with timing breakdown"""
        total_ms = self.metrics.total_processing_ms or sum(self.metrics.sub_timings.values())
        
        stages = {}
        for stage in self.stage_order:
            stage_ms = self.metrics.sub_timings.get(stage, 0)
            if stage_ms > 0:
                stages[stage] = {
                    "duration_ms": round(stage_ms, 2),
                    "percentage": round((stage_ms / total_ms) * 100, 1) if total_ms > 0 else 0
                }
        
        return {
            "total_ms": round(total_ms, 2),
            "stages": stages,
            "stage_count": len(stages),
            "slowest_stage": max(stages.items(), key=lambda x: x[1]["duration_ms"])[0] if stages else None
        }


def measure_async_operation(operation_name: str):
    """Decorator for measuring async operations with automatic logging"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            timer = PerformanceTimer()
            
            with timer.measure(operation_name):
                result = await func(*args, **kwargs)
            
            duration_ms = timer.get_timing(operation_name)
            
            # Log operation timing
            logger.info(
                f"Async operation completed: {operation_name}",
                duration_ms=round(duration_ms, 2) if duration_ms else 0
            )
            
            # Add timing to result if it's a dict
            if isinstance(result, dict):
                if "performance_metrics" not in result:
                    result["performance_metrics"] = {}
                result["performance_metrics"][f"{operation_name}_ms"] = round(duration_ms, 2) if duration_ms else 0
            
            return result
        
        return wrapper
    return decorator


def get_memory_usage_mb() -> float:
    """Get current memory usage in MB"""
    try:
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        memory_info = process.memory_info()
        return memory_info.rss / 1024 / 1024  # Convert to MB
    except ImportError:
        return 0.0


class PerformanceMonitor:
    """Monitor performance across multiple operations"""
    
    def __init__(self):
        self.operations: dict[str, list[float]] = {}
        self.thresholds: dict[str, float] = {
            "csv_upload": 500,
            "batch_creation": 1000,
            "product_resolution": 200,
            "duplicate_detection": 100
        }
    
    def record(self, operation: str, duration_ms: float):
        """Record operation timing"""
        if operation not in self.operations:
            self.operations[operation] = []
        self.operations[operation].append(duration_ms)
        
        # Check threshold
        threshold = self.thresholds.get(operation, 500)
        if duration_ms > threshold:
            logger.warning(
                "Operation exceeded threshold",
                operation=operation,
                duration_ms=round(duration_ms, 2),
                threshold_ms=threshold
            )
    
    def get_statistics(self, operation: str) -> dict[str, float]:
        """Get statistics for an operation"""
        if operation not in self.operations or not self.operations[operation]:
            return {}
        
        timings = self.operations[operation]
        return {
            "count": len(timings),
            "avg_ms": round(sum(timings) / len(timings), 2),
            "min_ms": round(min(timings), 2),
            "max_ms": round(max(timings), 2),
            "total_ms": round(sum(timings), 2)
        }
    
    def get_all_statistics(self) -> dict[str, Any]:
        """Get statistics for all operations"""
        return {
            op: self.get_statistics(op)
            for op in self.operations
        }


# Global performance monitor instance
global_performance_monitor = PerformanceMonitor()