"""
Comprehensive test suite for enhanced OCR services
Tests date extraction, barcode detection, and product name extraction
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from app.services.date_extraction_service import (
    DateExtractionService,
    DateExtractionResult,
    get_date_extraction_service
)
from app.services.barcode_detection_service import (
    BarcodeDetectionService,
    BarcodeDetectionResult,
    get_barcode_detection_service
)
from app.services.product_name_extraction_service import (
    ProductNameExtractionService,
    ProductNameResult,
    get_product_name_extraction_service
)
from app.core.ocr_config import (
    OCRConfigurationManager,
    QualityProfile,
    RegionPreference,
    get_ocr_config_manager
)


class TestDateExtractionService:
    """Test suite for date extraction service"""

    @pytest.fixture
    def date_service(self):
        return DateExtractionService()

    @pytest.fixture
    def sample_text_blocks(self):
        return [
            "Best Before: 25/12/2024",
            "Use by 15 Jan 2025",
            "EXP 03/15/2025",
            "MFG: 10/10/2024",
            "À consommer avant le 20/11/2024",
            "Mindestens haltbar bis 30.12.2024",
            "22NOV24",
            "Some unrelated text",
            "12345678901234",  # Barcode (should be filtered)
            "Ingredients: milk, sugar"  # Ingredient text (should be filtered)
        ]

    @pytest.fixture
    def sample_bounding_boxes(self):
        return [
            {"x": 10, "y": 50, "width": 120, "height": 20},
            {"x": 15, "y": 80, "width": 100, "height": 18},
            {"x": 20, "y": 110, "width": 90, "height": 16},
            {"x": 25, "y": 140, "width": 110, "height": 20},
            {"x": 30, "y": 170, "width": 150, "height": 22},
            {"x": 35, "y": 200, "width": 140, "height": 20},
            {"x": 40, "y": 230, "width": 80, "height": 18},
            {"x": 45, "y": 260, "width": 100, "height": 16},
            {"x": 50, "y": 290, "width": 130, "height": 14},
            {"x": 55, "y": 320, "width": 120, "height": 16}
        ]

    @pytest.mark.asyncio
    async def test_extract_dates_basic_formats(self, date_service, sample_text_blocks, sample_bounding_boxes):
        """Test extraction of basic date formats"""
        results = await date_service.extract_dates_from_text_blocks(
            sample_text_blocks[:4], sample_bounding_boxes[:4], 'EU'
        )

        # Should find at least 3 dates
        assert len(results) >= 3

        # Check specific date extractions
        date_values = [r.date for r in results if r.date]
        assert any(d.day == 25 and d.month == 12 and d.year == 2024 for d in date_values)
        assert any(d.day == 15 and d.month == 1 and d.year == 2025 for d in date_values)

        # Check date types
        date_types = [r.date_type for r in results]
        assert 'best_before' in date_types
        assert 'use_by' in date_types or 'expiry' in date_types

    @pytest.mark.asyncio
    async def test_multilingual_date_extraction(self, date_service, sample_text_blocks, sample_bounding_boxes):
        """Test multilingual date extraction (French, German)"""
        multilingual_blocks = sample_text_blocks[4:7]  # French and German text
        results = await date_service.extract_dates_from_text_blocks(
            multilingual_blocks, sample_bounding_boxes[4:7], 'EU'
        )

        assert len(results) >= 2

        # Check French date extraction
        french_result = next((r for r in results if 'consommer' in r.raw_text.lower()), None)
        assert french_result is not None
        assert french_result.date.day == 20
        assert french_result.date.month == 11

        # Check German date extraction
        german_result = next((r for r in results if 'haltbar' in r.raw_text.lower()), None)
        assert german_result is not None
        assert german_result.date.day == 30
        assert german_result.date.month == 12

    @pytest.mark.asyncio
    async def test_compact_date_format(self, date_service):
        """Test compact date format extraction (22NOV24)"""
        compact_blocks = ["22NOV24"]
        results = await date_service.extract_dates_from_text_blocks(
            compact_blocks, None, 'EU'
        )

        assert len(results) >= 1
        assert results[0].date.day == 22
        assert results[0].date.month == 11
        assert results[0].date.year == 2024

    @pytest.mark.asyncio
    async def test_region_preference_us(self, date_service):
        """Test US region preference affects date interpretation"""
        ambiguous_date = ["03/15/2025"]  # Could be DD/MM or MM/DD
        results_us = await date_service.extract_dates_from_text_blocks(
            ambiguous_date, None, 'US'
        )
        results_eu = await date_service.extract_dates_from_text_blocks(
            ambiguous_date, None, 'EU'
        )

        # US should interpret as MM/DD (March 15)
        # EU should interpret as DD/MM but this would be invalid (month 15)
        assert len(results_us) >= 1
        assert results_us[0].date.month == 3
        assert results_us[0].date.day == 15

    def test_date_validation(self, date_service):
        """Test date validation logic"""
        # Test reasonable date range
        future_date = datetime.now() + timedelta(days=730)
        past_date = datetime.now() - timedelta(days=100)

        assert date_service._is_reasonable_date(future_date, 'expiry')
        assert not date_service._is_reasonable_date(past_date, 'expiry')

    def test_language_detection(self, date_service):
        """Test language detection from text"""
        french_text = "À consommer avant le 20 novembre 2024"
        german_text = "Mindestens haltbar bis 30 Dezember 2024"
        english_text = "Best before 25 December 2024"

        assert date_service._detect_language(french_text) == 'french'
        assert date_service._detect_language(german_text) == 'german'
        assert date_service._detect_language(english_text) == 'english'


class TestBarcodeDetectionService:
    """Test suite for barcode detection service"""

    @pytest.fixture
    def barcode_service(self):
        return BarcodeDetectionService()

    @pytest.fixture
    def sample_barcode_blocks(self):
        return [
            "4006381333931",  # Valid EAN-13
            "012345678905",   # Valid UPC-A
            "12345678",       # Valid EAN-8
            "4006381333930",  # Invalid EAN-13 (wrong check digit)
            "BARCODE: 4006381333931",  # Context-enhanced
            "4006381 333931", # Fragmented
            "06381333931",    # 11-digit (needs zero padding for UPC-A)
            "Product description text",
            "25/12/2024",     # Date (should be filtered)
            "Some random text"
        ]

    @pytest.mark.asyncio
    async def test_valid_barcode_detection(self, barcode_service, sample_barcode_blocks):
        """Test detection of valid barcodes with checksum validation"""
        results = await barcode_service.detect_barcodes_from_text_blocks(
            sample_barcode_blocks[:3], None, 'EU'
        )

        # Should find valid barcodes
        assert len(results) >= 2

        # Check EAN-13 detection
        ean13_result = next((r for r in results if r.format == 'EAN-13'), None)
        assert ean13_result is not None
        assert ean13_result.value == "4006381333931"
        assert ean13_result.checksum_valid is True
        assert ean13_result.confidence >= 0.7

        # Check UPC-A detection
        upc_result = next((r for r in results if r.format == 'UPC-A'), None)
        assert upc_result is not None
        assert upc_result.value == "012345678905"
        assert upc_result.checksum_valid is True

    @pytest.mark.asyncio
    async def test_invalid_checksum_rejection(self, barcode_service):
        """Test rejection of barcodes with invalid checksums"""
        invalid_blocks = ["4006381333930"]  # Wrong check digit
        results = await barcode_service.detect_barcodes_from_text_blocks(
            invalid_blocks, None, 'EU'
        )

        # Should still detect but mark as invalid checksum
        if results:
            assert results[0].checksum_valid is False
            assert results[0].confidence < 0.7  # Lower confidence for invalid checksum

    @pytest.mark.asyncio
    async def test_context_enhanced_detection(self, barcode_service):
        """Test context-enhanced barcode detection"""
        context_blocks = ["BARCODE: 4006381333931"]
        results = await barcode_service.detect_barcodes_from_text_blocks(
            context_blocks, None, 'EU'
        )

        assert len(results) >= 1
        assert results[0].source == 'single_block'
        # Context should boost confidence
        assert results[0].confidence > 0.8

    @pytest.mark.asyncio
    async def test_fragmented_barcode_detection(self, barcode_service):
        """Test detection of fragmented barcodes"""
        fragmented_blocks = ["4006381", "333931"]
        results = await barcode_service.detect_barcodes_from_text_blocks(
            fragmented_blocks, None, 'EU'
        )

        if results:  # Fragmented detection is more complex
            assert results[0].source == 'fragmented'
            assert results[0].value == "4006381333931"

    @pytest.mark.asyncio
    async def test_zero_padding_upc(self, barcode_service):
        """Test zero padding for UPC-A barcodes"""
        eleven_digit_blocks = ["06381333931"]  # Needs leading zero
        results = await barcode_service.detect_barcodes_from_text_blocks(
            eleven_digit_blocks, None, 'US'
        )

        if results:
            upc_result = next((r for r in results if r.format == 'UPC-A'), None)
            if upc_result:
                assert upc_result.value.startswith('0')
                assert len(upc_result.value) == 12
                assert upc_result.source == 'zero_padded'

    def test_checksum_validation_algorithms(self, barcode_service):
        """Test checksum validation algorithms"""
        # Test EAN-13 validation
        assert barcode_service._validate_ean13("4006381333931") is True
        assert barcode_service._validate_ean13("4006381333930") is False

        # Test UPC-A validation
        assert barcode_service._validate_upc_a("012345678905") is True
        assert barcode_service._validate_upc_a("012345678906") is False

        # Test EAN-8 validation
        assert barcode_service._validate_ean8("73513537") is True
        assert barcode_service._validate_ean8("73513538") is False

    @pytest.mark.asyncio
    async def test_region_preference_priority(self, barcode_service):
        """Test region preference affects format priority"""
        mixed_blocks = ["4006381333931", "012345678905"]  # EAN-13 and UPC-A

        results_eu = await barcode_service.detect_barcodes_from_text_blocks(
            mixed_blocks, None, 'EU'
        )
        results_us = await barcode_service.detect_barcodes_from_text_blocks(
            mixed_blocks, None, 'US'
        )

        # Both should find both barcodes, but order might differ
        assert len(results_eu) >= 2
        assert len(results_us) >= 2


class TestProductNameExtractionService:
    """Test suite for product name extraction service"""

    @pytest.fixture
    def product_service(self):
        return ProductNameExtractionService()

    @pytest.fixture
    def sample_product_blocks(self):
        return [
            "SIGNATURE SELECT",           # Brand
            "Organic Bananas",           # Product name
            "Premium Quality",           # Brand qualifier
            "Fresh Whole Milk",          # Product description
            "2% Reduced Fat",            # Product variant
            "500ml",                     # Size (should be filtered)
            "Ingredients: milk, sugar",  # Ingredients (should be filtered)
            "Per 100g: 350 kcal",      # Nutrition (should be filtered)
            "Store in refrigerator",     # Instructions (should be filtered)
            "Best before: 25/12/2024",  # Date (should be filtered)
            "Barcode: 4006381333931",   # Barcode (should be filtered)
            "ACME FOODS LTD",           # Brand with company indicator
            "Traditional Recipe",        # Product descriptor
            "Farm Fresh",               # Quality indicator
            "PRODUIT DE FRANCE"         # French origin text
        ]

    @pytest.fixture
    def sample_product_bounding_boxes(self):
        return [
            {"x": 50, "y": 20, "width": 200, "height": 30},   # Large text (likely brand)
            {"x": 60, "y": 60, "width": 180, "height": 25},   # Medium-large text
            {"x": 70, "y": 100, "width": 150, "height": 20},  # Medium text
            {"x": 80, "y": 140, "width": 160, "height": 22},  # Medium text
            {"x": 90, "y": 180, "width": 120, "height": 18},  # Small-medium text
            {"x": 100, "y": 220, "width": 80, "height": 14},  # Small text
            {"x": 110, "y": 260, "width": 200, "height": 12}, # Very small text
            {"x": 120, "y": 300, "width": 180, "height": 12}, # Very small text
            {"x": 130, "y": 340, "width": 160, "height": 12}, # Very small text
            {"x": 140, "y": 380, "width": 150, "height": 12}, # Very small text
            {"x": 150, "y": 420, "width": 130, "height": 12}, # Very small text
            {"x": 160, "y": 460, "width": 140, "height": 16}, # Small-medium text
            {"x": 170, "y": 500, "width": 120, "height": 18}, # Medium text
            {"x": 180, "y": 540, "width": 110, "height": 20}, # Medium text
            {"x": 190, "y": 580, "width": 130, "height": 16}  # Small-medium text
        ]

    @pytest.mark.asyncio
    async def test_basic_product_name_extraction(self, product_service, sample_product_blocks, sample_product_bounding_boxes):
        """Test basic product name extraction"""
        # Use first 5 blocks (avoid filtered content)
        results = await product_service.extract_product_names_from_text_blocks(
            sample_product_blocks[:5], sample_product_bounding_boxes[:5], 'auto'
        )

        assert len(results) >= 2

        # Check for brand detection
        brand_results = [r for r in results if r.name_type == 'brand']
        assert len(brand_results) >= 1

        # Check for product detection
        product_results = [r for r in results if r.name_type in ['product', 'description']]
        assert len(product_results) >= 1

    @pytest.mark.asyncio
    async def test_content_filtering(self, product_service):
        """Test filtering of non-product content"""
        filtered_blocks = [
            "500ml",                     # Size
            "Ingredients: milk, sugar",  # Ingredients
            "Per 100g: 350 kcal",      # Nutrition
            "Best before: 25/12/2024",  # Date
            "4006381333931"             # Barcode
        ]

        results = await product_service.extract_product_names_from_text_blocks(
            filtered_blocks, None, 'auto'
        )

        # Should filter out most/all of these
        assert len(results) <= 1  # Maybe one false positive, but should be minimal

    @pytest.mark.asyncio
    async def test_font_size_hierarchy(self, product_service):
        """Test font size affects hierarchy detection"""
        large_text_block = ["PREMIUM BRAND"]
        small_text_block = ["small description"]

        large_bbox = [{"x": 0, "y": 0, "width": 200, "height": 40}]  # Large font
        small_bbox = [{"x": 0, "y": 50, "width": 100, "height": 12}]  # Small font

        large_results = await product_service.extract_product_names_from_text_blocks(
            large_text_block, large_bbox, 'auto'
        )
        small_results = await product_service.extract_product_names_from_text_blocks(
            small_text_block, small_bbox, 'auto'
        )

        if large_results and small_results:
            # Large text should have higher hierarchy (lower number = higher priority)
            assert large_results[0].hierarchy_level <= small_results[0].hierarchy_level
            assert large_results[0].font_size_score > small_results[0].font_size_score

    @pytest.mark.asyncio
    async def test_brand_indicators_detection(self, product_service):
        """Test detection of brand indicators"""
        brand_blocks = [
            "ACME FOODS LTD",      # Company indicator
            "Premium Quality",      # Quality indicator
            "Signature Select"      # Signature brand
        ]

        results = await product_service.extract_product_names_from_text_blocks(
            brand_blocks, None, 'auto'
        )

        # Should identify brand-type content
        brand_results = [r for r in results if r.name_type == 'brand']
        assert len(brand_results) >= 1

    @pytest.mark.asyncio
    async def test_multiline_reconstruction(self, product_service):
        """Test multiline product name reconstruction"""
        # Simulate product name split across lines
        multiline_blocks = ["ORGANIC", "WHOLE WHEAT", "BREAD"]

        # Simulate adjacent positioning
        adjacent_boxes = [
            {"x": 50, "y": 100, "width": 100, "height": 20},
            {"x": 50, "y": 125, "width": 120, "height": 20},  # Next line
            {"x": 50, "y": 150, "width": 80, "height": 20}    # Third line
        ]

        results = await product_service.extract_product_names_from_text_blocks(
            multiline_blocks, adjacent_boxes, 'auto'
        )

        # Should reconstruct combined product name
        combined_results = [r for r in results if r.name_type == 'combined']
        if combined_results:
            assert len(combined_results[0].product_name.split()) >= 2

    def test_text_cleaning(self, product_service):
        """Test product text cleaning functionality"""
        dirty_text = "  PRODUCT NAME 500ml  "
        cleaned = product_service._clean_product_text(dirty_text)

        assert cleaned == "PRODUCT NAME"
        assert "500ml" not in cleaned

    def test_brand_product_separation(self, product_service):
        """Test separation of brand and product components"""
        combined_text = "ACME Premium Chocolate Cookies"
        brand, product = product_service._separate_brand_and_product(combined_text)

        # Should attempt to separate brand from product
        assert brand is not None or product is not None
        if brand:
            assert len(brand.split()) <= 2  # Brands usually 1-2 words

    @pytest.mark.asyncio
    async def test_confidence_scoring(self, product_service):
        """Test confidence scoring for product names"""
        high_confidence_blocks = ["PREMIUM ORGANIC BANANAS"]  # Clear product name
        low_confidence_blocks = ["X"]  # Unclear single character

        high_bbox = [{"x": 50, "y": 50, "width": 200, "height": 30}]  # Good size/position
        low_bbox = [{"x": 500, "y": 500, "width": 10, "height": 8}]   # Poor size/position

        high_results = await product_service.extract_product_names_from_text_blocks(
            high_confidence_blocks, high_bbox, 'auto'
        )
        low_results = await product_service.extract_product_names_from_text_blocks(
            low_confidence_blocks, low_bbox, 'auto'
        )

        if high_results and low_results:
            assert high_results[0].confidence > low_results[0].confidence


class TestOCRConfigurationManager:
    """Test suite for OCR configuration manager"""

    @pytest.fixture
    def config_manager(self):
        return OCRConfigurationManager()

    def test_quality_profile_configurations(self, config_manager):
        """Test different quality profile configurations"""
        # Test mobile fast profile
        config_manager.set_quality_profile(QualityProfile.MOBILE_FAST)
        mobile_config = config_manager.get_current_config()

        assert mobile_config['image_processing'].max_width == 800
        assert mobile_config['performance'].timeout_seconds == 8
        assert mobile_config['performance'].thread_pool_workers == 2

        # Test accuracy high profile
        config_manager.set_quality_profile(QualityProfile.ACCURACY_HIGH)
        accuracy_config = config_manager.get_current_config()

        assert accuracy_config['image_processing'].max_width >= 1024
        assert accuracy_config['performance'].timeout_seconds >= 10
        assert accuracy_config['performance'].thread_pool_workers >= 4

    def test_regional_configurations(self, config_manager):
        """Test regional configuration differences"""
        # Test EU configuration
        config_manager.set_region_preference(RegionPreference.EU)
        eu_config = config_manager.get_regional_config()

        assert 'fr' in eu_config.languages
        assert 'de' in eu_config.languages
        assert eu_config.date_format_preference == 'DD/MM/YYYY'
        assert 'EAN-13' in eu_config.barcode_format_priority
        assert '€' in eu_config.currency_symbols

        # Test US configuration
        config_manager.set_region_preference(RegionPreference.US)
        us_config = config_manager.get_regional_config()

        assert 'en' in us_config.languages
        assert us_config.date_format_preference == 'MM/DD/YYYY'
        assert 'UPC-A' in us_config.barcode_format_priority
        assert '$' in us_config.currency_symbols

    def test_model_specific_configurations(self, config_manager):
        """Test model-specific configuration generation"""
        date_config = config_manager.get_model_specific_config('date_extraction')
        barcode_config = config_manager.get_model_specific_config('barcode_detection')
        product_config = config_manager.get_model_specific_config('product_name_extraction')

        # Validate date extraction config
        assert 'confidence_thresholds' in date_config
        assert 'region_preference' in date_config
        assert 'supported_languages' in date_config

        # Validate barcode detection config
        assert 'format_priority' in barcode_config
        assert 'enable_checksum_validation' in barcode_config
        assert 'enable_fragmented_detection' in barcode_config

        # Validate product name extraction config
        assert 'enable_brand_detection' in product_config
        assert 'enable_multiline_reconstruction' in product_config
        assert 'font_size_weight' in product_config

    def test_configuration_validation(self, config_manager):
        """Test configuration validation"""
        validation_results = config_manager.validate_configuration()

        assert 'overall' in validation_results
        assert 'image_processing' in validation_results
        assert 'confidence_thresholds' in validation_results
        assert 'performance' in validation_results

        # Overall validation should pass for default configuration
        assert validation_results['overall'] is True

    def test_engine_configurations(self, config_manager):
        """Test engine-specific configurations"""
        from app.core.ocr_config import OCREngine

        google_config = config_manager.get_engine_config(OCREngine.GOOGLE_VISION)
        tesseract_config = config_manager.get_engine_config(OCREngine.TESSERACT)

        # Google Vision config
        assert 'api_endpoint' in google_config
        assert 'features' in google_config
        assert 'image_context' in google_config

        # Tesseract config
        assert 'languages' in tesseract_config
        assert 'page_segmentation_mode' in tesseract_config
        assert 'ocr_engine_mode' in tesseract_config


class TestIntegratedOCRWorkflow:
    """Integration tests for complete OCR workflow"""

    @pytest.fixture
    def mock_image_data(self):
        return b"fake_image_data_for_testing"

    @pytest.mark.asyncio
    async def test_date_extraction_integration(self):
        """Test integrated date extraction workflow"""
        service = get_date_extraction_service()

        test_blocks = [
            "Best Before: 25/12/2024",
            "Use by: 15 Jan 2025",
            "Some other text"
        ]

        results = await service.extract_dates_from_text_blocks(test_blocks, None, 'EU')

        assert len(results) >= 2
        assert all(isinstance(r, DateExtractionResult) for r in results)
        assert all(r.confidence > 0.0 for r in results)

    @pytest.mark.asyncio
    async def test_barcode_detection_integration(self):
        """Test integrated barcode detection workflow"""
        service = get_barcode_detection_service()

        test_blocks = [
            "4006381333931",  # Valid EAN-13
            "012345678905",   # Valid UPC-A
            "Some text here"
        ]

        results = await service.detect_barcodes_from_text_blocks(test_blocks, None, 'EU')

        assert len(results) >= 2
        assert all(isinstance(r, BarcodeDetectionResult) for r in results)
        assert all(r.confidence > 0.0 for r in results)
        assert all(r.checksum_valid for r in results)

    @pytest.mark.asyncio
    async def test_product_name_extraction_integration(self):
        """Test integrated product name extraction workflow"""
        service = get_product_name_extraction_service()

        test_blocks = [
            "PREMIUM BRAND",
            "Organic Bananas",
            "Fresh Quality"
        ]

        bounding_boxes = [
            {"x": 50, "y": 20, "width": 200, "height": 30},
            {"x": 60, "y": 60, "width": 180, "height": 25},
            {"x": 70, "y": 100, "width": 150, "height": 20}
        ]

        results = await service.extract_product_names_from_text_blocks(
            test_blocks, bounding_boxes, 'auto'
        )

        assert len(results) >= 1
        assert all(isinstance(r, ProductNameResult) for r in results)
        assert all(r.confidence > 0.0 for r in results)

    def test_configuration_manager_integration(self):
        """Test configuration manager integration"""
        config_manager = get_ocr_config_manager()

        # Test that configuration is properly initialized
        assert config_manager.current_profile is not None
        assert config_manager.region_preference is not None

        # Test configuration retrieval
        current_config = config_manager.get_current_config()
        assert 'image_processing' in current_config
        assert 'confidence_thresholds' in current_config
        assert 'performance' in current_config


# Performance benchmarks (optional, for CI/CD)
class TestPerformanceBenchmarks:
    """Performance benchmark tests"""

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_date_extraction_performance(self):
        """Benchmark date extraction performance"""
        service = get_date_extraction_service()

        # Simulate realistic text blocks
        text_blocks = [
            "Best Before: 25/12/2024",
            "Use by: 15 Jan 2025",
            "EXP 03/15/2025",
            "À consommer avant le 20/11/2024",
            "Mindestens haltbar bis 30.12.2024"
        ] * 10  # Repeat for more data

        import time
        start_time = time.time()

        results = await service.extract_dates_from_text_blocks(text_blocks, None, 'EU')

        processing_time = (time.time() - start_time) * 1000

        # Should process 50 blocks in under 100ms
        assert processing_time < 100
        assert len(results) >= 25  # Should find many dates

    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_barcode_detection_performance(self):
        """Benchmark barcode detection performance"""
        service = get_barcode_detection_service()

        # Simulate realistic barcode blocks
        text_blocks = [
            "4006381333931",
            "012345678905",
            "BARCODE: 4006381333931",
            "Product name here",
            "Some other text"
        ] * 10  # Repeat for more data

        import time
        start_time = time.time()

        results = await service.detect_barcodes_from_text_blocks(text_blocks, None, 'EU')

        processing_time = (time.time() - start_time) * 1000

        # Should process 50 blocks in under 150ms
        assert processing_time < 150
        assert len(results) >= 10  # Should find barcodes