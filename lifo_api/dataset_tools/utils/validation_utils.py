"""
Data validation utilities for dataset quality control.
"""

import re
from pathlib import Path
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


def validate_product_data(
    product: Dict[str, Any], required_fields: List[str]
) -> Tuple[bool, List[str]]:
    """
    Validate product data for completeness and quality.

    Args:
        product: Product data dictionary
        required_fields: List of required field names

    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []

    # Check required fields
    for field in required_fields:
        if field not in product or not product[field]:
            issues.append(f"Missing required field: {field}")

    # Validate product name
    if "product_name" in product:
        name = product["product_name"]
        if len(name) < 2:
            issues.append("Product name too short")
        if len(name) > 200:
            issues.append("Product name too long")

    # Validate barcode/code
    if "code" in product:
        code = str(product["code"])
        if not re.match(r"^\d{8,14}$", code):
            issues.append("Invalid barcode format (should be 8-14 digits)")

    # Validate expiration date format
    if "expiration_date" in product and product["expiration_date"]:
        if not _is_valid_date_format(product["expiration_date"]):
            issues.append("Invalid expiration date format")

    # Validate image URLs
    for url_field in ["image_url", "image_front_url", "image_ingredients_url"]:
        if url_field in product and product[url_field]:
            if not _is_valid_url(product[url_field]):
                issues.append(f"Invalid URL format: {url_field}")

    return len(issues) == 0, issues


def validate_image_quality(
    image_path: Path, min_width: int = 300, min_height: int = 300, max_size_mb: int = 10
) -> Tuple[bool, List[str]]:
    """
    Validate image quality for OCR suitability.

    Args:
        image_path: Path to image file
        min_width: Minimum acceptable width
        min_height: Minimum acceptable height
        max_size_mb: Maximum file size in MB

    Returns:
        Tuple of (is_valid, list_of_issues)
    """
    issues = []

    if not image_path.exists():
        issues.append("Image file does not exist")
        return False, issues

    # Check file size
    size_mb = image_path.stat().st_size / (1024 * 1024)
    if size_mb > max_size_mb:
        issues.append(f"Image too large: {size_mb:.1f}MB > {max_size_mb}MB")

    # Check file extension
    valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
    if image_path.suffix.lower() not in valid_extensions:
        issues.append(f"Invalid image format: {image_path.suffix}")

    try:
        from PIL import Image

        with Image.open(image_path) as img:
            width, height = img.size

            # Check dimensions
            if width < min_width:
                issues.append(f"Image width too small: {width} < {min_width}")
            if height < min_height:
                issues.append(f"Image height too small: {height} < {min_height}")

            # Check aspect ratio (avoid extremely narrow images)
            aspect_ratio = width / height
            if aspect_ratio < 0.2 or aspect_ratio > 5.0:
                issues.append(f"Extreme aspect ratio: {aspect_ratio:.2f}")

    except Exception as e:
        issues.append(f"Cannot open image: {e}")

    return len(issues) == 0, issues


def _is_valid_date_format(date_string: str) -> bool:
    """Check if date string is in a valid format."""
    date_patterns = [
        r"^\d{4}-\d{2}-\d{2}$",  # YYYY-MM-DD
        r"^\d{2}/\d{2}/\d{4}$",  # DD/MM/YYYY
        r"^\d{2}-\d{2}-\d{4}$",  # DD-MM-YYYY
        r"^\d{2}\.\d{2}\.\d{4}$",  # DD.MM.YYYY
    ]

    for pattern in date_patterns:
        if re.match(pattern, date_string):
            try:
                # Try to parse the date to ensure it's valid
                if "-" in date_string and len(date_string) == 10:
                    datetime.strptime(date_string, "%Y-%m-%d")
                elif "/" in date_string:
                    datetime.strptime(date_string, "%d/%m/%Y")
                elif "-" in date_string:
                    datetime.strptime(date_string, "%d-%m-%Y")
                elif "." in date_string:
                    datetime.strptime(date_string, "%d.%m.%Y")
                return True
            except ValueError:
                continue

    return False


def _is_valid_url(url: str) -> bool:
    """Check if URL is in a valid format."""
    url_pattern = re.compile(
        r"^https?://"  # http:// or https://
        r"(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|"  # domain...
        r"localhost|"  # localhost...
        r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})"  # ...or ip
        r"(?::\d+)?"  # optional port
        r"(?:/?|[/?]\S+)$",
        re.IGNORECASE,
    )

    return url_pattern.match(url) is not None


def extract_language_info(text: str) -> Dict[str, Any]:
    """
    Extract language information from text.

    Args:
        text: Text to analyze

    Returns:
        Dictionary with language analysis results
    """
    # Simple heuristic-based language detection
    # In production, you might want to use langdetect or similar

    # Character frequency analysis for European languages
    language_patterns = {
        "french": [r"[àâäéèêëïîôöùûüÿç]", r"\b(le|la|les|de|du|des|et|ou|un|une)\b"],
        "german": [r"[äöüß]", r"\b(der|die|das|und|oder|ein|eine|mit|von)\b"],
        "italian": [r"[àèéìíîòóùú]", r"\b(il|la|le|di|da|in|con|per|un|una)\b"],
        "spanish": [r"[áéíóúñü¿¡]", r"\b(el|la|los|las|de|del|en|con|por|un|una)\b"],
        "english": [r"\b(the|and|or|of|in|to|for|with|a|an)\b"],
    }

    detected_languages = []
    text_lower = text.lower()

    for lang, patterns in language_patterns.items():
        score = 0
        for pattern in patterns:
            matches = len(re.findall(pattern, text_lower, re.IGNORECASE))
            score += matches

        if score > 0:
            detected_languages.append((lang, score))

    # Sort by score
    detected_languages.sort(key=lambda x: x[1], reverse=True)

    return {
        "detected_languages": detected_languages,
        "primary_language": detected_languages[0][0]
        if detected_languages
        else "unknown",
        "text_length": len(text),
        "has_special_chars": bool(re.search(r"[^\w\s]", text)),
        "has_numbers": bool(re.search(r"\d", text)),
    }
