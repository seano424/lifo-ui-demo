"""
Centralized OCR configuration management for food label processing
Handles environment-specific settings, model configurations, and performance tuning
"""

from typing import Any, Optional
from dataclasses import dataclass
from enum import Enum

import structlog
from app.core.config import settings

logger = structlog.get_logger()


class OCREngine(Enum):
    """Supported OCR engines"""
    GOOGLE_VISION = "google_vision"
    TESSERACT = "tesseract"
    EASYOCR = "easyocr"
    AWS_TEXTRACT = "aws_textract"


class RegionPreference(Enum):
    """Regional preferences for OCR processing"""
    EU = "EU"
    US = "US"
    AUTO = "AUTO"


class QualityProfile(Enum):
    """OCR quality profiles for different use cases"""
    MOBILE_FAST = "mobile_fast"        # Optimized for mobile speed
    ACCURACY_HIGH = "accuracy_high"    # Maximum accuracy for server processing
    BALANCED = "balanced"              # Balanced speed/accuracy
    BATCH_OPTIMIZED = "batch_optimized"  # Optimized for batch processing


@dataclass
class ImageProcessingConfig:
    """Configuration for image preprocessing"""
    max_width: int
    max_height: int
    jpeg_quality: int
    contrast_enhancement: float
    brightness_adjustment: float
    noise_reduction: bool
    edge_enhancement: bool
    deskew_enabled: bool
    perspective_correction: bool


@dataclass
class ConfidenceThresholds:
    """Confidence thresholds for different extraction types"""
    date_extraction: dict[str, float]
    barcode_detection: dict[str, float]
    product_name_extraction: dict[str, float]
    text_recognition: dict[str, float]


@dataclass
class PerformanceConfig:
    """Performance-related configuration"""
    timeout_seconds: int
    max_concurrent_requests: int
    thread_pool_workers: int
    cache_enabled: bool
    cache_ttl_seconds: int
    circuit_breaker_enabled: bool
    retry_attempts: int
    retry_delay_seconds: float


@dataclass
class RegionalConfig:
    """Region-specific configuration"""
    region: RegionPreference
    languages: list[str]
    date_format_preference: str  # 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'
    barcode_format_priority: list[str]
    currency_symbols: list[str]
    measurement_units: list[str]


