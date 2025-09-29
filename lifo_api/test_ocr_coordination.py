#!/usr/bin/env python3
"""
Comprehensive test to validate OCR coordination fixes
Tests the resolution of date/barcode confusion issues
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.date_extraction_service import get_date_extraction_service
from app.services.barcode_detection_service import get_barcode_detection_service

async def test_coordination_fixes():
    """Test that date/barcode coordination fixes work correctly"""

    print("🧪 Testing OCR Coordination Fixes")
    print("=" * 60)

    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()

    # Test cases that were problematic before fixes
    test_cases = [
        {
            "name": "Clear Expiry Date Scenario",
            "description": "EXP date should be detected as DATE, not barcode",
            "text_blocks": [
                "PRO: 2025/04/02",
                "EXP: 2026/03/28(Y/M/D)",
                "gettyimages watermark"
            ],
            "expected_dates": 2,
            "expected_barcodes": 0
        },
        {
            "name": "Sell By Date Recognition",
            "description": "Sell by dates should be detected properly",
            "text_blocks": [
                "Fresh Milk",
                "Sell By: 03/15/2026",
                "Display Until: 03/14/2026",
                "Best quality guaranteed"
            ],
            "expected_dates": 2,
            "expected_barcodes": 0
        },
        {
            "name": "Mixed Date and Barcode",
            "description": "Should distinguish real barcode from dates",
            "text_blocks": [
                "Premium Coffee",
                "EXP: 12/31/2025",
                "8901030875506",  # Real barcode
                "Roasted: 01/15/2025"
            ],
            "expected_dates": 2,
            "expected_barcodes": 1
        },
        {
            "name": "Date-like Sequences Excluded",
            "description": "8-digit dates should not be barcodes",
            "text_blocks": [
                "Production batch info",
                "MFG: 20250402",  # 8-digit date
                "Best Before: 20260402",  # 8-digit date
                "Lot: A12345"
            ],
            "expected_dates": 2,
            "expected_barcodes": 0
        },
        {
            "name": "Legitimate Barcodes Still Work",
            "description": "Real barcodes should still be detected",
            "text_blocks": [
                "Product Information",
                "8076809513012",  # Valid EAN-13
                "078742032109",   # Valid UPC-A
                "Weight: 500g"
            ],
            "expected_dates": 0,
            "expected_barcodes": 2
        }
    ]

    total_passed = 0
    total_tests = len(test_cases)

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n📋 Test {i}: {test_case['name']}")
        print(f"   Description: {test_case['description']}")

        # Test date extraction
        date_results = await date_service.extract_dates_from_text_blocks(
            test_case['text_blocks'], preferred_region='EU'
        )

        # Test barcode detection
        barcode_results = await barcode_service.detect_barcodes_from_text_blocks(
            test_case['text_blocks'], region_preference='EU'
        )

        found_dates = len(date_results)
        found_barcodes = len(barcode_results)
        expected_dates = test_case['expected_dates']
        expected_barcodes = test_case['expected_barcodes']

        print(f"   📅 Dates: Found {found_dates}, Expected {expected_dates}")
        for result in date_results:
            print(f"      - {result.date} ({result.date_type}) from '{result.raw_text}'")

        print(f"   🔢 Barcodes: Found {found_barcodes}, Expected {expected_barcodes}")
        for result in barcode_results:
            print(f"      - {result.value} ({result.format}) from '{result.raw_text}' (conf: {result.confidence:.2f})")

        # Validate results
        dates_correct = found_dates == expected_dates
        barcodes_correct = found_barcodes == expected_barcodes
        test_passed = dates_correct and barcodes_correct

        status = "✅ PASS" if test_passed else "❌ FAIL"
        print(f"   Result: {status}")

        if not dates_correct:
            print(f"      ⚠️  Date count mismatch: expected {expected_dates}, got {found_dates}")
        if not barcodes_correct:
            print(f"      ⚠️  Barcode count mismatch: expected {expected_barcodes}, got {found_barcodes}")

        if test_passed:
            total_passed += 1

    # Summary
    print(f"\n" + "=" * 60)
    print(f"📊 COORDINATION TEST RESULTS")
    print(f"=" * 60)
    print(f"   Tests Passed: {total_passed}/{total_tests}")
    print(f"   Success Rate: {total_passed/total_tests:.1%}")

    if total_passed == total_tests:
        print(f"   🎉 ALL TESTS PASSED! Date/barcode coordination is working correctly.")
    else:
        print(f"   ❌ Some tests failed. Coordination logic needs further refinement.")

    # Additional coordination tests
    await test_service_coordination()

async def test_service_coordination():
    """Test the coordination between services"""
    print(f"\n🔄 Testing Service Coordination")
    print("-" * 40)

    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()

    # Test the is_likely_date method
    test_strings = [
        "EXP: 2024/02/02",
        "8901030875506",
        "Best By: 12/31/25",
        "20250402",
        "078742032109"
    ]

    print(f"🧪 Testing is_likely_date coordination:")
    for test_str in test_strings:
        is_date, date_conf = date_service.is_likely_date(test_str)
        is_barcode, barcode_conf = barcode_service.is_barcode_likely(test_str)

        print(f"   '{test_str}':")
        print(f"     Date: {is_date} (conf: {date_conf:.2f})")
        print(f"     Barcode: {is_barcode} (conf: {barcode_conf:.2f})")

        # They should be mutually exclusive for clear cases
        if is_date and is_barcode and date_conf > 0.7 and barcode_conf > 0.7:
            print(f"     ⚠️  Both services confident - potential conflict!")

async def test_clear_expiry_scenario():
    """Specific test for the user's clear_expiry_date scenario"""
    print(f"\n🎯 Testing Clear Expiry Date Scenario")
    print("-" * 40)

    # Simulate the exact scenario from clear_expiry_date.jpg
    text_blocks = [
        "PRO: 2021/02/02",
        "EXP: 2024/02/02(Y/M/D)",
        "gettyimages watermark text"
    ]

    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()

    print(f"📝 Input text blocks:")
    for i, block in enumerate(text_blocks, 1):
        print(f"   {i}. '{block}'")

    # Test current date range (use future dates for validation)
    future_blocks = [
        f"PRO: {(datetime.now() - timedelta(days=90)).strftime('%Y/%m/%d')}",
        f"EXP: {(datetime.now() + timedelta(days=180)).strftime('%Y/%m/%d')}(Y/M/D)",
        "gettyimages watermark text"
    ]

    print(f"\n📝 Testing with future dates (for validation):")
    for i, block in enumerate(future_blocks, 1):
        print(f"   {i}. '{block}'")

    date_results = await date_service.extract_dates_from_text_blocks(
        future_blocks, preferred_region='EU'
    )

    barcode_results = await barcode_service.detect_barcodes_from_text_blocks(
        future_blocks, region_preference='EU'
    )

    print(f"\n📊 Results:")
    print(f"   📅 Dates found: {len(date_results)}")
    for result in date_results:
        print(f"      - {result.date} ({result.date_type}) from '{result.raw_text}'")

    print(f"   🔢 Barcodes found: {len(barcode_results)}")
    for result in barcode_results:
        print(f"      - {result.value} ({result.format}) from '{result.raw_text}'")

    # Expected: 2 dates, 0 barcodes
    success = len(date_results) == 2 and len(barcode_results) == 0
    status = "✅ SUCCESS" if success else "❌ FAILED"
    print(f"\n   🎯 Clear Expiry Scenario: {status}")

    if success:
        print(f"      The clear_expiry_date image should now work correctly!")
    else:
        print(f"      The scenario still needs refinement.")

if __name__ == "__main__":
    asyncio.run(test_coordination_fixes())
    asyncio.run(test_clear_expiry_scenario())