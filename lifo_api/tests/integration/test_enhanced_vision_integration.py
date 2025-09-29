"""
Integration tests for enhanced vision service
Tests complete OCR workflow with realistic food packaging scenarios
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.services.enhanced_vision_service import (
    EnhancedVisionService,
    EnhancedVisionResult,
    get_enhanced_vision_service
)
from app.core.ocr_config import QualityProfile, RegionPreference


class TestEnhancedVisionServiceIntegration:
    """Integration tests for enhanced vision service"""

    @pytest.fixture
    def mock_vision_client(self):
        """Mock Google Vision API client"""
        with patch('app.services.enhanced_vision_service.vision.ImageAnnotatorClient') as mock_client_class:
            mock_client = Mock()
            mock_client_class.return_value = mock_client

            # Mock text annotations for a realistic food package
            mock_annotations = [
                # Full text annotation (first one)
                Mock(description="PREMIUM ORGANIC Best Before: 25/12/2024 BANANAS 4006381333931 500g"),

                # Individual text blocks
                Mock(
                    description="PREMIUM",
                    bounding_poly=Mock(vertices=[
                        Mock(x=50, y=20), Mock(x=250, y=20),
                        Mock(x=250, y=50), Mock(x=50, y=50)
                    ])
                ),
                Mock(
                    description="ORGANIC",
                    bounding_poly=Mock(vertices=[
                        Mock(x=60, y=60), Mock(x=240, y=60),
                        Mock(x=240, y=85), Mock(x=60, y=85)
                    ])
                ),
                Mock(
                    description="BANANAS",
                    bounding_poly=Mock(vertices=[
                        Mock(x=70, y=100), Mock(x=230, y=100),
                        Mock(x=230, y=130), Mock(x=70, y=130)
                    ])
                ),
                Mock(
                    description="Best",
                    bounding_poly=Mock(vertices=[
                        Mock(x=80, y=140), Mock(x=120, y=140),
                        Mock(x=120, y=160), Mock(x=80, y=160)
                    ])
                ),
                Mock(
                    description="Before:",
                    bounding_poly=Mock(vertices=[
                        Mock(x=125, y=140), Mock(x=185, y=140),
                        Mock(x=185, y=160), Mock(x=125, y=160)
                    ])
                ),
                Mock(
                    description="25/12/2024",
                    bounding_poly=Mock(vertices=[
                        Mock(x=190, y=140), Mock(x=280, y=140),
                        Mock(x=280, y=160), Mock(x=190, y=160)
                    ])
                ),
                Mock(
                    description="4006381333931",
                    bounding_poly=Mock(vertices=[
                        Mock(x=90, y=180), Mock(x=220, y=180),
                        Mock(x=220, y=200), Mock(x=90, y=200)
                    ])
                ),
                Mock(
                    description="500g",
                    bounding_poly=Mock(vertices=[
                        Mock(x=100, y=220), Mock(x=140, y=220),
                        Mock(x=140, y=235), Mock(x=100, y=235)
                    ])
                )
            ]

            mock_response = Mock()
            mock_response.text_annotations = mock_annotations
            mock_client.text_detection.return_value = mock_response

            yield mock_client

    @pytest.fixture
    def sample_food_package_image(self):
        """Sample image data representing a food package"""
        return b"fake_image_data_representing_organic_bananas_package"

    @pytest.fixture
    def enhanced_vision_service(self, mock_vision_client):
        """Enhanced vision service with mocked client"""
        service = EnhancedVisionService()
        service.client = mock_vision_client
        return service

    @pytest.mark.asyncio
    async def test_comprehensive_food_package_analysis(self, enhanced_vision_service, sample_food_package_image):
        """Test comprehensive analysis of a food package"""
        result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            extraction_types=['dates', 'barcodes', 'product_names'],
            quality_override='accuracy_high',
            region_override='EU'
        )

        # Verify result structure
        assert isinstance(result, EnhancedVisionResult)
        assert result.processing_time_ms > 0
        assert result.overall_confidence >= 0.0
        assert result.quality_profile_used == 'accuracy_high'

        # Verify OCR extraction
        assert len(result.raw_text_blocks) >= 6  # Should extract multiple text blocks
        assert "PREMIUM" in result.combined_text
        assert "BANANAS" in result.combined_text
        assert "25/12/2024" in result.combined_text
        assert "4006381333931" in result.combined_text

        # Verify date extraction
        assert len(result.dates) >= 1
        date_result = result.dates[0]
        assert date_result.date is not None
        assert date_result.date.day == 25
        assert date_result.date.month == 12
        assert date_result.date.year == 2024
        assert date_result.date_type in ['best_before', 'expiry']
        assert date_result.confidence > 0.5

        # Verify barcode detection
        assert len(result.barcodes) >= 1
        barcode_result = result.barcodes[0]
        assert barcode_result.value == "4006381333931"
        assert barcode_result.format == "EAN-13"
        assert barcode_result.checksum_valid is True
        assert barcode_result.confidence > 0.7

        # Verify product name extraction
        assert len(result.product_names) >= 1
        product_names = [pn.product_name.upper() for pn in result.product_names]
        assert any("BANANAS" in name for name in product_names)

        # Verify quality metrics
        assert 0.0 <= result.image_quality_score <= 1.0
        assert 0.0 <= result.overall_confidence <= 1.0

    @pytest.mark.asyncio
    async def test_selective_extraction_types(self, enhanced_vision_service, sample_food_package_image):
        """Test selective extraction of specific information types"""
        # Test dates only
        dates_only_result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            extraction_types=['dates']
        )

        assert len(dates_only_result.dates) >= 1
        assert len(dates_only_result.barcodes) == 0
        assert len(dates_only_result.product_names) == 0

        # Test barcodes only
        barcodes_only_result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            extraction_types=['barcodes']
        )

        assert len(barcodes_only_result.dates) == 0
        assert len(barcodes_only_result.barcodes) >= 1
        assert len(barcodes_only_result.product_names) == 0

    @pytest.mark.asyncio
    async def test_quality_profile_override(self, enhanced_vision_service, sample_food_package_image):
        """Test quality profile override functionality"""
        # Test mobile fast profile
        mobile_result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            quality_override='mobile_fast'
        )

        assert mobile_result.quality_profile_used == 'mobile_fast'
        assert mobile_result.processing_time_ms > 0

        # Test accuracy high profile
        accuracy_result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            quality_override='accuracy_high'
        )

        assert accuracy_result.quality_profile_used == 'accuracy_high'
        assert accuracy_result.processing_time_ms > 0

    @pytest.mark.asyncio
    async def test_region_preference_override(self, enhanced_vision_service, sample_food_package_image):
        """Test region preference override functionality"""
        # Test EU region preference
        eu_result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            region_override='EU'
        )

        # Should interpret date as DD/MM/YYYY (European format)
        if eu_result.dates:
            date_result = eu_result.dates[0]
            assert date_result.regulatory_format == 'EU'

        # Should prioritize EAN barcodes
        if eu_result.barcodes:
            ean_barcodes = [b for b in eu_result.barcodes if b.format.startswith('EAN')]
            assert len(ean_barcodes) >= 1

    @pytest.mark.asyncio
    async def test_caching_behavior(self, enhanced_vision_service, sample_food_package_image):
        """Test caching behavior for repeated requests"""
        # First request (should hit API)
        result1 = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            extraction_types=['dates', 'barcodes']
        )

        assert result1.cache_hit is False
        assert result1.processing_time_ms > 0

        # Second identical request (should hit cache)
        with patch('app.utils.local_cache.get_cached_ocr_result') as mock_cache_get:
            # Mock cache hit
            mock_cache_get.return_value = {
                'dates': [result1.dates[0].__dict__ if result1.dates else {}],
                'barcodes': [result1.barcodes[0].__dict__ if result1.barcodes else {}],
                'product_names': [],
                'raw_text_blocks': [block.__dict__ for block in result1.raw_text_blocks],
                'combined_text': result1.combined_text,
                'image_quality_score': result1.image_quality_score,
                'overall_confidence': result1.overall_confidence,
                'processing_time_ms': 5.0,  # Faster from cache
                'language_detected': result1.language_detected,
                'region_detected': result1.region_detected,
                'quality_profile_used': result1.quality_profile_used,
                'cache_hit': True
            }

            result2 = await enhanced_vision_service.process_image_comprehensive(
                sample_food_package_image,
                extraction_types=['dates', 'barcodes']
            )

            assert result2.cache_hit is True

    @pytest.mark.asyncio
    async def test_error_handling_vision_api_failure(self, enhanced_vision_service, sample_food_package_image):
        """Test error handling when Vision API fails"""
        # Mock Vision API failure
        enhanced_vision_service.client.text_detection.side_effect = Exception("API Error")

        result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image
        )

        # Should return empty result gracefully
        assert isinstance(result, EnhancedVisionResult)
        assert len(result.dates) == 0
        assert len(result.barcodes) == 0
        assert len(result.product_names) == 0
        assert result.overall_confidence == 0.0
        assert result.processing_time_ms > 0

    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self, enhanced_vision_service, sample_food_package_image):
        """Test circuit breaker integration"""
        with patch('app.utils.circuit_breaker.get_vision_api_breaker') as mock_breaker:
            from app.utils.circuit_breaker import CircuitBreakerError

            # Mock circuit breaker open state
            mock_breaker_instance = Mock()
            mock_breaker_instance.call.side_effect = CircuitBreakerError("Circuit breaker is open")
            mock_breaker.return_value = mock_breaker_instance

            enhanced_vision_service.circuit_breaker = mock_breaker_instance

            result = await enhanced_vision_service.process_image_comprehensive(
                sample_food_package_image
            )

            # Should handle circuit breaker gracefully
            assert isinstance(result, EnhancedVisionResult)
            assert result.overall_confidence == 0.0

    @pytest.mark.asyncio
    async def test_language_detection_integration(self, enhanced_vision_service):
        """Test language detection integration"""
        # Mock French food package
        with patch.object(enhanced_vision_service.client, 'text_detection') as mock_detection:
            french_annotations = [
                Mock(description="MARQUE PREMIUM À consommer avant le 25/12/2024 BANANES BIO"),
                Mock(description="MARQUE", bounding_poly=Mock(vertices=[Mock(x=0, y=0), Mock(x=100, y=0), Mock(x=100, y=30), Mock(x=0, y=30)])),
                Mock(description="PREMIUM", bounding_poly=Mock(vertices=[Mock(x=0, y=35), Mock(x=100, y=35), Mock(x=100, y=60), Mock(x=0, y=60)])),
                Mock(description="À", bounding_poly=Mock(vertices=[Mock(x=0, y=65), Mock(x=20, y=65), Mock(x=20, y=85), Mock(x=0, y=85)])),
                Mock(description="consommer", bounding_poly=Mock(vertices=[Mock(x=25, y=65), Mock(x=110, y=65), Mock(x=110, y=85), Mock(x=25, y=85)])),
                Mock(description="avant", bounding_poly=Mock(vertices=[Mock(x=115, y=65), Mock(x=160, y=65), Mock(x=160, y=85), Mock(x=115, y=85)])),
                Mock(description="le", bounding_poly=Mock(vertices=[Mock(x=165, y=65), Mock(x=180, y=65), Mock(x=180, y=85), Mock(x=165, y=85)])),
                Mock(description="25/12/2024", bounding_poly=Mock(vertices=[Mock(x=185, y=65), Mock(x=270, y=65), Mock(x=270, y=85), Mock(x=185, y=85)])),
            ]

            mock_response = Mock()
            mock_response.text_annotations = french_annotations
            mock_detection.return_value = mock_response

            result = await enhanced_vision_service.process_image_comprehensive(
                b"french_package_image",
                extraction_types=['dates']
            )

            # Should detect French language
            assert result.language_detected == 'french'

            # Should extract French date correctly
            if result.dates:
                assert result.dates[0].date_type == 'best_before'
                assert "consommer" in result.dates[0].raw_text.lower()

    @pytest.mark.asyncio
    async def test_concurrent_processing(self, enhanced_vision_service):
        """Test concurrent processing of multiple images"""
        import asyncio

        # Create multiple mock image requests
        images = [
            b"image1_data",
            b"image2_data",
            b"image3_data"
        ]

        # Process all images concurrently
        tasks = [
            enhanced_vision_service.process_image_comprehensive(
                image,
                extraction_types=['dates', 'barcodes']
            )
            for image in images
        ]

        results = await asyncio.gather(*tasks)

        # All requests should complete successfully
        assert len(results) == 3
        assert all(isinstance(r, EnhancedVisionResult) for r in results)
        assert all(r.processing_time_ms > 0 for r in results)

    @pytest.mark.asyncio
    async def test_performance_optimization(self, enhanced_vision_service, sample_food_package_image):
        """Test performance optimization features"""
        import time

        start_time = time.time()

        result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image,
            extraction_types=['dates', 'barcodes', 'product_names'],
            quality_override='mobile_fast'
        )

        total_time = (time.time() - start_time) * 1000

        # Mobile fast should complete quickly
        assert total_time < 500  # Under 500ms for mobile optimization
        assert result.processing_time_ms < 300  # Under 300ms processing time
        assert result.quality_profile_used == 'mobile_fast'

    @pytest.mark.asyncio
    async def test_quality_metrics_calculation(self, enhanced_vision_service, sample_food_package_image):
        """Test quality metrics calculation"""
        result = await enhanced_vision_service.process_image_comprehensive(
            sample_food_package_image
        )

        # Quality metrics should be calculated
        assert 0.0 <= result.image_quality_score <= 1.0
        assert 0.0 <= result.overall_confidence <= 1.0

        # Higher quality should correlate with more extractions
        if len(result.dates) > 0 or len(result.barcodes) > 0 or len(result.product_names) > 0:
            assert result.overall_confidence > 0.3

    @pytest.mark.asyncio
    async def test_real_world_multilingual_scenario(self, enhanced_vision_service):
        """Test real-world multilingual food packaging scenario"""
        # Mock a German organic food package
        with patch.object(enhanced_vision_service.client, 'text_detection') as mock_detection:
            german_annotations = [
                Mock(description="BIO PREMIUM Mindestens haltbar bis 30.12.2024 VOLLMILCH 4021851333931 1L"),
                Mock(description="BIO", bounding_poly=Mock(vertices=[Mock(x=50, y=20), Mock(x=100, y=20), Mock(x=100, y=40), Mock(x=50, y=40)])),
                Mock(description="PREMIUM", bounding_poly=Mock(vertices=[Mock(x=110, y=20), Mock(x=200, y=20), Mock(x=200, y=40), Mock(x=110, y=40)])),
                Mock(description="VOLLMILCH", bounding_poly=Mock(vertices=[Mock(x=60, y=50), Mock(x=180, y=50), Mock(x=180, y=80), Mock(x=60, y=80)])),
                Mock(description="Mindestens", bounding_poly=Mock(vertices=[Mock(x=30, y=90), Mock(x=120, y=90), Mock(x=120, y=110), Mock(x=30, y=110)])),
                Mock(description="haltbar", bounding_poly=Mock(vertices=[Mock(x=125, y=90), Mock(x=180, y=90), Mock(x=180, y=110), Mock(x=125, y=110)])),
                Mock(description="bis", bounding_poly=Mock(vertices=[Mock(x=185, y=90), Mock(x=210, y=90), Mock(x=210, y=110), Mock(x=185, y=110)])),
                Mock(description="30.12.2024", bounding_poly=Mock(vertices=[Mock(x=215, y=90), Mock(x=300, y=90), Mock(x=300, y=110), Mock(x=215, y=110)])),
                Mock(description="4021851333931", bounding_poly=Mock(vertices=[Mock(x=70, y=120), Mock(x=220, y=120), Mock(x=220, y=140), Mock(x=70, y=140)])),
                Mock(description="1L", bounding_poly=Mock(vertices=[Mock(x=100, y=150), Mock(x=130, y=150), Mock(x=130, y=170), Mock(x=100, y=170)])),
            ]

            mock_response = Mock()
            mock_response.text_annotations = german_annotations
            mock_detection.return_value = mock_response

            result = await enhanced_vision_service.process_image_comprehensive(
                b"german_organic_milk_package",
                extraction_types=['dates', 'barcodes', 'product_names'],
                region_override='EU'
            )

            # Verify comprehensive extraction
            assert result.language_detected == 'german'
            assert result.region_detected == 'EU'

            # Date extraction should work with German text
            assert len(result.dates) >= 1
            date_result = result.dates[0]
            assert date_result.date.day == 30
            assert date_result.date.month == 12
            assert date_result.date.year == 2024
            assert "haltbar" in date_result.raw_text.lower()

            # Barcode should be detected and validated
            assert len(result.barcodes) >= 1
            barcode_result = result.barcodes[0]
            assert barcode_result.value in ["4021851333931"]
            assert barcode_result.format == "EAN-13"

            # Product names should include brand and product
            assert len(result.product_names) >= 1
            product_texts = [pn.product_name.upper() for pn in result.product_names]
            assert any("VOLLMILCH" in text or "MILK" in text for text in product_texts)


class TestEnhancedVisionServiceSingleton:
    """Test singleton behavior of enhanced vision service"""

    def test_singleton_instance(self):
        """Test that service returns singleton instance"""
        service1 = get_enhanced_vision_service()
        service2 = get_enhanced_vision_service()

        assert service1 is service2
        assert id(service1) == id(service2)

    def test_service_initialization(self):
        """Test service is properly initialized"""
        service = get_enhanced_vision_service()

        assert service.config_manager is not None
        assert service.circuit_breaker is not None
        assert service.thread_pool is not None
        assert service.date_service is not None
        assert service.barcode_service is not None
        assert service.product_name_service is not None


# Stress tests for production readiness
class TestProductionReadiness:
    """Production readiness tests"""

    @pytest.mark.asyncio
    @pytest.mark.slow
    async def test_high_volume_processing(self, enhanced_vision_service):
        """Test processing high volume of images"""
        # Simulate processing 100 images rapidly
        images = [f"image_{i}_data".encode() for i in range(100)]

        import asyncio
        import time

        start_time = time.time()

        # Process in batches to avoid overwhelming
        batch_size = 10
        all_results = []

        for i in range(0, len(images), batch_size):
            batch = images[i:i + batch_size]
            tasks = [
                enhanced_vision_service.process_image_comprehensive(
                    image,
                    extraction_types=['dates', 'barcodes'],
                    quality_override='batch_optimized'
                )
                for image in batch
            ]

            batch_results = await asyncio.gather(*tasks)
            all_results.extend(batch_results)

        total_time = time.time() - start_time

        # Verify all processed successfully
        assert len(all_results) == 100
        assert all(isinstance(r, EnhancedVisionResult) for r in all_results)

        # Should maintain reasonable throughput
        avg_time_per_image = total_time / 100
        assert avg_time_per_image < 1.0  # Under 1 second per image on average

    @pytest.mark.asyncio
    async def test_memory_usage_stability(self, enhanced_vision_service):
        """Test memory usage remains stable under load"""
        import gc
        import psutil
        import os

        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss

        # Process many images to test for memory leaks
        for i in range(50):
            await enhanced_vision_service.process_image_comprehensive(
                f"test_image_{i}".encode(),
                extraction_types=['dates']
            )

            # Force garbage collection every 10 iterations
            if i % 10 == 0:
                gc.collect()

        final_memory = process.memory_info().rss
        memory_increase = (final_memory - initial_memory) / initial_memory

        # Memory increase should be reasonable (less than 50% for 50 images)
        assert memory_increase < 0.5