class OCRConfigurationManager:
    """
    Centralized OCR configuration management

    Features:
    - Environment-specific configurations (dev/staging/production)
    - Quality profile management for different use cases
    - Regional preferences for EU/US markets
    - Performance tuning parameters
    - Model-specific configurations
    - A/B testing configuration support
    """

    def __init__(self):
        self.current_profile = self._determine_quality_profile()
        self.region_preference = self._determine_region_preference()
        self.configurations = self._initialize_configurations()

        logger.info(
            "OCRConfigurationManager initialized",
            quality_profile=self.current_profile.value,
            region_preference=self.region_preference.value,
            environment=settings.environment
        )

    def _determine_quality_profile(self) -> QualityProfile:
        """Determine quality profile based on environment and settings"""
        if settings.environment == "production":
            # Production optimized for accuracy
            return QualityProfile.ACCURACY_HIGH
        elif settings.environment == "staging":
            # Staging balanced for testing
            return QualityProfile.BALANCED
        else:
            # Development optimized for speed
            return QualityProfile.MOBILE_FAST

    def _determine_region_preference(self) -> RegionPreference:
        """Determine region preference based on configuration"""
        # Could be enhanced to detect from user locale or explicit setting
        return RegionPreference.EU  # Default to EU for European food retail

    def _initialize_configurations(self) -> dict[QualityProfile, dict]:
        """Initialize all quality profile configurations"""
        return {
            QualityProfile.MOBILE_FAST: self._create_mobile_fast_config(),
            QualityProfile.ACCURACY_HIGH: self._create_accuracy_high_config(),
            QualityProfile.BALANCED: self._create_balanced_config(),
            QualityProfile.BATCH_OPTIMIZED: self._create_batch_optimized_config()
        }

    def _create_mobile_fast_config(self) -> dict:
        """Configuration optimized for mobile speed"""
        return {
            'image_processing': ImageProcessingConfig(
                max_width=800,
                max_height=600,
                jpeg_quality=75,
                contrast_enhancement=1.1,
                brightness_adjustment=1.0,
                noise_reduction=False,
                edge_enhancement=False,
                deskew_enabled=False,
                perspective_correction=False
            ),
            'confidence_thresholds': ConfidenceThresholds(
                date_extraction={
                    'high': 0.85,
                    'medium': 0.70,
                    'low': 0.50
                },
                barcode_detection={
                    'high': 0.90,
                    'medium': 0.75,
                    'low': 0.55
                },
                product_name_extraction={
                    'high': 0.80,
                    'medium': 0.65,
                    'low': 0.45
                },
                text_recognition={
                    'high': 0.85,
                    'medium': 0.70,
                    'low': 0.50
                }
            ),
            'performance': PerformanceConfig(
                timeout_seconds=8,
                max_concurrent_requests=10,
                thread_pool_workers=2,
                cache_enabled=True,
                cache_ttl_seconds=1800,  # 30 minutes
                circuit_breaker_enabled=True,
                retry_attempts=2,
                retry_delay_seconds=1.0
            ),
            'engines': {
                'primary': OCREngine.GOOGLE_VISION,
                'fallback': None
            }
        }

    def _create_accuracy_high_config(self) -> dict:
        """Configuration optimized for maximum accuracy"""
        return {
            'image_processing': ImageProcessingConfig(
                max_width=settings.ocr_max_image_width,
                max_height=settings.ocr_max_image_height,
                jpeg_quality=settings.ocr_jpeg_quality,
                contrast_enhancement=settings.ocr_contrast_enhancement,
                brightness_adjustment=1.05,
                noise_reduction=True,
                edge_enhancement=True,
                deskew_enabled=True,
                perspective_correction=True
            ),
            'confidence_thresholds': ConfidenceThresholds(
                date_extraction={
                    'high': 0.95,
                    'medium': 0.85,
                    'low': settings.ocr_date_confidence_threshold
                },
                barcode_detection={
                    'high': 0.95,
                    'medium': 0.85,
                    'low': settings.ocr_barcode_confidence_threshold
                },
                product_name_extraction={
                    'high': 0.90,
                    'medium': 0.75,
                    'low': 0.60
                },
                text_recognition={
                    'high': 0.90,
                    'medium': 0.80,
                    'low': settings.ocr_text_confidence_threshold
                }
            ),
            'performance': PerformanceConfig(
                timeout_seconds=settings.ocr_timeout_seconds,
                max_concurrent_requests=5,
                thread_pool_workers=4,
                cache_enabled=settings.ocr_enable_caching,
                cache_ttl_seconds=settings.ocr_cache_ttl_seconds,
                circuit_breaker_enabled=True,
                retry_attempts=3,
                retry_delay_seconds=2.0
            ),
            'engines': {
                'primary': OCREngine.GOOGLE_VISION,
                'fallback': OCREngine.TESSERACT
            }
        }

    def _create_balanced_config(self) -> dict:
        """Configuration balanced between speed and accuracy"""
        return {
            'image_processing': ImageProcessingConfig(
                max_width=1000,
                max_height=750,
                jpeg_quality=80,
                contrast_enhancement=1.15,
                brightness_adjustment=1.02,
                noise_reduction=True,
                edge_enhancement=False,
                deskew_enabled=True,
                perspective_correction=False
            ),
            'confidence_thresholds': ConfidenceThresholds(
                date_extraction={
                    'high': 0.90,
                    'medium': 0.75,
                    'low': 0.60
                },
                barcode_detection={
                    'high': 0.92,
                    'medium': 0.80,
                    'low': 0.65
                },
                product_name_extraction={
                    'high': 0.85,
                    'medium': 0.70,
                    'low': 0.55
                },
                text_recognition={
                    'high': 0.87,
                    'medium': 0.75,
                    'low': 0.60
                }
            ),
            'performance': PerformanceConfig(
                timeout_seconds=10,
                max_concurrent_requests=8,
                thread_pool_workers=3,
                cache_enabled=True,
                cache_ttl_seconds=2700,  # 45 minutes
                circuit_breaker_enabled=True,
                retry_attempts=3,
                retry_delay_seconds=1.5
            ),
            'engines': {
                'primary': OCREngine.GOOGLE_VISION,
                'fallback': None
            }
        }

    def _create_batch_optimized_config(self) -> dict:
        """Configuration optimized for batch processing"""
        return {
            'image_processing': ImageProcessingConfig(
                max_width=900,
                max_height=675,
                jpeg_quality=78,
                contrast_enhancement=1.2,
                brightness_adjustment=1.0,
                noise_reduction=True,
                edge_enhancement=True,
                deskew_enabled=False,  # Skip for speed in batch
                perspective_correction=False
            ),
            'confidence_thresholds': ConfidenceThresholds(
                date_extraction={
                    'high': 0.88,
                    'medium': 0.73,
                    'low': 0.58
                },
                barcode_detection={
                    'high': 0.90,
                    'medium': 0.78,
                    'low': 0.63
                },
                product_name_extraction={
                    'high': 0.83,
                    'medium': 0.68,
                    'low': 0.53
                },
                text_recognition={
                    'high': 0.85,
                    'medium': 0.73,
                    'low': 0.58
                }
            ),
            'performance': PerformanceConfig(
                timeout_seconds=15,
                max_concurrent_requests=20,
                thread_pool_workers=6,
                cache_enabled=True,
                cache_ttl_seconds=7200,  # 2 hours
                circuit_breaker_enabled=True,
                retry_attempts=2,
                retry_delay_seconds=0.5
            ),
            'engines': {
                'primary': OCREngine.GOOGLE_VISION,
                'fallback': None
            }
        }

    def get_current_config(self) -> dict:
        """Get current configuration based on active profile"""
        return self.configurations[self.current_profile]

    def get_image_processing_config(self) -> ImageProcessingConfig:
        """Get image processing configuration"""
        return self.get_current_config()['image_processing']

    def get_confidence_thresholds(self) -> ConfidenceThresholds:
        """Get confidence thresholds configuration"""
        return self.get_current_config()['confidence_thresholds']

    def get_performance_config(self) -> PerformanceConfig:
        """Get performance configuration"""
        return self.get_current_config()['performance']

    def get_regional_config(self) -> RegionalConfig:
        """Get regional configuration"""
        if self.region_preference == RegionPreference.EU:
            return RegionalConfig(
                region=RegionPreference.EU,
                languages=['en', 'fr', 'de', 'es', 'it', 'nl'],
                date_format_preference='DD/MM/YYYY',
                barcode_format_priority=['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'],
                currency_symbols=['€', '£', 'CHF'],
                measurement_units=['g', 'kg', 'ml', 'l', 'cm', 'm']
            )
        elif self.region_preference == RegionPreference.US:
            return RegionalConfig(
                region=RegionPreference.US,
                languages=['en', 'es'],
                date_format_preference='MM/DD/YYYY',
                barcode_format_priority=['UPC-A', 'UPC-E', 'EAN-13', 'EAN-8'],
                currency_symbols=['$'],
                measurement_units=['oz', 'lb', 'fl oz', 'qt', 'gal', 'in', 'ft']
            )
        else:  # AUTO
            return RegionalConfig(
                region=RegionPreference.AUTO,
                languages=['en', 'fr', 'de', 'es', 'it'],
                date_format_preference='YYYY-MM-DD',
                barcode_format_priority=['EAN-13', 'UPC-A', 'EAN-8', 'UPC-E'],
                currency_symbols=['€', '$', '£'],
                measurement_units=['g', 'kg', 'ml', 'l', 'oz', 'lb']
            )

    def set_quality_profile(self, profile: QualityProfile) -> None:
        """Change the active quality profile"""
        if profile in self.configurations:
            self.current_profile = profile
            logger.info(f"OCR quality profile changed to: {profile.value}")
        else:
            logger.warning(f"Invalid quality profile: {profile}")

    def set_region_preference(self, region: RegionPreference) -> None:
        """Change the region preference"""
        self.region_preference = region
        logger.info(f"OCR region preference changed to: {region.value}")

    def get_engine_config(self, engine: OCREngine) -> dict:
        """Get engine-specific configuration"""
        base_config = {
            'timeout_seconds': self.get_performance_config().timeout_seconds,
            'max_retries': self.get_performance_config().retry_attempts,
            'retry_delay': self.get_performance_config().retry_delay_seconds
        }

        if engine == OCREngine.GOOGLE_VISION:
            return {
                **base_config,
                'api_endpoint': 'eu-vision.googleapis.com',  # EU endpoint for better latency
                'features': [
                    'TEXT_DETECTION',
                    'DOCUMENT_TEXT_DETECTION'
                ],
                'image_context': {
                    'language_hints': self.get_regional_config().languages
                }
            }
        elif engine == OCREngine.TESSERACT:
            return {
                **base_config,
                'languages': '+'.join(self.get_regional_config().languages),
                'page_segmentation_mode': 6,  # Single block of text
                'ocr_engine_mode': 1,  # Neural nets LSTM engine
                'config_options': {
                    'tessedit_char_whitelist': None,  # Allow all characters
                    'preserve_interword_spaces': 1
                }
            }
        elif engine == OCREngine.EASYOCR:
            return {
                **base_config,
                'languages': self.get_regional_config().languages,
                'gpu': False,  # Use CPU for better compatibility
                'width_ths': 0.7,
                'height_ths': 0.7,
                'decoder': 'greedy'
            }
        else:
            return base_config

    def get_model_specific_config(self, model_type: str) -> dict:
        """Get configuration specific to extraction models"""
        regional_config = self.get_regional_config()
        confidence_thresholds = self.get_confidence_thresholds()

        if model_type == 'date_extraction':
            return {
                'region_preference': regional_config.region.value,
                'supported_languages': regional_config.languages,
                'date_format_preference': regional_config.date_format_preference,
                'confidence_thresholds': confidence_thresholds.date_extraction,
                'context_window_size': 3,  # Number of surrounding text blocks to consider
                'max_date_range_years': 5,  # Maximum reasonable date range
                'enable_manufacturing_date': True,
                'enable_contextual_hints': True
            }
        elif model_type == 'barcode_detection':
            return {
                'region_preference': regional_config.region.value,
                'format_priority': regional_config.barcode_format_priority,
                'confidence_thresholds': confidence_thresholds.barcode_detection,
                'enable_checksum_validation': True,
                'enable_fragmented_detection': True,
                'max_fragmentation_distance': 2,  # Max blocks apart for fragmented barcodes
                'position_weight': 0.3  # Weight of position in confidence calculation
            }
        elif model_type == 'product_name_extraction':
            return {
                'supported_languages': regional_config.languages,
                'confidence_thresholds': confidence_thresholds.product_name_extraction,
                'enable_brand_detection': True,
                'enable_multiline_reconstruction': True,
                'max_name_length': 100,
                'min_name_length': 2,
                'font_size_weight': 0.4,
                'position_weight': 0.3,
                'context_weight': 0.3
            }
        else:
            return {}

    def get_a_b_testing_config(self) -> dict:
        """Get A/B testing configuration for OCR experiments"""
        return {
            'enabled': settings.environment in ['staging', 'development'],
            'experiments': {
                'enhanced_preprocessing': {
                    'enabled': True,
                    'traffic_percentage': 50,
                    'variants': ['standard', 'enhanced']
                },
                'dual_engine_comparison': {
                    'enabled': False,
                    'traffic_percentage': 10,
                    'variants': ['google_vision_only', 'google_vision_tesseract_fallback']
                },
                'confidence_threshold_optimization': {
                    'enabled': True,
                    'traffic_percentage': 25,
                    'variants': ['conservative', 'aggressive']
                }
            }
        }

    def validate_configuration(self) -> dict[str, bool]:
        """Validate current configuration and return status"""
        validation_results = {}

        try:
            # Check image processing limits
            img_config = self.get_image_processing_config()
            validation_results['image_processing'] = (
                0 < img_config.max_width <= 2048 and
                0 < img_config.max_height <= 2048 and
                50 <= img_config.jpeg_quality <= 100
            )

            # Check confidence thresholds
            confidence_config = self.get_confidence_thresholds()
            validation_results['confidence_thresholds'] = all(
                0.0 <= threshold <= 1.0
                for threshold_dict in [
                    confidence_config.date_extraction,
                    confidence_config.barcode_detection,
                    confidence_config.product_name_extraction,
                    confidence_config.text_recognition
                ]
                for threshold in threshold_dict.values()
            )

            # Check performance limits
            perf_config = self.get_performance_config()
            validation_results['performance'] = (
                0 < perf_config.timeout_seconds <= 60 and
                0 < perf_config.max_concurrent_requests <= 100 and
                0 < perf_config.thread_pool_workers <= 20
            )

            # Overall validation
            validation_results['overall'] = all(validation_results.values())

        except Exception as e:
            logger.error(f"Configuration validation failed: {e}")
            validation_results['overall'] = False

        return validation_results


# Global configuration manager instance
_ocr_config_manager: OCRConfigurationManager | None = None


def get_ocr_config_manager() -> OCRConfigurationManager:
    """Get singleton instance of OCR configuration manager"""
    global _ocr_config_manager
    if _ocr_config_manager is None:
        _ocr_config_manager = OCRConfigurationManager()
    return _ocr_config_manager


def get_current_ocr_config() -> dict:
    """Get current OCR configuration (convenience function)"""
    return get_ocr_config_manager().get_current_config()


def get_date_extraction_config() -> dict:
    """Get date extraction model configuration (convenience function)"""
    return get_ocr_config_manager().get_model_specific_config('date_extraction')


def get_barcode_detection_config() -> dict:
    """Get barcode detection model configuration (convenience function)"""
    return get_ocr_config_manager().get_model_specific_config('barcode_detection')


def get_product_name_extraction_config() -> dict:
    """Get product name extraction model configuration (convenience function)"""
    return get_ocr_config_manager().get_model_specific_config('product_name_extraction')