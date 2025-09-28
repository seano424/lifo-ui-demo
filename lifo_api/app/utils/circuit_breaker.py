"""
Circuit breaker pattern implementation for external service resilience
Prevents cascading failures when external services (like Google Vision API) are down
"""

import asyncio
import time
from enum import Enum
from typing import Any, Callable, Optional

import structlog

logger = structlog.get_logger()


class CircuitState(Enum):
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Blocking calls due to failures
    HALF_OPEN = "half_open"  # Testing if service has recovered


class CircuitBreakerError(Exception):
    """Raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """
    Circuit breaker implementation with configurable thresholds

    States:
    - CLOSED: Normal operation, calls pass through
    - OPEN: Failures exceeded threshold, calls fail fast
    - HALF_OPEN: Testing period to see if service recovered
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout_seconds: int = 60,
        expected_exception: type = Exception,
        success_threshold: int = 2
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout_seconds
        self.expected_exception = expected_exception
        self.success_threshold = success_threshold

        # State tracking
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = 0

        logger.info(
            "Circuit breaker initialized",
            failure_threshold=failure_threshold,
            recovery_timeout_seconds=recovery_timeout_seconds,
            success_threshold=success_threshold
        )

    def _should_attempt_reset(self) -> bool:
        """Check if we should attempt to reset from OPEN to HALF_OPEN"""
        return (
            self.state == CircuitState.OPEN and
            time.time() - self.last_failure_time >= self.recovery_timeout
        )

    def _record_success(self):
        """Record successful operation"""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self._reset()
        elif self.state == CircuitState.CLOSED:
            # Reset failure count on success
            self.failure_count = 0

    def _record_failure(self):
        """Record failed operation"""
        self.failure_count += 1
        self.last_failure_time = time.time()

        if self.state == CircuitState.HALF_OPEN:
            # Failed during testing, go back to OPEN
            self._trip()
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                self._trip()

    def _trip(self):
        """Trip the circuit breaker to OPEN state"""
        self.state = CircuitState.OPEN
        self.success_count = 0
        logger.warning(
            "Circuit breaker tripped to OPEN",
            failure_count=self.failure_count,
            failure_threshold=self.failure_threshold
        )

    def _reset(self):
        """Reset circuit breaker to CLOSED state"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        logger.info("Circuit breaker reset to CLOSED")

    def _attempt_reset(self):
        """Attempt to reset from OPEN to HALF_OPEN"""
        self.state = CircuitState.HALF_OPEN
        self.success_count = 0
        logger.info("Circuit breaker moved to HALF_OPEN for testing")

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""

        # Check if we should attempt reset
        if self._should_attempt_reset():
            self._attempt_reset()

        # Fail fast if circuit is open
        if self.state == CircuitState.OPEN:
            raise CircuitBreakerError(
                f"Circuit breaker is OPEN. Service unavailable for "
                f"{self.recovery_timeout - (time.time() - self.last_failure_time):.1f} more seconds"
            )

        try:
            # Execute the function
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)

            self._record_success()
            return result

        except self.expected_exception as e:
            self._record_failure()
            raise e
        except Exception as e:
            # Unexpected exceptions don't count as failures
            logger.warning(
                "Unexpected exception in circuit breaker",
                error=str(e),
                error_type=type(e).__name__
            )
            raise e

    def get_stats(self) -> dict[str, Any]:
        """Get circuit breaker statistics"""
        return {
            'state': self.state.value,
            'failure_count': self.failure_count,
            'success_count': self.success_count,
            'failure_threshold': self.failure_threshold,
            'recovery_timeout_seconds': self.recovery_timeout,
            'last_failure_time': self.last_failure_time,
            'time_until_retry': max(0, self.recovery_timeout - (time.time() - self.last_failure_time))
            if self.state == CircuitState.OPEN else 0
        }


# Global circuit breakers for different services
_vision_api_breaker: Optional[CircuitBreaker] = None


def get_vision_api_breaker() -> CircuitBreaker:
    """Get or create the Google Vision API circuit breaker"""
    global _vision_api_breaker
    if _vision_api_breaker is None:
        _vision_api_breaker = CircuitBreaker(
            failure_threshold=5,     # Allow 5 failures before opening
            recovery_timeout_seconds=60,  # Wait 1 minute before testing
            expected_exception=Exception,  # Count all exceptions as failures
            success_threshold=2      # Need 2 successes to close circuit
        )
    return _vision_api_breaker


def get_circuit_breaker_stats() -> dict[str, Any]:
    """Get all circuit breaker statistics"""
    stats = {}

    if _vision_api_breaker is not None:
        stats['vision_api'] = _vision_api_breaker.get_stats()

    return stats