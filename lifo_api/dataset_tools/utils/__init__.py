"""Utility modules for dataset tools."""

from .logging_utils import setup_logger, get_logger
from .image_utils import validate_image, get_image_metadata, resize_image
from .progress_utils import ProgressTracker
from .validation_utils import validate_product_data, validate_image_quality

def extract_language_info(text: str) -> dict:
    """Extract language information from text."""
    # Simple language detection based on common words
    language_indicators = {
        'french': ['le', 'la', 'du', 'de', 'à', 'consommer', 'avant'],
        'german': ['der', 'die', 'das', 'bis', 'mindestens', 'haltbar'],
        'spanish': ['el', 'la', 'del', 'de', 'antes', 'fecha'],
        'italian': ['il', 'la', 'del', 'di', 'entro', 'scade'],
        'english': ['best', 'before', 'use', 'by', 'expiry', 'expires']
    }

    text_lower = text.lower()
    language_scores = {}

    for language, indicators in language_indicators.items():
        score = sum(1 for indicator in indicators if indicator in text_lower)
        if score > 0:
            language_scores[language] = score

    if language_scores:
        detected_language = max(language_scores.keys(), key=lambda k: language_scores[k])
        confidence = language_scores[detected_language] / len(language_indicators[detected_language])
    else:
        detected_language = 'unknown'
        confidence = 0.0

    return {
        'language': detected_language,
        'confidence': confidence,
        'all_scores': language_scores
    }

__all__ = [
    "setup_logger", "get_logger", "validate_image", "get_image_metadata",
    "resize_image", "ProgressTracker", "validate_product_data", "validate_image_quality",
    "extract_language_info"
]