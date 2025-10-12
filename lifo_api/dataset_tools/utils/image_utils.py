"""
Image processing and validation utilities.
"""

from pathlib import Path
from typing import Dict, Any
import numpy as np
from PIL import Image, ExifTags
import logging

# Import OpenCV with fallback handling
try:
    from app.core.opencv_fallback import (
        safe_cv2_import,
        safe_laplacian_variance,
        safe_rgb_to_grayscale,
    )
except ImportError:
    # Fallback for when running outside main app context
    def safe_cv2_import():
        try:
            import cv2

            return cv2
        except ImportError:
            return None

    def safe_laplacian_variance(gray_image):
        cv2 = safe_cv2_import()
        if cv2:
            return float(cv2.Laplacian(gray_image, cv2.CV_64F).var())
        # Basic fallback
        kernel = np.array([[0, 1, 0], [1, -4, 1], [0, 1, 0]], dtype=np.float64)
        from scipy import ndimage

        laplacian = ndimage.convolve(gray_image.astype(np.float64), kernel)
        return float(np.var(laplacian))

    def safe_rgb_to_grayscale(rgb_image):
        if len(rgb_image.shape) == 2:
            return rgb_image
        return np.dot(rgb_image[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)


logger = logging.getLogger(__name__)


def validate_image(
    image_path: Path, min_width: int = 300, min_height: int = 300
) -> bool:
    """
    Validate image file for basic quality requirements.

    Args:
        image_path: Path to image file
        min_width: Minimum acceptable width
        min_height: Minimum acceptable height

    Returns:
        True if image meets requirements
    """
    try:
        with Image.open(image_path) as img:
            width, height = img.size

            # Check dimensions
            if width < min_width or height < min_height:
                logger.debug(f"Image {image_path} too small: {width}x{height}")
                return False

            # Check if image can be processed
            img.verify()
            return True

    except Exception as e:
        logger.warning(f"Invalid image {image_path}: {e}")
        return False


def get_image_metadata(image_path: Path) -> Dict[str, Any]:
    """
    Extract metadata from image file.

    Args:
        image_path: Path to image file

    Returns:
        Dictionary containing image metadata
    """
    metadata = {
        "path": str(image_path),
        "size_bytes": 0,
        "width": 0,
        "height": 0,
        "format": None,
        "mode": None,
        "has_exif": False,
        "exif_data": {},
    }

    try:
        # Basic file info
        metadata["size_bytes"] = image_path.stat().st_size

        with Image.open(image_path) as img:
            metadata["width"], metadata["height"] = img.size
            metadata["format"] = img.format
            metadata["mode"] = img.mode

            # Extract EXIF data
            if hasattr(img, "_getexif"):
                exif_data = img._getexif()
                if exif_data:
                    metadata["has_exif"] = True
                    # Convert numeric EXIF tags to readable names
                    for tag_id, value in exif_data.items():
                        tag = ExifTags.TAGS.get(tag_id, tag_id)
                        metadata["exif_data"][tag] = value

    except Exception as e:
        logger.warning(f"Error extracting metadata from {image_path}: {e}")

    return metadata


def resize_image(
    image_path: Path,
    output_path: Path,
    max_width: int = 1024,
    max_height: int = 1024,
    quality: int = 85,
) -> bool:
    """
    Resize image while maintaining aspect ratio.

    Args:
        image_path: Source image path
        output_path: Output image path
        max_width: Maximum width
        max_height: Maximum height
        quality: JPEG quality (1-100)

    Returns:
        True if resize was successful
    """
    try:
        with Image.open(image_path) as img:
            # Convert to RGB if necessary (for JPEG output)
            if img.mode in ("RGBA", "LA", "P"):
                img = img.convert("RGB")

            # Calculate new dimensions
            img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

            # Save with optimization
            output_path.parent.mkdir(parents=True, exist_ok=True)
            img.save(output_path, format="JPEG", quality=quality, optimize=True)

        return True

    except Exception as e:
        logger.error(f"Error resizing image {image_path}: {e}")
        return False


def detect_text_regions(image_path: Path, confidence_threshold: float = 0.5) -> list:
    """
    Detect text regions in image using OpenCV's EAST text detector.

    Args:
        image_path: Path to image file
        confidence_threshold: Minimum confidence for text detection

    Returns:
        List of detected text region bounding boxes
    """
    try:
        cv2 = safe_cv2_import()
        if cv2 is None:
            logger.warning("OpenCV not available for text detection")
            return []

        # Read image
        image = cv2.imread(str(image_path))
        if image is None:
            return []

        # Get image dimensions
        # (H, W) = image.shape[:2]

        # Resize image for EAST detector (multiple of 32)
        # new_W, new_H = 320, 320
        # ratio_W = W / float(new_W)
        # ratio_H = H / float(new_H)

        # image_resized = cv2.resize(image, (new_W, new_H))

        # Create blob for text detection
        # blob = cv2.dnn.blobFromImage(
        #     image_resized, 1.0, (new_W, new_H),
        #     (123.68, 116.78, 103.94), swapRB=True, crop=False
        # )

        # Note: EAST text detector would need to be loaded here
        # For now, return empty list as EAST model is not included
        # In production, you would load the EAST model:
        # net = cv2.dnn.readNet('frozen_east_text_detection.pb')
        # net.setInput(blob)
        # (scores, geometry) = net.forward(['feature_fusion/Conv_7/Sigmoid',
        #                                  'feature_fusion/concat_3'])

        return []

    except Exception as e:
        logger.warning(f"Error detecting text in {image_path}: {e}")
        return []


def calculate_image_quality_score(image_path: Path) -> float:
    """
    Calculate a quality score for an image based on various factors.

    Args:
        image_path: Path to image file

    Returns:
        Quality score between 0.0 and 1.0
    """
    try:
        cv2 = safe_cv2_import()
        if cv2 is not None:
            image = cv2.imread(str(image_path))
            if image is None:
                return 0.0

            # Convert to grayscale for analysis
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            # Fallback using PIL
            with Image.open(image_path) as pil_image:
                if pil_image.mode != "L":
                    pil_image = pil_image.convert("RGB")
                    image_array = np.array(pil_image)
                    gray = safe_rgb_to_grayscale(image_array)
                else:
                    gray = np.array(pil_image)

        # Calculate Laplacian variance (sharpness) with fallback
        laplacian_var = safe_laplacian_variance(gray)

        # Normalize sharpness score (typical range: 0-2000)
        sharpness_score = min(laplacian_var / 1000.0, 1.0)

        # Calculate brightness statistics
        mean_brightness = np.mean(gray)
        brightness_score = 1.0 - abs(mean_brightness - 127.5) / 127.5

        # Calculate contrast (standard deviation)
        contrast = np.std(gray)
        contrast_score = min(contrast / 64.0, 1.0)

        # Combined quality score
        quality_score = (
            sharpness_score * 0.5 + brightness_score * 0.25 + contrast_score * 0.25
        )

        return max(0.0, min(1.0, quality_score))

    except Exception as e:
        logger.warning(f"Error calculating quality for {image_path}: {e}")
        return 0.0
