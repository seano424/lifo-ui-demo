"""
OpenCV Fallback Utilities for Cloud Deployment

This module provides fallback mechanisms and import utilities for OpenCV
to handle cloud deployment scenarios where cv2 might not be available.
"""

import logging
import numpy as np
from typing import Optional, Tuple, Any
import warnings

logger = logging.getLogger(__name__)

# Global flag to track OpenCV availability
_opencv_available: Optional[bool] = None
_cv2_module: Optional[Any] = None

def is_opencv_available() -> bool:
    """
    Check if OpenCV is available and functional.

    Returns:
        True if OpenCV can be imported and used
    """
    global _opencv_available, _cv2_module

    if _opencv_available is not None:
        return _opencv_available

    try:
        import cv2
        _cv2_module = cv2

        # Test basic functionality
        test_array = np.zeros((10, 10, 3), dtype=np.uint8)
        _ = cv2.cvtColor(test_array, cv2.COLOR_BGR2GRAY)

        _opencv_available = True
        logger.info("OpenCV is available and functional")
        return True

    except ImportError as e:
        logger.warning(f"OpenCV import failed: {e}")
        _opencv_available = False
        return False
    except Exception as e:
        logger.warning(f"OpenCV functionality test failed: {e}")
        _opencv_available = False
        return False

def get_cv2():
    """
    Get cv2 module if available, otherwise raise ImportError with helpful message.

    Returns:
        cv2 module

    Raises:
        ImportError: If OpenCV is not available
    """
    if is_opencv_available():
        return _cv2_module

    raise ImportError(
        "OpenCV is not available. This might be due to:\n"
        "1. Missing opencv-python-headless package\n"
        "2. Missing system dependencies in deployment environment\n"
        "3. Cloud platform compatibility issues\n"
        "Consider using PIL-based fallbacks for basic image operations."
    )

def safe_cv2_import() -> Optional[Any]:
    """
    Safely import cv2 without raising exceptions.

    Returns:
        cv2 module if available, None otherwise
    """
    if is_opencv_available():
        return _cv2_module
    return None

# Fallback implementations using PIL and numpy

def pil_to_cv2_fallback(pil_image) -> np.ndarray:
    """
    Convert PIL image to OpenCV format using numpy (fallback).

    Args:
        pil_image: PIL Image object

    Returns:
        Image as numpy array in BGR format
    """
    import numpy as np

    # Convert PIL to numpy
    if pil_image.mode == 'RGB':
        # PIL is RGB, OpenCV expects BGR
        np_image = np.array(pil_image)
        return np_image[:, :, ::-1]  # RGB to BGR
    elif pil_image.mode == 'RGBA':
        np_image = np.array(pil_image)
        # Convert RGBA to BGR (drop alpha)
        return np_image[:, :, [2, 1, 0]]  # RGBA to BGR
    elif pil_image.mode == 'L':
        # Grayscale
        return np.array(pil_image)
    else:
        # Convert to RGB first, then to BGR
        rgb_image = pil_image.convert('RGB')
        np_image = np.array(rgb_image)
        return np_image[:, :, ::-1]

def calculate_laplacian_variance_fallback(gray_image: np.ndarray) -> float:
    """
    Calculate Laplacian variance without OpenCV (fallback implementation).

    Args:
        gray_image: Grayscale image as numpy array

    Returns:
        Laplacian variance (measure of image sharpness)
    """
    # Simple Laplacian kernel
    laplacian_kernel = np.array([
        [0, 1, 0],
        [1, -4, 1],
        [0, 1, 0]
    ], dtype=np.float64)

    # Apply convolution manually
    from scipy import ndimage
    try:
        laplacian = ndimage.convolve(gray_image.astype(np.float64), laplacian_kernel)
        return float(np.var(laplacian))
    except ImportError:
        # Even more basic fallback using gradient approximation
        logger.warning("scipy not available, using basic gradient approximation")

        # Calculate gradients using numpy
        grad_x = np.gradient(gray_image.astype(np.float64), axis=1)
        grad_y = np.gradient(gray_image.astype(np.float64), axis=0)

        # Approximate Laplacian as sum of second derivatives
        grad_xx = np.gradient(grad_x, axis=1)
        grad_yy = np.gradient(grad_y, axis=0)
        laplacian_approx = grad_xx + grad_yy

        return float(np.var(laplacian_approx))

