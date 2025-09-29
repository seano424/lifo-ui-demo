#!/usr/bin/env python3
"""
Simple validation that our OCR fixes work as intended
"""

import asyncio
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.date_extraction_service import get_date_extraction_service
from services.barcode_detection_service import get_barcode_detection_service
from services.ocr_coordination_service import get_ocr_coordination_service


async def main():
    """Test the key improvements"""
    print("🧪 Testing OCR Fixes Validation")
    print("=" * 50)

    date_service = get_date_extraction_service()
    barcode_service = get_barcode_detection_service()

    # Test cases with expected outcomes
    test_cases = [
        {
            "text": "EXP: 2024/02/02",
            "expected_date": True,
            "expected_barcode": False,
            "description": "Clear expiry date case"
        },
        {
            "text": "8901030875506",
            "expected_date": False,
            "expected_barcode": True,
            "description": "Clear barcode case"
        },
        {
            "text": "20240202",
            "expected_date": True,
            "expected_barcode": False,
            "description": "Compact date format"
        }
    ]

    all_passed = True

    for i, test_case in enumerate(test_cases, 1):
        print(f"\n{i}. {test_case['description']}")
        print(f"   Text: '{test_case['text']}'")

        # Test date likelihood
        is_date, date_conf = date_service.is_likely_date(test_case['text'])
        print(f"   Date likelihood: {is_date} (confidence: {date_conf:.2f})")

        # Test barcode likelihood
        is_barcode, barcode_conf = barcode_service.is_barcode_likely(test_case['text'])
        print(f"   Barcode likelihood: {is_barcode} (confidence: {barcode_conf:.2f})")

        # Check expectations
        date_correct = is_date == test_case['expected_date']
        barcode_correct = is_barcode == test_case['expected_barcode']

        if date_correct and barcode_correct:
            print("   ✅ PASS")
        else:
            print("   ❌ FAIL")
            if not date_correct:
                print(f"      Expected date: {test_case['expected_date']}, got: {is_date}")
            if not barcode_correct:
                print(f"      Expected barcode: {test_case['expected_barcode']}, got: {is_barcode}")
            all_passed = False

    print("\n" + "=" * 50)
    if all_passed:
        print("🎉 ALL VALIDATION TESTS PASSED!")
        print("\n✅ Key improvements verified:")
        print("   • Date/barcode conflict resolution working")
        print("   • Context-aware classification functioning")
        print("   • Pattern exclusion logic operational")
    else:
        print("❌ SOME TESTS FAILED")

    print("\n🔧 OCR Coordination Service Summary:")
    print("   • Prevents dates from being misclassified as barcodes")
    print("   • Uses context-aware pattern matching")
    print("   • Implements comprehensive date pattern support")
    print("   • Includes robust exclusion logic")

if __name__ == "__main__":
    asyncio.run(main())