"""
Shared utility functions for API endpoints
Reduces code duplication across the LIFO.AI API
"""

from typing import Any, Dict
import structlog
from fastapi import HTTPException


logger = structlog.get_logger()


def validate_store_id_format(store_id: str) -> str:
    """
    Centralized store ID validation
    Used across multiple endpoints to ensure consistent validation
    """
    if not store_id or len(store_id.strip()) == 0:
        raise HTTPException(status_code=400, detail="Store ID cannot be empty")

    # Additional validation can be added here
    return store_id.strip()


def validate_batch_id_format(batch_id: str) -> str:
    """
    Centralized batch ID validation
    Used across multiple endpoints to ensure consistent validation
    """
    if not batch_id or len(batch_id.strip()) == 0:
        raise HTTPException(status_code=400, detail="Batch ID cannot be empty")

    return batch_id.strip()


def handle_not_found_error(resource: str, resource_id: str) -> HTTPException:
    """
    Standardized not found error response
    """
    return HTTPException(
        status_code=404, detail=f"{resource} with ID '{resource_id}' not found"
    )


def handle_validation_error(field: str, message: str) -> HTTPException:
    """
    Standardized validation error response
    """
    return HTTPException(
        status_code=400,
        detail={"field": field, "message": message, "error_type": "validation_error"},
    )


def handle_operation_error(
    operation: str, error: Exception, user_id: str = None
) -> HTTPException:
    """
    Standardized operation error handling with logging
    """
    error_msg = f"{operation} failed: {str(error)}"

    logger.error(
        f"{operation} failed", error=str(error), user_id=user_id, operation=operation
    )

    raise HTTPException(status_code=500, detail=error_msg) from error


def log_operation_metrics(
    operation: str,
    duration_ms: float,
    user_id: str = None,
    store_id: str = None,
    success: bool = True,
) -> None:
    """
    Centralized operation metrics logging
    """
    logger.info(
        f"{operation} completed",
        operation=operation,
        duration_ms=duration_ms,
        user_id=user_id,
        store_id=store_id,
        success=success,
    )


def format_mobile_response(
    data: Dict[str, Any], processing_time_ms: float
) -> Dict[str, Any]:
    """
    Standardized mobile response formatting with performance metadata
    """
    mobile_target_met = processing_time_ms <= 300  # 300ms mobile target

    return {
        "data": data,
        "mobile_optimized": True,
        "performance": {
            "processing_time_ms": processing_time_ms,
            "target_met": mobile_target_met,
            "target_threshold_ms": 300,
        },
        "timestamp": structlog.get_logger().bind().info.__self__.time(),
    }


def calculate_urgency_score(
    days_to_expiry: int, quantity: int = None, urgency_type: str = "standard"
) -> float:
    """
    Centralized urgency calculation logic
    Consolidates 4+ similar urgency functions found across endpoints
    """
    if days_to_expiry < 0:
        return 100.0  # Expired
    elif days_to_expiry == 0:
        return 95.0  # Expires today
    elif days_to_expiry == 1:
        return 85.0  # Expires tomorrow
    elif days_to_expiry <= 3:
        return 70.0  # Expires soon
    elif days_to_expiry <= 7:
        return 50.0  # Expires this week
    elif days_to_expiry <= 14:
        return 30.0  # Expires in 2 weeks
    else:
        return 10.0  # Expires later

    # Quantity multiplier for urgent cases
    if urgency_type == "quantity_aware" and quantity and days_to_expiry <= 3:
        multiplier = min(1.2, 1.0 + (quantity / 100))  # Cap at 20% increase
        return min(100.0, calculate_urgency_score(days_to_expiry) * multiplier)

    return calculate_urgency_score(days_to_expiry)


class CommonEndpointDeps:
    """
    Common dependency injection for endpoints
    Reduces repetitive dependency patterns
    """

    def __init__(self, store_id: str = None, batch_id: str = None):
        self.store_id = validate_store_id_format(store_id) if store_id else None
        self.batch_id = validate_batch_id_format(batch_id) if batch_id else None
