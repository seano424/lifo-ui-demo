"""
Logging utilities for LIFO.AI Demo
"""

import logging
import sys
from datetime import datetime
from typing import Optional


def setup_logger(name: str = "lifo_ai_demo", level: str = "INFO") -> logging.Logger:
    """
    Set up a logger for the demo
    
    Args:
        name: Logger name
        level: Logging level
        
    Returns:
        Configured logger
    """
    
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, level.upper()))
    
    # Remove existing handlers
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper()))
    
    # Create formatter
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(formatter)
    
    # Add handler to logger
    logger.addHandler(console_handler)
    
    return logger


def log_processing_stats(logger: logging.Logger, stats: dict):
    """
    Log processing statistics
    
    Args:
        logger: Logger instance
        stats: Statistics dictionary
    """
    logger.info("Processing Statistics:")
    logger.info(f"  Total rows processed: {stats.get('total_rows', 0)}")
    logger.info(f"  Successful rows: {stats.get('successful_rows', 0)}")
    logger.info(f"  Failed rows: {stats.get('failed_rows', 0)}")
    logger.info(f"  Success rate: {stats.get('success_rate', 0):.1f}%")
    logger.info(f"  Warnings: {len(stats.get('warnings', []))}")
    logger.info(f"  Errors: {len(stats.get('errors', []))}")


def log_scoring_results(logger: logging.Logger, results: list):
    """
    Log scoring results summary
    
    Args:
        logger: Logger instance
        results: List of scoring results
    """
    if not results:
        logger.warning("No scoring results to log")
        return
    
    # Calculate summary statistics
    total_items = len(results)
    urgent_items = sum(1 for r in results if r.get('composite_score', 0) >= 0.8)
    high_priority = sum(1 for r in results if 0.6 <= r.get('composite_score', 0) < 0.8)
    medium_priority = sum(1 for r in results if 0.4 <= r.get('composite_score', 0) < 0.6)
    low_priority = sum(1 for r in results if r.get('composite_score', 0) < 0.4)
    
    logger.info("Scoring Results Summary:")
    logger.info(f"  Total items scored: {total_items}")
    logger.info(f"  Urgent (≥0.8): {urgent_items}")
    logger.info(f"  High Priority (0.6-0.8): {high_priority}")
    logger.info(f"  Medium Priority (0.4-0.6): {medium_priority}")
    logger.info(f"  Low Priority (<0.4): {low_priority}")
    
    # Show top urgent items
    urgent_results = [r for r in results if r.get('composite_score', 0) >= 0.8]
    if urgent_results:
        logger.warning(f"⚠️  {len(urgent_results)} items require urgent attention:")
        for item in urgent_results[:5]:  # Show top 5
            logger.warning(f"    {item.get('sku', 'N/A')}: {item.get('product_name', 'N/A')} (Score: {item.get('composite_score', 0):.2f})")