def rgb_to_grayscale_fallback(rgb_image: np.ndarray) -> np.ndarray:
    """
    Convert RGB image to grayscale without OpenCV.

    Args:
        rgb_image: RGB image as numpy array

    Returns:
        Grayscale image as numpy array
    """
    if len(rgb_image.shape) == 2:
        return rgb_image  # Already grayscale

    if rgb_image.shape[2] == 3:  # RGB
        # Use standard luminance weights
        return np.dot(rgb_image[...,:3], [0.299, 0.587, 0.114]).astype(np.uint8)
    elif rgb_image.shape[2] == 4:  # RGBA
        # Use standard luminance weights, ignore alpha
        return np.dot(rgb_image[...,:3], [0.299, 0.587, 0.114]).astype(np.uint8)
    else:
        return rgb_image

def resize_image_fallback(image: np.ndarray, new_width: int, new_height: int) -> np.ndarray:
    """
    Resize image without OpenCV using PIL.

    Args:
        image: Image as numpy array
        new_width: Target width
        new_height: Target height

    Returns:
        Resized image as numpy array
    """
    from PIL import Image

    # Convert numpy to PIL
    if len(image.shape) == 2:  # Grayscale
        pil_image = Image.fromarray(image, mode='L')
    elif len(image.shape) == 3:
        if image.shape[2] == 3:  # RGB/BGR
            pil_image = Image.fromarray(image, mode='RGB')
        else:
            pil_image = Image.fromarray(image, mode='RGB')
    else:
        raise ValueError(f"Unsupported image shape: {image.shape}")

    # Resize using PIL
    resized_pil = pil_image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    # Convert back to numpy
    return np.array(resized_pil)

class OpenCVFallbackError(Exception):
    """Exception raised when OpenCV operation fails and no fallback is available."""
    pass

def with_opencv_fallback(fallback_func=None):
    """
    Decorator to provide fallback functionality when OpenCV is not available.

    Args:
        fallback_func: Function to call when OpenCV is not available
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            if is_opencv_available():
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    logger.warning(f"OpenCV operation failed: {e}")
                    if fallback_func:
                        logger.info("Using fallback implementation")
                        return fallback_func(*args, **kwargs)
                    raise OpenCVFallbackError(f"OpenCV operation failed and no fallback available: {e}")
            else:
                if fallback_func:
                    logger.info("OpenCV not available, using fallback implementation")
                    return fallback_func(*args, **kwargs)
                raise OpenCVFallbackError("OpenCV not available and no fallback provided")
        return wrapper
    return decorator

# Convenience functions that automatically choose implementation

def safe_laplacian_variance(gray_image: np.ndarray) -> float:
    """
    Calculate Laplacian variance with automatic fallback.

    Args:
        gray_image: Grayscale image as numpy array

    Returns:
        Laplacian variance
    """
    cv2 = safe_cv2_import()
    if cv2 is not None:
        try:
            return float(cv2.Laplacian(gray_image, cv2.CV_64F).var())
        except Exception as e:
            logger.warning(f"OpenCV Laplacian failed: {e}, using fallback")

    return calculate_laplacian_variance_fallback(gray_image)

def safe_rgb_to_grayscale(rgb_image: np.ndarray) -> np.ndarray:
    """
    Convert RGB to grayscale with automatic fallback.

    Args:
        rgb_image: RGB image as numpy array

    Returns:
        Grayscale image
    """
    cv2 = safe_cv2_import()
    if cv2 is not None:
        try:
            if len(rgb_image.shape) == 3 and rgb_image.shape[2] == 3:
                return cv2.cvtColor(rgb_image, cv2.COLOR_RGB2GRAY)
            elif len(rgb_image.shape) == 3 and rgb_image.shape[2] == 4:
                return cv2.cvtColor(rgb_image, cv2.COLOR_RGBA2GRAY)
        except Exception as e:
            logger.warning(f"OpenCV color conversion failed: {e}, using fallback")

    return rgb_to_grayscale_fallback(rgb_image)

def safe_resize_image(image: np.ndarray, new_width: int, new_height: int) -> np.ndarray:
    """
    Resize image with automatic fallback.

    Args:
        image: Image as numpy array
        new_width: Target width
        new_height: Target height

    Returns:
        Resized image
    """
    cv2 = safe_cv2_import()
    if cv2 is not None:
        try:
            return cv2.resize(image, (new_width, new_height))
        except Exception as e:
            logger.warning(f"OpenCV resize failed: {e}, using fallback")

    return resize_image_fallback(image, new_width, new_height)