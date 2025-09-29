"""
Simple circuit breaker implementation for external API calls
"""
import asyncio
from typing import Any, Callable


class CircuitBreakerError(Exception):
    """Exception raised when circuit breaker is open"""
    pass


class CircuitBreaker:
    """Simple circuit breaker implementation"""

    def __init__(self, name: str = "default"):
        self.name = name
        self.is_open = False

    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function through circuit breaker"""
        if self.is_open:
            raise CircuitBreakerError(f"Circuit breaker {self.name} is open")

        try:
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                return func(*args, **kwargs)
        except Exception as e:
            # In a real implementation, we'd track failures and open the circuit
            raise e


def get_vision_api_breaker() -> CircuitBreaker:
    """Get circuit breaker for Vision API"""
    return CircuitBreaker("vision_api")