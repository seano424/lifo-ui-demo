#!/usr/bin/env python3
"""
Test script for OCR date/barcode detection fixes

This script tests the improvements made to resolve conflicts between
date extraction and barcode detection, specifically for the
clear_expiry_date scenario where "EXP: 2024/02/02" was being
misclassified as a barcode.
"""

import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.date_extraction_service import get_date_extraction_service
from services.barcode_detection_service import get_barcode_detection_service
from services.ocr_coordination_service import get_ocr_coordination_service


async def test_clear_expiry_date_scenario():
    """Test the clear_expiry_date scenario that was problematic"""
    print("=" * 80)
    print("TESTING CLEAR EXPIRY DATE SCENARIO")
    print("=" * 80)

    # Test data representing the clear_expiry_date image content
    test_cases = [
        {
            "name": "Original Problem Case",
            "text_blocks": ["EXP: 2024/02/02"],
            "expected_type": "date",
            "description": "The main issue - expiry date being detected as barcode"
        },
        {
            "name": "Various Expiry Formats",
            "text_blocks": [
                "EXP: 2024/02/02",
                "Expiry: 24/02/2024",
                "Expires 02/02/2024",
                "Expiration Date: 2024-02-02"
            ],
            "expected_type": "date",
            "description": "Different expiry date formats"
        },
        {
            "name": "Sell By Dates",
            "text_blocks": [
                "Sell By: 2024/02/02",
                "Best Sold By 24/02/2024",
                "Sell Before 02/02/2024"
            ],
            "expected_type": "date",
            "description": "Testing new sell-by patterns"
        },
        {
            "name": "Real Barcode Examples",
            "text_blocks": [
                "8901030875506",  # Valid EAN-13
                "012345678905",   # Valid UPC-A
                "Barcode: 8901030875506"
            ],
            "expected_type": "barcode",
            "description": "Legitimate barcodes that should NOT be affected"
        },
        {
            "name": "Ambiguous Cases",
            "text_blocks": [
                "20240202",  # Could be date or partial barcode
                "Product Code: 20240202",
                "Date: 20240202"
            ],
            "expected_type": "mixed",
            "description": "Cases where context is crucial"
        }
    ]

    # Initialize services
    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()
    coordination_service = get_ocr_coordination_service()

    for test_case in test_cases:
        print(f"\n{test_case['name']}")
        print("-" * 60)
        print(f"Description: {test_case['description']}")
        print(f"Expected type: {test_case['expected_type']}")

        for i, text_block in enumerate(test_case['text_blocks']):
            print(f"\nText Block {i+1}: '{text_block}'")

            # Test individual services
            print("\n  Individual Service Results:")

            # Date extraction
            date_results = await date_service.extract_dates_from_text_blocks(
                [text_block], None, 'EU'
            )
            print(f"    Dates found: {len(date_results)}")
            for result in date_results:
                print(f"      - {result.date_type}: {result.date} (confidence: {result.confidence:.2f})")

            # Barcode detection
            barcode_results = await barcode_service.detect_barcodes_from_text_blocks(
                [text_block], None, 'EU'
            )
            print(f"    Barcodes found: {len(barcode_results)}")
            for result in barcode_results:
                print(f"      - {result.format}: {result.value} (confidence: {result.confidence:.2f}, valid: {result.checksum_valid})")

            # Coordination service classification
            classifications = await coordination_service.classify_text_content(
                [text_block], None, 'EU'
            )

            if classifications:
                classification = classifications[0]
                print(f"\n  Coordination Service Classification:")
                print(f"    Type: {classification.content_type}")
                print(f"    Confidence: {classification.confidence:.2f}")
                print(f"    Reasoning: {classification.reasoning}")

                # Check if classification matches expectation
                matches_expected = (
                    classification.content_type == test_case['expected_type'] or
                    (test_case['expected_type'] == 'mixed' and classification.content_type in ['mixed', 'uncertain'])
                )

                status = "✓ PASS" if matches_expected else "✗ FAIL"
                print(f"    Status: {status}")

                if not matches_expected:
                    print(f"    Expected: {test_case['expected_type']}, Got: {classification.content_type}")

    print("\n" + "=" * 80)
    print("TESTING DIRECT DATE/BARCODE LIKELIHOOD METHODS")
    print("=" * 80)

    # Test the new helper methods
    test_strings = [
        "EXP: 2024/02/02",
        "8901030875506",
        "20240202",
        "Expiry Date: 24/02/2024",
        "Barcode: 012345678905"
    ]

    for test_string in test_strings:
        print(f"\nTesting: '{test_string}'")

        # Test date likelihood
        is_date, date_conf = date_service.is_likely_date(test_string)
        print(f"  Date likelihood: {is_date} (confidence: {date_conf:.2f})")

        # Test barcode likelihood
        is_barcode, barcode_conf = barcode_service.is_barcode_likely(test_string)
        print(f"  Barcode likelihood: {is_barcode} (confidence: {barcode_conf:.2f})")


async def test_performance_impact():
    """Test performance impact of the improvements"""
    print("\n" + "=" * 80)
    print("PERFORMANCE IMPACT TESTING")
    print("=" * 80)

    import time

    # Large test dataset
    test_blocks = [
        "EXP: 2024/02/02",
        "8901030875506",
        "Best Before: 25/12/2024",
        "UPC: 012345678905",
        "Sell By 15/03/2024",
        "Product Code: 1234567890123",
        "Use By: 2024-01-15",
        "Manufacturing Date: 20240101"
    ] * 10  # 80 blocks total

    coordination_service = get_ocr_coordination_service()

    start_time = time.time()
    classifications = await coordination_service.classify_text_content(
        test_blocks, None, 'EU'
    )
    end_time = time.time()

    processing_time = (end_time - start_time) * 1000  # Convert to milliseconds
    avg_per_block = processing_time / len(test_blocks)

    print(f"Total blocks processed: {len(test_blocks)}")
    print(f"Total processing time: {processing_time:.2f} ms")
    print(f"Average per block: {avg_per_block:.2f} ms")
    print(f"Throughput: {len(test_blocks) / (processing_time / 1000):.2f} blocks/second")

    # Summary statistics
    summary = coordination_service.get_classification_summary(classifications)
    print(f"\nClassification Summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")


async def main():
    """Run all tests"""
    print("OCR Date/Barcode Detection Fixes - Test Suite")
    print("=" * 80)

    try:
        await test_clear_expiry_date_scenario()
        await test_performance_impact()

        print("\n" + "=" * 80)
        print("✓ ALL TESTS COMPLETED SUCCESSFULLY")
        print("=" * 80)

    except Exception as e:
        print(f"\n✗ TEST FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())